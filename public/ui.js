/* Marea de Verrath — interfaz, entrada, draft, santuario y bucle principal */
(function(){
  "use strict";
  var V = window.V = window.V || {};
  var G = V.game;
  var U = V.ui = {};

  var canvas = document.getElementById("game");
  var screenEl = document.getElementById("screen");
  var keys = Object.create(null), touch = {active:false,id:null,ox:0,oy:0,dx:0,dy:0}, padPrev = {};
  var bank = 0;
  V.meta = {};
  var stageKey = "distrito";
  var slots = [
    {joined:true,  hero:"cazador",   input:"kb1"},
    {joined:false, hero:"vicaria",   input:null},
    {joined:false, hero:"doctor",    input:null},
    {joined:false, hero:"bestia",    input:null}
  ];
  var draftQueue = [], draftOpts = [], draftIdx = 0, draftOwner = null;
  var navPrev = 0, confirmPrev = true, lastT = 0;

  function $(id){ return document.getElementById(id); }
  function show(id){ $(id).hidden = false; }
  function hide(id){ $(id).hidden = true; }
  function fmt(s){
    var m=Math.floor(s/60), r=Math.floor(s%60);
    return (m<10?"0":"")+m+":"+(r<10?"0":"")+r;
  }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }

  /* ---------------- persistencia ----------------
     Primero en el navegador, siempre. Si además hay nombre de cazador y el
     juego se sirve desde tu dominio, se empuja al servidor para que el
     progreso te siga a cualquier dispositivo. */
  var cazador = "", syncT = 0;
  function saveMeta(){
    try{ localStorage.setItem("verrath.v2", JSON.stringify({bank:bank, bless:V.meta})); }catch(e){}
    pushPerfil();
  }
  function pushPerfil(){
    if(!cazador || !V.net || !V.net.perfilDisponible()) return;
    clearTimeout(syncT);
    syncT = setTimeout(function(){
      V.net.guardarPerfil(cazador, {bank:bank, bless:V.meta}, function(j){
        if(j) hunterState("guardado como " + cazador);
      });
    }, 900);
  }
  function hunterState(t){
    var el = $("hunterState");
    if(el) el.textContent = t;
  }
  function pullPerfil(nombre){
    cazador = nombre;
    try{ localStorage.setItem("verrath.cazador", nombre); }catch(e){}
    if(!nombre){ hunterState("solo en este dispositivo"); return; }
    if(!V.net || !V.net.perfilDisponible()){
      hunterState("sin servidor: se guarda solo aquí");
      return;
    }
    hunterState("buscando…");
    V.net.cargarPerfil(nombre, function(j, err){
      if(err || !j){ hunterState("no se pudo leer; sigue en local"); return; }
      if(!j.nuevo){
        // se toma siempre lo mayor de cada cosa: nada se pierde
        bank = Math.max(bank, j.bank||0);
        var b = j.bless || {};
        for(var k in b) V.meta[k] = Math.max(V.meta[k]||0, b[k]||0);
        try{ localStorage.setItem("verrath.v2", JSON.stringify({bank:bank, bless:V.meta})); }catch(e){}
        renderShop(); U.sync();
      }
      hunterState("sincronizado como " + nombre);
      pushPerfil();
    });
  }
  U.setCazador = pullPerfil;
  function loadMeta(){
    try{
      var raw = localStorage.getItem("verrath.v2");
      if(raw){
        var o = JSON.parse(raw);
        if(o && typeof o.bank === "number"){ bank = o.bank; V.meta = o.bless || {}; }
      }
    }catch(e){ bank = 0; V.meta = {}; }
  }

  /* ---------------- entrada ---------------- */
  function pads(){ return navigator.getGamepads ? (navigator.getGamepads()||[]) : []; }
  function padOf(input){
    if(!input || input.indexOf("pad")!==0) return null;
    var gp = pads()[parseInt(input.slice(3),10)];
    return (gp && gp.connected) ? gp : null;
  }
  function dz(v){ return Math.abs(v)<.26 ? 0 : v; }

  U.readMove = function(p){
    var mx=0,my=0;
    if(p.input==="kb1"){
      if(keys.w||keys.W||keys.ArrowUp) my-=1;
      if(keys.s||keys.S||keys.ArrowDown) my+=1;
      if(keys.a||keys.A||keys.ArrowLeft) mx-=1;
      if(keys.d||keys.D||keys.ArrowRight) mx+=1;
      if(touch.active){ mx+=touch.dx; my+=touch.dy; }
    } else if(p.input==="kb2"){
      if(keys.i||keys.I) my-=1;
      if(keys.k||keys.K) my+=1;
      if(keys.j||keys.J) mx-=1;
      if(keys.l||keys.L) mx+=1;
    } else {
      var gp = padOf(p.input);
      if(gp){
        mx=dz(gp.axes[0]||0); my=dz(gp.axes[1]||0);
        var b=gp.buttons||[];
        if(b[12]&&b[12].pressed) my-=1;
        if(b[13]&&b[13].pressed) my+=1;
        if(b[14]&&b[14].pressed) mx-=1;
        if(b[15]&&b[15].pressed) mx+=1;
      }
    }
    return {mx:mx,my:my};
  };

  /* ---------------- HUD ---------------- */
  /* ---------------- HUD dentro de la pantalla ----------------
     Distribución del original: barra de experiencia arriba del todo,
     nivel a la izquierda, reloj en el centro, oro y bajas a la derecha, y
     debajo el inventario: fila de armas y fila de pasivos, con su nivel. */
  function localPlayer(ps){
    var i;
    if(V.net && V.net.online && V.net.me)
      for(i=0;i<ps.length;i++) if(ps[i].netPeer === V.net.me) return ps[i];
    for(i=0;i<ps.length;i++) if(ps[i].input) return ps[i];
    return ps[0];
  }
  U.localPlayer = localPlayer;

  function slotBox(ctx, x, y, S, on){
    ctx.fillStyle = "rgba(9,7,17,.78)";
    ctx.fillRect(x, y, S, S);
    ctx.strokeStyle = on ? "rgba(140,120,80,.85)" : "rgba(46,39,64,.85)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x+.5, y+.5, S-1, S-1);
  }
  function slotIcon(ctx, key, evo, x, y, S){
    var ic = V.iconCanvas ? V.iconCanvas(key, evo) : null;
    if(!ic) return;
    var pad = Math.max(2, Math.round(S*0.12));
    var box = S - pad*2;
    var k = Math.min(box/ic.width, box/ic.height);
    var dw = Math.max(1, Math.round(ic.width*k)), dh = Math.max(1, Math.round(ic.height*k));
    ctx.drawImage(ic, Math.round(x+(S-dw)/2), Math.round(y+(S-dh)/2), dw, dh);
  }
  function slotLevel(ctx, txt, x, y, S, dpr, color){
    ctx.font = "700 " + Math.round(10.5*dpr) + "px 'Barlow Semi Condensed',Arial,sans-serif";
    ctx.textAlign = "right";
    var tw = ctx.measureText(txt).width;
    ctx.fillStyle = "rgba(7,6,14,.9)";
    ctx.fillRect(x+S-tw-5, y+S-Math.round(11*dpr), tw+5, Math.round(11*dpr));
    ctx.fillStyle = color || "#E5B95C";
    ctx.fillText(txt, x+S-2, y+S-Math.round(2.6*dpr));
  }

  U.drawHud = function(ctx, w, h, info){
    if(G.state.demo || !info.players.length) return;
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    var me = localPlayer(info.players);
    var bh = 10*dpr;

    // barra de experiencia del jugador local, a lo ancho de la pantalla
    ctx.fillStyle="#0A0812"; ctx.fillRect(0,0,w,bh+3);
    ctx.fillStyle="#1C2D3A"; ctx.fillRect(0,0,w,bh);
    ctx.fillStyle="#46E0C8"; ctx.fillRect(0,0,Math.round(w*clamp(me.xp/me.next,0,1)),bh);

    ctx.font="700 "+Math.round(13*dpr)+"px 'Barlow Semi Condensed',Arial,sans-serif";
    ctx.textAlign="left"; ctx.fillStyle="#E4E7F0";
    ctx.fillText("NV "+me.lvl, 10*dpr, bh+18*dpr);

    ctx.textAlign="center";
    ctx.font="700 "+Math.round(25*dpr)+"px 'Barlow Semi Condensed',Arial,sans-serif";
    ctx.fillStyle = (V.RUN_LENGTH-info.runT) < 60 ? "#C2263A" : "#E4E7F0";
    ctx.fillText(fmt(info.runT), w/2, bh+27*dpr);

    ctx.textAlign="right";
    ctx.font="700 "+Math.round(13*dpr)+"px 'Barlow Semi Condensed',Arial,sans-serif";
    ctx.fillStyle="#E5B95C";
    ctx.fillText(info.runGold+" oro", w-10*dpr, bh+18*dpr);
    ctx.fillStyle="#A9B6D6";
    ctx.fillText(G.kills()+" bajas", w-10*dpr, bh+34*dpr);

    // inventario: seis huecos de armas arriba, seis de pasivos debajo
    var S = Math.round(28*dpr), gap = Math.round(3*dpr);
    var x0 = Math.round(8*dpr), y0 = bh + Math.round(26*dpr);
    var r, c, x, y;
    for(r=0;r<2;r++) for(c=0;c<6;c++){
      x = x0 + c*(S+gap); y = y0 + r*(S+gap);
      slotBox(ctx, x, y, S, false);
    }
    for(c=0;c<me.weapons.length && c<6;c++){
      var wp = me.weapons[c];
      x = x0 + c*(S+gap); y = y0;
      slotBox(ctx, x, y, S, !!wp.def.evo);
      slotIcon(ctx, wp.def.ico, wp.def.evo, x, y, S);
      slotLevel(ctx, wp.def.evo ? "EVO" : String(wp.lvl), x, y, S, dpr,
                wp.def.evo ? "#FFD36B" : (wp.lvl>=8 ? "#FFF4D6" : "#E5B95C"));
    }
    var pk = Object.keys(me.passives);
    for(c=0;c<pk.length && c<6;c++){
      var q = V.PASSIVES[pk[c]], lv = me.passives[pk[c]];
      x = x0 + c*(S+gap); y = y0 + S + gap;
      slotBox(ctx, x, y, S, lv >= q.max);
      slotIcon(ctx, q.ico, false, x, y, S);
      slotLevel(ctx, String(lv), x, y, S, dpr, lv>=q.max ? "#FFF4D6" : "#C9CEDC");
    }

    // efectos en curso: solo aparecen cuando están activos
    var badges = [];
    if(me.flame > 0) badges.push({t:"Llamas "+Math.ceil(me.flame)+"s", c:"#FF8A3C"});
    if(me.shield && me.shield.ch > 0) badges.push({t:"Escudo x"+me.shield.ch, c:"#5FBF6A"});
    var revs = (me.st.revival||0) + ((V.meta && V.meta.alma)?1:0) - me.revivesUsed;
    if(revs > 0) badges.push({t:"Revivir x"+revs, c:"#FFD36B"});
    if(badges.length){
      ctx.textAlign = "left";
      ctx.font = "700 " + Math.round(11*dpr) + "px 'Barlow Semi Condensed',Arial,sans-serif";
      var by = y0 + (S+gap)*2 + Math.round(12*dpr);
      for(var bi=0;bi<badges.length;bi++){
        ctx.fillStyle = "rgba(7,6,14,.75)";
        var bw = ctx.measureText(badges[bi].t).width + 10;
        ctx.fillRect(x0, by-Math.round(10*dpr), bw, Math.round(14*dpr));
        ctx.fillStyle = badges[bi].c;
        ctx.fillText(badges[bi].t, x0+5, by);
        by += Math.round(17*dpr);
      }
    }

    if(info.msgTime>0){
      ctx.globalAlpha=clamp(info.msgTime,0,1);
      ctx.font="700 "+Math.round(15*dpr)+"px 'Barlow Semi Condensed',Arial,sans-serif";
      ctx.textAlign="center";
      var tw=ctx.measureText(info.msg).width;
      ctx.fillStyle="rgba(7,6,14,.85)";
      ctx.fillRect(w/2-tw/2-14, h-50*dpr, tw+28, 25*dpr);
      ctx.fillStyle="#E5B95C";
      ctx.fillText(info.msg, w/2, h-33*dpr);
      ctx.globalAlpha=1;
    }
  };

  var partyEl = $("party");
  U.party = function(){
    partyEl.innerHTML = "";
    var ps = G.players;
    partyCount = ps.length;
    for(var i=0;i<ps.length;i++){
      var p=ps[i], h=V.HEROES[p.hero], kit="";
      for(var w=0;w<p.weapons.length;w++){
        var d=p.weapons[w].def;
        kit += '<i style="--k:'+d.color+'" title="'+d.name+'">'+
               V.iconHtml(d.ico, "icn sm", d.evo)+
               '<b>'+(d.evo?"★":p.weapons[w].lvl)+'</b></i>';
      }
      for(var k in p.passives){
        var q=V.PASSIVES[k];
        kit += '<i style="--k:'+q.color+';opacity:.8" title="'+q.name+'">'+
               V.iconHtml(q.ico, "icn sm")+'<b>'+p.passives[k]+'</b></i>';
      }
      var c=document.createElement("div");
      c.className="pcard"+(p.down?" down":"");
      c.id="pc-"+p.slot;
      c.style.setProperty("--c", h.color);
      c.innerHTML='<div class="row"><span class="nm">J'+(p.slot+1)+' · '+h.name+'</span>'+
        '<span class="st" data-st>NV '+p.lvl+'</span></div>'+
        '<div class="hpbar"><div class="hpfill" data-hp></div></div>'+
        '<div class="kit">'+kit+'</div>';
      partyEl.appendChild(c);
    }
    U.sync();
  };
  var partyCount = -1;
  U.sync = function(){
    var ps=G.players;
    if(ps.length !== partyCount){ partyCount = ps.length; U.party(); return; }
    for(var i=0;i<ps.length;i++){
      var p=ps[i], c=$("pc-"+p.slot);
      if(!c) continue;
      var frac=clamp(p.hp/p.maxhp,0,1);
      var f=c.querySelector("[data-hp]");
      f.style.width=(frac*100).toFixed(1)+"%";
      f.className="hpfill"+(frac<.25&&!p.down?" low":"");
      c.querySelector("[data-st]").textContent = p.down?"Caído":("NV "+p.lvl);
      c.className="pcard"+(p.down?" down":"");
    }
    $("hudTime").textContent = fmt(G.time());
    $("hudKills").textContent = G.kills();
    $("hudRunGold").textContent = G.runGold();
    $("hudBank").textContent = bank;
    $("hudCount").textContent = G.foes.length;
  };

  /* ---------------- draft ---------------- */
  var arcQueue = [];
  U.queueDraft = function(p){ draftQueue.push(p); };
  U.queueArcana = function(p){ arcQueue.push(p); };
  U.maybeOpenDraft = function(){
    if((arcQueue.length || draftQueue.length) && !G.state.drafting){ confirmPrev = true; openDraft(); }
  };
  function evoReady(p, rule){
    var a = G.ownedWeapon(p, rule.from);
    if(!a || a.lvl < 8 || a.def.evo) return false;
    if(rule.with){
      var b = G.ownedWeapon(p, rule.with);
      if(!b || b.lvl < 8) return false;
    }
    // algunas evoluciones piden dos objetos, y los dos al máximo
    if(rule.passives){
      for(var pi=0; pi<rule.passives.length; pi++){
        var pk2 = rule.passives[pi];
        if((p.passives[pk2]||0) < V.PASSIVES[pk2].max) return false;
      }
    }
    // el original exige el pasivo al máximo, no a un nivel intermedio
    if(rule.passive){
      var need = V.PASSIVES[rule.passive] ? V.PASSIVES[rule.passive].max : 5;
      if((p.passives[rule.passive]||0) < need) return false;
    }
    return !G.ownedWeapon(p, rule.to);
  }
  /* Draft del original: tres cartas, y una cuarta con probabilidad
     1 − 1/suerte. No se ofrecen objetos nuevos si ya tienes seis armas o
     seis pasivos, ni nada que esté al máximo. La suerte también inclina la
     balanza hacia lo que ya llevas, para poder subirlo. Las evoluciones no
     salen aquí: solo llegan por cofre. */
  function buildOptions(p){
    var luck = p.st.luck || 1;
    var owned = [], fresh = [], i;

    for(i=0;i<V.WEAPON_KEYS.length;i++){
      var k = V.WEAPON_KEYS[i], ow = G.ownedWeapon(p,k);
      if(p.banned && p.banned["w:"+k]) continue;
      if(ow){ if(ow.lvl < 8 && !ow.def.evo) owned.push({type:"weapon",key:k,lvl:ow.lvl+1}); }
      else if(p.weapons.length < (V.arc ? V.arc.weaponSlots(p) : 6)) fresh.push({type:"weapon",key:k,lvl:1});
    }
    var nPas = Object.keys(p.passives).length;
    for(i=0;i<V.PASSIVE_KEYS.length;i++){
      var pk = V.PASSIVE_KEYS[i], cur = p.passives[pk]||0;
      if(p.banned && p.banned["p:"+pk]) continue;
      if(cur >= V.PASSIVES[pk].max) continue;
      if(cur > 0) owned.push({type:"passive",key:pk,lvl:cur+1});
      else if(nPas < 6) fresh.push({type:"passive",key:pk,lvl:1});
    }
    shuffle(owned); shuffle(fresh);

    var n = 3 + ((Math.random() < 1 - 1/luck) ? 1 : 0);
    var pOwned = Math.min(0.85, 0.5*luck);
    var pool = [];
    while(pool.length < n && (owned.length || fresh.length)){
      var takeOwned = owned.length && (!fresh.length || Math.random() < pOwned);
      pool.push(takeOwned ? owned.shift() : fresh.shift());
    }
    // arsenal lleno y todo al máximo: oro o comida, como en el original
    if(!pool.length) pool = [{type:"gold"},{type:"heal"},{type:"gold"}];
    return pool;
  }
  function shuffle(a){
    for(var i=a.length-1;i>0;i--){ var j=ri(0,i), t=a[i]; a[i]=a[j]; a[j]=t; }
  }
  function openDraft(){
    if(!arcQueue.length && !draftQueue.length){ G.state.drafting=false; hide("draft"); lastT=performance.now(); return; }
    var esArcana = arcQueue.length > 0;
    var p = esArcana ? arcQueue[0] : draftQueue[0];
    draftOwner = p;
    draftIdx = 0;
    draftOpts = esArcana
      ? V.arc.offer(p).map(function(c){ return {type:"arcana", card:c}; })
      : buildOptions(p);
    G.state.drafting=true;
    // en línea: si la carta es de otro dispositivo, se la mandamos y esperamos
    if(V.net && V.net.online && V.net.isHost && p.netPeer && p.netPeer !== V.net.me){
      V.net.emitCtl({k:"draft", to:p.netPeer, opts:draftOpts.map(cardInfo)});
      $("draftWho").textContent = "Esperando";
      $("draftTitle").textContent = V.HEROES[p.hero].name + " está eligiendo";
      $("draftCards").innerHTML = "";
      $("draftHint").textContent = "La cacería se reanuda en cuanto elija.";
      show("draft");
      return;
    }
    $("draftWho").textContent = (G.players.length>1 ? "Jugador "+(p.slot+1)+" · " : "") + V.HEROES[p.hero].name;
    $("draftTitle").textContent = esArcana ? "Arcana" : ("Nivel "+p.lvl);
    renderDraft();
    show("draft");
  }
  function cardInfo(o){
    if(o.type==="remote") return o.info;
    if(o.type==="arcana")
      return {n:o.card.name, ico:"arcana", c:"#C08BEF", l:"Arcana "+o.card.r,
        gain:"Cambia las reglas", t:o.card.text, evo:true};
    if(o.type==="evo"){
      var d=V.EVOLVED[o.rule.to];
      var need = o.rule.with ? (V.WEAPONS[o.rule.from].name+" + "+V.WEAPONS[o.rule.with].name) : V.WEAPONS[o.rule.from].name;
      return {n:d.name, ico:d.ico, c:d.color, l:o.rule.with?"Unión":"Evolución",
        gain:"Sustituye a "+need, t:d.desc, evo:true};
    }
    if(o.type==="weapon"){
      var w=V.WEAPONS[o.key];
      return {n:w.name, ico:w.ico, c:w.color, l:o.lvl===1?"Arma nueva":"Nivel "+o.lvl,
        gain:o.lvl===1?"Se une a tu arsenal":(w.ups[o.lvl-2]?w.ups[o.lvl-2].text:"+ poder"), t:w.desc};
    }
    if(o.type==="passive"){
      var q=V.PASSIVES[o.key];
      return {n:q.name, ico:q.ico, c:q.color, l:o.lvl===1?"Pasivo nuevo":"Nivel "+o.lvl,
        gain:q.text, t:"Mejora a todas tus armas a la vez."};
    }
    if(o.type==="heal") return {n:"Festín", ico:"d_cura", c:"#C2263A", l:"Cura", gain:"+40% de vida", t:"Ya no queda nada que aprender."};
    return {n:"Bolsa de oro", ico:"d_oro", c:"#E5B95C", l:"Tesoro", gain:"+150 de oro", t:"Para el Santuario."};
  }
  function renderDraft(){
    var wrap=$("draftCards");
    wrap.innerHTML="";
    for(var i=0;i<draftOpts.length;i++){
      (function(idx){
        var info=cardInfo(draftOpts[idx]);
        var el=document.createElement("button");
        el.type="button";
        el.className="card"+(idx===draftIdx?" on":"")+(info.evo?" evo":"");
        el.style.setProperty("--c", info.c);
        el.innerHTML='<div class="ic">'+V.iconHtml(info.ico,"icn",info.evo)+'</div>'+
          '<div class="lvl">'+info.l+'</div>'+
          '<h3>'+info.n+'</h3><div class="gain">'+info.gain+'</div><div class="txt">'+info.t+'</div>';
        el.addEventListener("click", function(){ pick(idx); });
        wrap.appendChild(el);
      })(i);
    }
    renderDraftButtons();
    $("draftHint").textContent = banishArmed
      ? "Elige la carta que quieres desterrar: no volverá en toda la cacería"
      : (G.players.length>1
          ? "Elige con tu propio mando o teclado; el resto espera"
          : "← → para moverte · Espacio para elegir · o haz clic");
  }

  /* Relanzar, descartar y desterrar: los tres botones del original. Las
     cargas se compran en el Santuario y duran una cacería. */
  var banishArmed = false;
  function renderDraftButtons(){
    var box = $("draftBtns");
    if(!box) return;
    var p = draftOwner;
    box.innerHTML = "";
    if(!p || (V.net && V.net.online && p.netPeer && p.netPeer !== V.net.me)) return;
    if(draftOpts.length && draftOpts[0].type === "arcana") return;
    var defs = [
      {k:"rerolls",  t:"Relanzar",  on:function(){ draftOpts = buildOptions(p); draftIdx = 0; p.rerolls--; banishArmed=false; renderDraft(); }},
      {k:"skips",    t:"Descartar", on:function(){ p.skips--; banishArmed=false; applyPick(p, {type:"skip"}); }},
      {k:"banishes", t:"Desterrar", on:function(){ banishArmed = !banishArmed; renderDraft(); }}
    ];
    for(var i=0;i<defs.length;i++){
      (function(d){
        var n = p[d.k] || 0;
        var el = document.createElement("button");
        el.type = "button";
        el.className = "dbtn" + (d.k==="banishes" && banishArmed ? " armed" : "");
        el.disabled = n <= 0;
        el.textContent = d.t + " (" + n + ")";
        el.onclick = function(){ if((p[d.k]||0) > 0) d.on(); };
        box.appendChild(el);
      })(defs[i]);
    }
  }
  function banishOption(p, o){
    if(!o) return;
    if(o.type === "weapon") p.banned["w:"+o.key] = 1;
    else if(o.type === "passive") p.banned["p:"+o.key] = 1;
    else return;
    p.banishes--;
    banishArmed = false;
    draftOpts = buildOptions(p);
    draftIdx = 0;
    renderDraft();
  }
  function pick(idx){
    if(!G.state.drafting) return;
    if(banishArmed && draftOwner && (draftOwner.banishes||0) > 0){
      banishOption(draftOwner, draftOpts[idx]);
      return;
    }
    if(V.net && V.net.online && !V.net.isHost){
      // el invitado no aplica nada: se lo pide al anfitrión
      V.net.emitPick(idx);
      hide("draft");
      G.say("Elección enviada…");
      return;
    }
    applyPick(draftOwner, draftOpts[idx]);
  }
  function applyPick(p, o){
    if(!p || !o) return;
    if(o.type==="arcana"){
      V.arc.give(p, o.card.k);
      G.say("Arcana " + o.card.r + ": " + o.card.name);
      banishArmed = false;
      arcQueue.shift();
      U.party();
      if(arcQueue.length || draftQueue.length) openDraft();
      else { G.state.drafting=false; hide("draft"); lastT=performance.now(); }
      return;
    }
    if(o.type==="evo"){
      G.addWeapon(p, o.rule.to, o.rule.from, o.rule.with);
      G.say("¡"+V.EVOLVED[o.rule.to].name+"!");
      V.game.recalc(p);
    } else if(o.type==="weapon"){
      var w=G.ownedWeapon(p,o.key);
      if(w) w.lvl++; else G.addWeapon(p,o.key);
    } else if(o.type==="passive"){
      G.addPassive(p,o.key);
    } else if(o.type==="skip"){
      G.say("Carta descartada.");
    } else if(o.type==="heal"){
      p.hp=Math.min(p.maxhp,p.hp+30);
    } else G.addGold(150);
    banishArmed = false;
    draftQueue.shift();
    U.party();
    if(draftQueue.length) openDraft();
    else { G.state.drafting=false; hide("draft"); lastT=performance.now(); }
  }

  /* --- draft a través de la red --- */
  U.showRemoteDraft = function(opts){
    draftOpts = opts.map(function(o){ return {type:"remote", info:o}; });
    draftIdx = 0; draftOwner = null;
    G.state.drafting = true;
    $("draftWho").textContent = "Te toca";
    $("draftTitle").textContent = "Subes de nivel";
    renderDraft();
    show("draft");
  };
  U.hostApplyRemotePick = function(peer, i){
    if(!draftQueue.length) return;
    var p = draftQueue[0];
    if(!p || p.netPeer !== peer) return;
    applyPick(p, draftOpts[i] || draftOpts[0]);
  };
  function draftInput(){
    if(!G.state.drafting || !draftOwner) return;
    var p=draftOwner, nav=0, ok=false;
    if(p.input==="kb1"){
      if(keys.ArrowLeft||keys.a||keys.A) nav=-1;
      if(keys.ArrowRight||keys.d||keys.D) nav=1;
      ok=!!(keys[" "]||keys.Enter);
    } else if(p.input==="kb2"){
      if(keys.j||keys.J) nav=-1;
      if(keys.l||keys.L) nav=1;
      ok=!!(keys.u||keys.U||keys.i||keys.I);
    } else {
      var gp=padOf(p.input);
      if(gp){
        var ax=dz(gp.axes[0]||0), b=gp.buttons||[];
        if(ax<-.5||(b[14]&&b[14].pressed)) nav=-1;
        if(ax>.5||(b[15]&&b[15].pressed)) nav=1;
        ok=!!((b[0]&&b[0].pressed)||(b[7]&&b[7].pressed));
      }
    }
    if(nav && !navPrev){ draftIdx=clamp(draftIdx+nav,0,draftOpts.length-1); renderDraft(); }
    navPrev=nav;
    if(ok && !confirmPrev) pick(draftIdx);
    confirmPrev=ok;
  }

  /* Cofres, con las tiradas del original: primero cinco objetos, luego
     tres, luego uno; la suerte multiplica cada tirada. Las evoluciones
     solo salen de aquí y solo a partir del minuto diez; un cofre normal
     desata una, y el de cinco puede desatar dos. */
  U.chest = function(p){
    var luck = p.st.luck || 1, C = V.CHEST, tier;
    if(Math.random() < C.five.p*luck)       tier = C.five;
    else if(Math.random() < C.three.p*luck) tier = C.three;
    else                                    tier = C.one;
    if(V.arc && V.arc.chestMin(p) >= 3 && tier === C.one) tier = C.three;

    var gold = Math.round(ri(tier.gold[0], tier.gold[1]) * (p.st.greed||1));
    G.addGold(gold);

    var evos = 0, maxEvo = tier.n >= 5 ? 2 : 1, dicho = [], i, e;
    for(i=0;i<tier.n;i++){
      var hecho = false;
      if(evos < maxEvo && G.time() >= V.EVO_FROM){
        for(e=0;e<V.EVO_RULES.length;e++){
          var r = V.EVO_RULES[e];
          if(!evoReady(p,r)) continue;
          G.addWeapon(p, r.to, r.from, r.with);
          V.game.recalc(p);
          evos++; hecho = true;
          dicho.push("¡" + V.EVOLVED[r.to].name + "!");
          break;
        }
      }
      if(hecho) continue;

      var cand = [], w;
      for(e=0;e<p.weapons.length;e++){
        w = p.weapons[e];
        if(w.lvl < 8 && !w.def.evo) cand.push({w:w});
      }
      for(var k in p.passives)
        if(p.passives[k] < V.PASSIVES[k].max) cand.push({q:k});
      if(!cand.length){ G.addGold(Math.round(100*(p.st.greed||1))); continue; }

      var c = cand[ri(0,cand.length-1)];
      if(c.w){ c.w.lvl++; dicho.push({ico:c.w.def.ico, evo:c.w.def.evo, t:c.w.def.name+" nv "+c.w.lvl}); }
      else { G.addPassive(p, c.q); dicho.push({ico:V.PASSIVES[c.q].ico, t:V.PASSIVES[c.q].name+" nv "+p.passives[c.q]}); }
    }

    showChest(p, tier, gold, dicho);
    U.party();
  };

  /* El cofre se abre en pantalla, como en el original: se ve qué ha caído.
     En solitario pausa la cacería; en línea no, porque pararía a todos. */
  function showChest(p, tier, gold, loot){
    var solo = !(V.net && V.net.online);
    if(V.net && V.net.online && p.netPeer && p.netPeer !== V.net.me){
      G.say("Cofre para " + V.HEROES[p.hero].name);
      return;
    }
    var html = "";
    for(var i=0;i<loot.length;i++)
      html += '<i>' + V.iconHtml(loot[i].ico, "gi", loot[i].evo) + loot[i].t + '</i>';
    if(!html) html = '<i>Solo monedas</i>';
    $("chestTitle").textContent = tier.n === 5 ? "¡Cofre de cinco!"
      : (tier.n === 3 ? "Cofre de tres" : "Cofre");
    $("chestLoot").innerHTML = html;
    $("chestGold").textContent = "+" + gold + " de oro";
    show("chestcard");
    if(solo){ G.state.paused = true; }
    else {
      clearTimeout(chestTimer);
      chestTimer = setTimeout(closeChest, 4200);
    }
  }
  var chestTimer = 0;
  function closeChest(){
    clearTimeout(chestTimer);
    hide("chestcard");
    if(G.state.paused){ G.state.paused = false; lastT = performance.now(); }
  }
  U.closeChest = closeChest;

  /* ---------------- hoja de estado ----------------
     La misma que enseña el original al pausar: todas las estadísticas con
     su valor actual, y el inventario con los niveles. */
  function pct(v){ return Math.round(v*100) + "%"; }
  function statRows(p){
    var st = p.st, base = {might:1,area:1,speed:1,duration:1,cooldown:1,moveSpeed:1,
      magnet:1,luck:1,growth:1,greed:1,curse:1,amount:0,armor:0,recovery:0,revival:0};
    var rows = [
      ["Vida",           Math.round(p.hp)+" / "+Math.round(p.maxhp), p.maxhp>110],
      ["Daño",           pct(st.might),      st.might>base.might],
      ["Área",           pct(st.area),       st.area>base.area],
      ["Vel. proyectil", pct(st.speed),      st.speed>base.speed],
      ["Duración",       pct(st.duration),   st.duration>base.duration],
      ["Recarga",        pct(st.cooldown),   st.cooldown<base.cooldown],
      ["Proyectiles",    "+"+st.amount,      st.amount>0],
      ["Armadura",       String(st.armor),   st.armor>0],
      ["Regeneración",   (st.recovery||0).toFixed(2)+"/s", st.recovery>0],
      ["Velocidad",      pct(st.moveSpeed),  st.moveSpeed>base.moveSpeed],
      ["Imán",           pct(st.magnet),     st.magnet>base.magnet],
      ["Suerte",         pct(st.luck),       st.luck>base.luck],
      ["Experiencia",    pct(st.growth),     st.growth>base.growth],
      ["Oro",            pct(st.greed),      st.greed>base.greed],
      ["Maldición",      pct(st.curse),      st.curse>base.curse],
      ["Revividas",      String((st.revival||0)+((V.meta&&V.meta.alma)?1:0)-p.revivesUsed), true]
    ];
    var out = "";
    for(var i=0;i<rows.length;i++)
      out += '<div class="'+(rows[i][2]?"up":"")+'"><span>'+rows[i][0]+'</span><b>'+rows[i][1]+'</b></div>';
    return out;
  }
  function gearRows(p){
    var out = "", i;
    for(i=0;i<p.weapons.length;i++){
      var w = p.weapons[i];
      out += '<i class="'+(w.def.evo||w.lvl>=8?"max":"")+'">'+
        V.iconHtml(w.def.ico, "gi", w.def.evo)+w.def.name+
        ' <s>'+(w.def.evo?"evolucionada":"nv "+w.lvl)+'</s></i>';
    }
    for(var k in p.passives){
      var q = V.PASSIVES[k], lv = p.passives[k];
      out += '<i class="'+(lv>=q.max?"max":"")+'">'+
        V.iconHtml(q.ico, "gi")+q.name+' <s>nv '+lv+'</s></i>';
    }
    return out || '<i>Sin nada todavía</i>';
  }
  function arcRows(p){
    var l = V.arc ? V.arc.list(p) : [];
    if(!l.length) return "";
    var out = "";
    for(var i=0;i<l.length;i++)
      out += '<i class="max">'+V.iconHtml("arcana","gi",true)+l[i].name+' <s>'+l[i].r+'</s></i>';
    return '<div class="block"><div class="bt">Arcanas</div><div class="gear">'+out+'</div></div>';
  }
  function sheetHtml(p, extra){
    return (extra||"") + arcRows(p) +
      '<div class="block"><div class="bt">Arsenal</div><div class="gear">'+gearRows(p)+'</div></div>' +
      '<div class="block"><div class="bt">Estadísticas</div><div class="stats">'+statRows(p)+'</div></div>';
  }
  U.pauseSheet = function(){
    var box = $("pauseSheet");
    if(!box || !G.players.length) return;
    var p = localPlayer(G.players);
    var head = '<div class="block"><div class="bt">Cacería</div><div class="stats">'+
      '<div><span>Tiempo</span><b>'+fmt(G.time())+'</b></div>'+
      '<div><span>Nivel</span><b>'+p.lvl+'</b></div>'+
      '<div><span>Bajas</span><b>'+G.kills()+'</b></div>'+
      '<div><span>Oro</span><b>'+G.runGold()+'</b></div>'+
      '<div><span>Relanzar</span><b>'+(p.rerolls||0)+'</b></div>'+
      '<div><span>Descartar</span><b>'+(p.skips||0)+'</b></div>'+
      '<div><span>Desterrar</span><b>'+(p.banishes||0)+'</b></div>'+
      '<div><span>En pantalla</span><b>'+G.foes.length+'</b></div>'+
      '</div></div>';
    box.innerHTML = sheetHtml(p, head);
  };

  /* ---------------- fin de partida ---------------- */
  U.endRun = function(won, goldOverride){
    G.stopRun();
    if(V.net && V.net.online && V.net.isHost)
      V.net.emitCtl({k:"end", won:!!won, gold:G.runGold()});
    bank += (typeof goldOverride === "number") ? goldOverride : G.runGold();
    saveMeta();
    $("endEyebrow").textContent = won ? "30:00" : "Fin de la partida";
    $("endTitle").textContent = won
      ? "Habéis sobrevivido a la noche"
      : (G.players.length>1 ? "La marea os cubrió" : "La marea te cubrió");
    $("endText").textContent = won
      ? "La noche se retira en " + G.get().stage.name + "."
      : "La noche os ganó en " + G.get().stage.name + ".";
    if(G.players.length){
      var pe = localPlayer(G.players);
      var head = '<div class="block"><div class="bt">Resumen</div><div class="stats">'+
        '<div><span>Aguantado</span><b>'+fmt(G.time())+'</b></div>'+
        '<div><span>Nivel</span><b>'+pe.lvl+'</b></div>'+
        '<div><span>Bajas</span><b>'+G.kills()+'</b></div>'+
        '<div><span>Oro</span><b>'+G.runGold()+'</b></div>'+
        '<div><span>Arcas</span><b>'+bank+'</b></div>'+
        '</div></div>';
      $("endSheet").innerHTML = sheetHtml(pe, head);
    }
    show("endcard");
    U.sync();
    if(V.net) V.net.goOnline(false);
  };

  /* ---------------- santuario ---------------- */
  function renderShop(){
    var grid=$("shopGrid");
    grid.innerHTML="";
    for(var i=0;i<V.BLESSINGS.length;i++){
      (function(bi){
        var b=V.BLESSINGS[bi], lvl=V.meta[b.key]||0;
        var cost = lvl<b.max ? b.cost[lvl] : null;
        var el=document.createElement("button");
        el.type="button"; el.className="buy";
        el.disabled = (cost===null)||(bank<cost);
        var pips="";
        for(var q=0;q<b.max;q++) pips+='<i class="'+(q<lvl?"on":"")+'"></i>';
        el.innerHTML='<span class="bn">'+b.name+'</span><span class="bd">'+b.desc+'</span>'+
          '<div class="pips">'+pips+'</div>'+
          '<span class="bc">'+(cost===null?"Al máximo":cost+" de oro")+'</span>';
        el.addEventListener("click", function(){
          var c=b.cost[V.meta[b.key]||0];
          if(bank>=c){ bank-=c; V.meta[b.key]=(V.meta[b.key]||0)+1; saveMeta(); renderShop(); U.sync(); }
        });
        grid.appendChild(el);
      })(i);
    }
  }

  /* ---------------- lobby ---------------- */
  function inputLabel(inp){
    if(inp==="kb1") return "Teclado WASD";
    if(inp==="kb2") return "Teclado IJKL";
    if(inp && inp.indexOf("pad")===0) return "Mando "+(parseInt(inp.slice(3),10)+1);
    return "—";
  }
  function freeInput(){
    var used={};
    for(var i=0;i<4;i++) if(slots[i].joined && slots[i].input) used[slots[i].input]=true;
    var gps=pads();
    for(var g=0;g<gps.length&&g<4;g++)
      if(gps[g]&&gps[g].connected&&!used["pad"+g]) return "pad"+g;
    if(!used.kb1) return "kb1";
    if(!used.kb2) return "kb2";
    return null;
  }
  /* Diez héroes tienen retrato pintado; el resto usa su propio sprite.
     El retrato solo aparece donde hay sitio para verlo: a tamaño de
     partida no se leería, y ahí manda el pixel art. */
  function heroPortrait(key){
    if(V.RETRATOS && V.RETRATOS[key]) return "arte/retrato_" + key + ".webp";
    var c = V.sprite(V.HEROES[key].spr, 0);
    return c ? c.toDataURL() : "";
  }
  function renderStages(){
    var wrap=$("stages");
    wrap.innerHTML="";
    V.STAGE_KEYS.forEach(function(sk){
      var s=V.STAGES[sk];
      var el=document.createElement("button");
      el.type="button";
      el.className="stage"+(stageKey===sk?" on":"");
      el.style.setProperty("--c", s.accent);
      el.innerHTML='<span class="sn">'+s.name+'</span><span class="sd">'+s.blurb+'</span>';
      el.addEventListener("click", function(){
        stageKey=sk; G.setStage(sk); renderStages();
      });
      wrap.appendChild(el);
    });
  }
  function renderSlots(){
    var wrap=$("slots");
    wrap.innerHTML="";
    for(var i=0;i<4;i++){
      (function(idx){
        var s=slots[idx], h=V.HEROES[s.hero];
        var el=document.createElement("div");
        el.className="slot"+(s.joined?" on":"");
        el.style.setProperty("--c", h.color);
        var picks="";
        V.HERO_KEYS.forEach(function(hk){
          picks+='<button type="button" class="pick'+(s.hero===hk?" sel":"")+
            '" data-h="'+hk+'" style="--pc:'+V.HEROES[hk].color+'" title="'+V.HEROES[hk].name+'">'+
            V.heroIconHtml(hk, "icn")+'</button>';
        });
        el.innerHTML =
          '<div class="top"><span class="pn">Jugador '+(idx+1)+'</span>'+
          '<span class="dev">'+(s.joined?inputLabel(s.input):"libre")+'</span></div>'+
          '<div class="port"><img alt="" src="'+heroPortrait(s.hero)+'"></div>'+
          '<div class="picks">'+picks+'</div>'+
          '<div class="cname">'+h.name+'</div>'+
          '<div class="role">'+h.role+'</div>'+
          '<div class="start">Empieza con '+(V.WEAPONS[h.weapon].name)+' · '+h.note+'</div>'+
          '<button type="button" class="joinbtn">'+(s.joined?"Salir":"Unirse")+'</button>';
        el.querySelectorAll(".pick").forEach(function(b){
          b.addEventListener("click", function(){ slots[idx].hero=b.getAttribute("data-h"); renderSlots(); });
        });
        el.querySelector(".joinbtn").addEventListener("click", function(){
          if(slots[idx].joined){ slots[idx].joined=false; slots[idx].input=null; }
          else { var inp=freeInput(); if(!inp) return; slots[idx].joined=true; slots[idx].input=inp; }
          renderSlots();
        });
        wrap.appendChild(el);
      })(i);
    }
    $("startBtn").disabled = !slots.some(function(s){ return s.joined; });
  }

  function pollPads(){
    var gps=pads();
    for(var g=0;g<gps.length&&g<4;g++){
      var gp=gps[g];
      if(!gp||!gp.connected) continue;
      var pressed=false, b=gp.buttons||[];
      for(var i=0;i<b.length;i++) if(b[i]&&b[i].pressed){ pressed=true; break; }
      var key="pad"+g, was=padPrev[key];
      padPrev[key]=pressed;
      if(!pressed||was) continue;
      var taken=false;
      for(var j=0;j<4;j++) if(slots[j].joined && slots[j].input===key) taken=true;
      if(taken) continue;
      var free=-1;
      for(var k=0;k<4;k++) if(!slots[k].joined){ free=k; break; }
      if(free<0) continue;
      slots[free].joined=true; slots[free].input=key;
      if(G.state.running && !G.state.drafting){
        G.joinMid(free, slots[free]);
        U.party();
        G.say("¡"+V.HEROES[slots[free].hero].name+" se une!");
        U.maybeOpenDraft();
      } else renderSlots();
    }
  }

  /* ---------------- botones ---------------- */
  function startRun(){
    if(!slots.some(function(s){return s.joined;})) slots[0].joined=true;
    draftQueue=[]; G.state.drafting=false;
    hide("menu"); hide("endcard"); hide("shopcard"); hide("pausecard"); hide("draft"); hide("chestcard");
    G.startRun(slots, stageKey);
    U.party();
    lastT=performance.now();
  }
  $("startBtn").addEventListener("click", startRun);
  $("againBtn").addEventListener("click", startRun);
  $("lobbyBtn").addEventListener("click", function(){ hide("endcard"); renderSlots(); renderStages(); show("menu"); });
  $("shopBtn").addEventListener("click", function(){ hide("menu"); renderShop(); show("shopcard"); });
  $("toShopBtn").addEventListener("click", function(){ hide("endcard"); renderShop(); show("shopcard"); });
  $("shopBack").addEventListener("click", function(){ hide("shopcard"); renderSlots(); renderStages(); show("menu"); });
  $("wipeBtn").addEventListener("click", function(){ V.meta={}; saveMeta(); renderShop(); U.sync(); });
  $("resumeBtn").addEventListener("click", function(){ G.state.paused=false; hide("pausecard"); lastT=performance.now(); });
  $("chestBtn").addEventListener("click", closeChest);
  (function(){
    var inp = $("hunterName");
    if(!inp) return;
    try{ inp.value = localStorage.getItem("verrath.cazador") || ""; }catch(e){}
    if(inp.value) pullPerfil(inp.value.trim().toLowerCase());
    $("hunterSync").addEventListener("click", function(){
      var v = (inp.value||"").trim().toLowerCase();
      if(v && !/^[a-z0-9 _-]{2,24}$/.test(v)){
        hunterState("entre 2 y 24 letras o números");
        return;
      }
      pullPerfil(v);
    });
  })();

  window.addEventListener("keydown", function(ev){
    keys[ev.key]=true;
    if(ev.key===" "||ev.key.indexOf("Arrow")===0) ev.preventDefault();
    if((ev.key==="p"||ev.key==="P") && G.state.running && !G.state.drafting){
      G.state.paused=!G.state.paused;
      if(G.state.paused){ U.pauseSheet(); show("pausecard"); }
      else { hide("pausecard"); lastT=performance.now(); }
    }
  });
  window.addEventListener("keyup", function(ev){ keys[ev.key]=false; });
  window.addEventListener("blur", function(){ keys=Object.create(null); });

  var stickEl=$("stick"), nubEl=$("stickNub");
  screenEl.addEventListener("touchstart", function(ev){
    document.body.classList.add("touch");
    var t=ev.changedTouches[0], r=screenEl.getBoundingClientRect();
    touch.active=true; touch.id=t.identifier;
    touch.ox=t.clientX-r.left; touch.oy=t.clientY-r.top;
    stickEl.style.left=(touch.ox-59)+"px";
    stickEl.style.top=(touch.oy-59)+"px";
    nubEl.style.transform="translate(0,0)";
    ev.preventDefault();
  }, {passive:false});
  screenEl.addEventListener("touchmove", function(ev){
    for(var i=0;i<ev.changedTouches.length;i++){
      var t=ev.changedTouches[i];
      if(t.identifier!==touch.id) continue;
      var r=screenEl.getBoundingClientRect();
      var dx=(t.clientX-r.left)-touch.ox, dy=(t.clientY-r.top)-touch.oy;
      var len=Math.hypot(dx,dy), max=48;
      if(len>max){ dx=dx/len*max; dy=dy/len*max; }
      touch.dx=dx/max; touch.dy=dy/max;
      nubEl.style.transform="translate("+dx+"px,"+dy+"px)";
    }
    ev.preventDefault();
  }, {passive:false});
  function endTouch(ev){
    for(var i=0;i<ev.changedTouches.length;i++)
      if(ev.changedTouches[i].identifier===touch.id){
        touch.active=false; touch.dx=0; touch.dy=0; touch.id=null;
      }
  }
  screenEl.addEventListener("touchend", endTouch);
  screenEl.addEventListener("touchcancel", endTouch);
  window.addEventListener("gamepadconnected", function(){ if(!G.state.running) renderSlots(); });
  window.addEventListener("gamepaddisconnected", function(){ if(!G.state.running) renderSlots(); });
  window.addEventListener("resize", function(){ G.resize(); });

  /* ---------------- bucle ---------------- */
  function loop(now){
    requestAnimationFrame(loop);
    var dt=Math.min(.05,(now-lastT)/1000);
    lastT=now;
    if(V.net) V.net.tick();
    var guest = V.net && V.net.online && !V.net.isHost;
    if(G.state.drafting){
      draftInput();
      if(guest && G.state.running) G.guestUpdate(dt);
    }
    else if(G.state.running && !G.state.paused){
      if(guest) G.guestUpdate(dt); else G.update(dt);
    }
    else if(!G.state.running){ G.demoTick(dt); pollPads(); }
    if(G.state.running && !G.state.drafting) pollPads();
    G.render();
  }

  /* ================= sala en línea ================= */
  var inRoom = false;

  var BUILD = "v15";
  function renderRoom(){
    var box = $("room"), st = $("roomState"), list = $("roomPeers");
    if(!box) return;
    var stamp = $("buildStamp");
    var N = V.net;
    if(stamp) stamp.textContent = BUILD + " · " +
      (N && N.transport === "ws" ? "servidor propio" :
       (window.claude && window.claude.use ? "en Claude" : "sin conexión"));
    // con servidor propio la sala se identifica por código, no por cuenta
    var cbox = $("roomCode");
    if(cbox){
      cbox.hidden = !(N && N.transport === "ws");
      if(!cbox.hidden){
        var inp = $("codeInput");
        if(document.activeElement !== inp) inp.value = N.code || "";
        $("srvLabel").textContent = N.serverLabel();
      }
    }
    if(!N || !N.ready){ st.textContent = "Buscando la sala…"; return; }
    if(!N.available){
      var why = {
        not_granted: "Esta cuenta no tiene acceso a la sala. Hace falta <b>iniciar sesión en Claude</b> " +
                     "con una cuenta de la <b>misma organización</b> que el dueño de la página: los enlaces " +
                     "públicos y las cuentas de fuera no pueden conectarse.",
        revoked: "Se retiró el acceso a la sala mientras jugabas.",
        // dentro de Claude y aun así sin sala = la plataforma no admite a esta
        // cuenta; no distingue el motivo exacto, así que decimos los tres reales
        no_room: (window.claude && window.claude.use)
          ? "Claude no le da sala a esta vista. Las tres causas posibles son: " +
            "entraste por un <b>enlace público</b>, estás <b>sin sesión iniciada</b>, o tu cuenta " +
            "está <b>fuera de la organización</b> del dueño de la página. " +
            "Prueba a iniciar sesión y abrirlo desde tu lista de artifacts."
          : "Esta vista no ofrece salas: la página no corre dentro de Claude.",
        no_host: "Esta página no se está ejecutando dentro de Claude, así que no hay sala.",
        capability_disabled: "La sala está desactivada para esta página.",
        capability_removed: "La sala ya no está disponible en esta versión."
      }[N.lastError] || "No se pudo conectar con la sala ahora mismo.";
      st.innerHTML = why + ' <span style="color:var(--bone-dim)">Mientras tanto se juega en local, ' +
        'en esta misma pantalla, hasta con cuatro mandos.</span>' +
        (N.lastError ? ' <span style="opacity:.55">(' + N.lastError + ')</span>' : '');
      $("roomJoin").hidden = false;
      $("roomJoin").textContent = "Reintentar conexión";
      $("roomJoin").onclick = function(){ V.net.retry(); };
      $("onlineBtn").hidden = true;
      list.innerHTML = "";
      return;
    }
    $("roomJoin").onclick = toggleRoom;
    var others = N.peers.filter(function(p){ return !p.isMe; }).length;
    st.innerHTML = inRoom
      ? ('En la sala · <b>' + N.roster.length + '</b> preparad' + (N.roster.length===1?'o':'os') +
         ' · ' + (N.isHost ? 'eres el <b>anfitrión</b>' : 'anfitrión: otro jugador'))
      : ('Sala disponible · <b>' + (others+1) + '</b> viendo esta página');
    $("roomJoin").hidden = false;
    $("roomJoin").textContent = inRoom ? "Salir de la sala" : "Entrar a la sala";
    $("onlineBtn").hidden = !(inRoom && N.isHost && N.roster.length >= 1);

    list.innerHTML = "";
    N.peers.forEach(function(p){
      if(p.kind !== "viewer") return;
      var hero = (p.presence||{}).hero || "cazador";
      var ready = !!(p.presence||{}).play;
      var h = V.HEROES[hero] || V.HEROES.cazador;
      var el = document.createElement("div");
      el.className = "peer" + (ready ? " on" : "");
      el.style.setProperty("--c", h.color);
      el.innerHTML = '<img alt="" src="'+heroPortrait(hero)+'">' +
        '<span class="pnm">' + (p.isMe && p.sameTab ? "Tú" : "Jugador") +
        (p.peer === N.hostPeer ? ' · anfitrión' : '') + '</span>' +
        '<span class="phr">' + (ready ? h.name : "mirando") + '</span>';
      list.appendChild(el);
    });
    $("netRole").textContent = N.stats.role;
    $("netHz").textContent = N.stats.hz ? (N.stats.hz + " Hz") : "—";
    $("netKb").textContent = N.stats.bytes ? ((N.stats.bytes/1024).toFixed(1) + " KB") : "—";
  }
  U.renderRoom = renderRoom;

  function toggleRoom(){
    inRoom = !inRoom;
    V.net.goOnline(inRoom);
    V.net.setLobby(slots[0].hero, inRoom);
    renderRoom();
  }
  function startOnline(){
    var peers = V.net.playingPeers();
    if(!peers.length || !V.net.isHost) return;
    draftQueue=[]; G.state.drafting=false;
    hide("menu"); hide("endcard"); hide("shopcard"); hide("pausecard"); hide("draft"); hide("chestcard");
    V.net.emitCtl({k:"start", stage:stageKey});
    G.startOnlineHost(peers, stageKey);
    U.party();
    lastT=performance.now();
  }
  U.enterOnlineRun = function(){
    draftQueue=[]; G.state.drafting=false;
    hide("menu"); hide("endcard"); hide("shopcard"); hide("pausecard"); hide("draft"); hide("chestcard");
    lastT=performance.now();
    U.party();
  };

  U.boot = function(saved){
    loadMeta();
    if(saved && typeof saved.bank==="number" && saved.bank>bank){ bank=saved.bank; V.meta=saved.bless||V.meta; }
    G.init(canvas, screenEl);
    G.setStage(stageKey);
    renderSlots(); renderStages();
    U.sync();
    $("roomJoin").onclick = toggleRoom;      // renderRoom lo reasigna según el estado
    $("onlineBtn").addEventListener("click", startOnline);
    $("codeGo").addEventListener("click", function(){
      if(!V.net.setCode($("codeInput").value)) G.say("El código son 4 letras o números.");
    });
    $("codeNew").addEventListener("click", function(){ V.net.setCode(V.net.newCode()); });
    $("srvEdit").addEventListener("click", function(){
      var actual = V.net.serverLabel();
      var nuevo = prompt("Dirección del servidor de salas\n\n" +
        "Déjalo vacío para usar el mismo sitio que sirve el juego.", actual);
      if(nuevo === null) return;
      V.net.setServer(nuevo.trim());
      renderRoom();
    });
    $("codeCopy").addEventListener("click", function(){
      var u = V.net.shareUrl();
      try{
        navigator.clipboard.writeText(u);
        $("codeCopy").textContent = "¡Copiado!";
        setTimeout(function(){ $("codeCopy").textContent = "Copiar enlace"; }, 1600);
      }catch(e){ prompt("Copia este enlace:", u); }
    });
    if(V.net) V.net.init(renderRoom);
    renderRoom();
    lastT=performance.now();
    requestAnimationFrame(loop);
  };
  U.snapshot = function(){ return {bank:bank, bless:V.meta}; };
})();
