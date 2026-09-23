/* Marea de Verrath — motor: entidades, colisiones, oleadas y dibujado */
(function(){
  "use strict";
  var V = window.V = window.V || {};
  var G = V.game = {};

  var canvas, ctx, screenEl;
  var players = [], foes = [], bullets = [], areas = [], gems = [], drops = [], parts = [], floats = [];
  var runT = 0, kills = 0, runGold = 0;
  var stage = null, stageKey = "distrito";
  var cam = {x:0,y:0}, zoom = 1, baseZoom = 1, shake = 0;
  var msgText = "", msgTime = 0;
  var hashMap = new Map(), CELL = 60, scratch = [];

  G.state = {running:false, paused:false, drafting:false, demo:true};
  G.players = players; G.foes = foes;
  G.get = function(){ return {runT:runT, kills:kills, runGold:runGold, foes:foes.length, stage:stage}; };

  function rf(a,b){ return a+Math.random()*(b-a); }
  function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
  function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
  function hash2(x,y){
    var h = Math.imul(x|0, 0x27d4eb2d) ^ Math.imul(y|0, 0x165667b1);
    h = Math.imul(h ^ (h>>>15), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h>>>0) / 4294967296;
  }
  V.hash2 = hash2;

  var actx = null;
  function beep(f,d,t,v){
    try{
      if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
      var o=actx.createOscillator(), g=actx.createGain();
      o.type=t||"square"; o.frequency.value=f;
      g.gain.setValueAtTime(v||.04, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime+d);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime+d);
    }catch(e){}
  }
  function burst(x,y,c,n){
    if(parts.length>500) n=Math.min(n,3);
    for(var i=0;i<n;i++){
      var a=rf(0,6.283), s=rf(30,180);
      parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rf(.18,.45),c:c,s:rf(2,4)});
    }
  }
  function floatText(x,y,t,c){ if(floats.length>45) return; floats.push({x:x,y:y,t:t,c:c,life:.85}); }
  function say(t){ msgText=t; msgTime=3.4; }
  G.say = say;

  /* ---------------- rejilla espacial ---------------- */
  function rebuildHash(){
    hashMap.clear();
    for(var i=0;i<foes.length;i++){
      var f=foes[i];
      var k=(Math.floor(f.x/CELL)*73856093)^(Math.floor(f.y/CELL)*19349663);
      var b=hashMap.get(k);
      if(b) b.push(i); else hashMap.set(k,[i]);
    }
  }
  function queryNear(x,y,r,out){
    out.length=0;
    var x0=Math.floor((x-r)/CELL), x1=Math.floor((x+r)/CELL);
    var y0=Math.floor((y-r)/CELL), y1=Math.floor((y+r)/CELL);
    for(var cy=y0;cy<=y1;cy++) for(var cx=x0;cx<=x1;cx++){
      var b=hashMap.get((cx*73856093)^(cy*19349663));
      if(!b) continue;
      for(var i=0;i<b.length;i++) out.push(b[i]);
    }
    return out;
  }
  function view(){
    return {x:cam.x, y:cam.y, hw:canvas.width/(2*zoom), hh:canvas.height/(2*zoom)};
  }

  /* ---------------- estadísticas ---------------- */
  function baseStats(){
    return {might:1, area:1, speed:1, duration:1, amount:0, cooldown:1, armor:0,
      maxHealth:1, recovery:0, moveSpeed:1, magnet:1, luck:1, growth:1, greed:1,
      curse:1, revival:0};
  }
  function recalc(p){
    var h = V.HEROES[p.hero], st = baseStats(), k;
    for(k in h.mods) st[k] = (st[k]||1) * h.mods[k];
    for(k in p.passives){
      var def = V.PASSIVES[k], lv = p.passives[k];
      if(!def) continue;
      if(def.stats){                       // pasivo que toca varias estadísticas
        for(var sk in def.stats) st[sk] += def.stats[sk]*lv;
      } else if(def.stat) st[def.stat] += def.step*lv;
    }
    /* rasgo del héroe que crece con el nivel, como en el original:
       no es un bonus fijo, se hace más grande cada N niveles */
    if(h.grow) for(var gi=0; gi<h.grow.length; gi++){
      var gd = h.grow[gi], n = Math.floor((p.lvl||1)/gd.per);
      if(n <= 0) continue;
      if(gd.stat === "amount" || gd.stat === "armor" ||
         gd.stat === "revival" || gd.stat === "recovery") st[gd.stat] += gd.step*n;
      else st[gd.stat] *= 1 + gd.step*n;
    }

    var m = V.meta || {};
    st.maxHealth *= 1 + (m.vida||0)*0.12;
    st.might     *= 1 + (m.dano||0)*0.06;
    st.moveSpeed *= 1 + (m.paso||0)*0.04;
    st.magnet    *= 1 + (m.iman||0)*0.25;
    st.greed     *= 1 + (m.codicia||0)*0.15;
    st.luck      *= 1 + (m.suerte||0)*0.10;
    if(V.arc) V.arc.stats(p, st);
    /* topes del original: daño x10, área x10, velocidad x5, duración x5,
       recarga mínima al 10%, armadura 50, proyectiles extra 10 */
    st.might    = Math.min(st.might, 10);
    st.area     = Math.min(st.area, 10);
    st.speed    = Math.min(st.speed, 5);
    st.duration = Math.min(st.duration, 5);
    st.cooldown = Math.max(st.cooldown, 0.10);
    st.armor    = Math.min(st.armor, 50);
    st.amount   = Math.min(st.amount, 10);
    p.st = st;
    var ratio = p.maxhp ? p.hp/p.maxhp : 1;
    p.maxhp = h.hp * st.maxHealth;
    p.hp = Math.min(p.maxhp, p.maxhp*ratio);
    p.speed = h.speed * st.moveSpeed;
    p.magnet = 82 * st.magnet;
  }
  G.recalc = recalc;

  function weaponStats(p,w){
    var s={}, k, b=w.def.base;
    for(k in b) s[k]=b[k];
    if(w.def.ups) for(var i=0;i<w.lvl-1 && i<w.def.ups.length;i++){
      var up=w.def.ups[i];
      for(k in up){ if(k==="text") continue; s[k]=(s[k]||0)+up[k]; }
    }
    var st=p.st;
    s.dmg = (s.dmg||0)*st.might;
    s.area = (s.area||1)*st.area;
    s.duration = st.duration;
    if(s.speed !== undefined && w.def.persistent !== true) s.speed *= st.speed;
    s.cd = Math.max(.05, (s.cd||1)*st.cooldown);
    if(s.count !== undefined) s.count = Math.max(1, Math.round(s.count + st.amount));
    if(V.arc) V.arc.weapon(p, w, s, runT);
    if(s.count !== undefined) s.count = Math.max(1, Math.round(s.count));
    return s;
  }
  G.weaponStats = weaponStats;

  /* ---------------- API para las armas ---------------- */
  function shoot(o){
    var _bl = {
      x:o.x, y:o.y, vx:Math.cos(o.ang)*o.sp, vy:Math.sin(o.ang)*o.sp,
      sp:o.sp, ang:o.ang, dmg:o.dmg, pierce:o.pierce||1, life:o.life||2,
      r:o.r||6, spr:o.spr, owner:o.owner, behavior:o.behavior||"straight",
      rot:o.rot, spin:o.spin||0, rotA:o.ang, blast:o.blast||0, cool:o.cool||0,
      greedy:o.greedy, critChance:o.critChance, hit:null, t:0, home:o.owner,
      nid:(++nidSeq)&65535
    };
    if(V.arc && o.owner) V.arc.bullet(o.owner, _bl);
    bullets.push(_bl);
  }
  function area(o){
    o.max = o.life; o.t = 0; o.hitSet = null; o.acc = 0;
    /* Dos datos que, si faltan, no fallan a gritos sino en silencio:
       - sin ángulo, el giro inverso de la caja sale NaN y la zona no toca
         a nadie, porque toda comparación con NaN es falsa;
       - sin radio, el dibujo sale en NaN y no se ve nada.
       Cuatro zonas del juego —las plumas del Ala Fantasma, las llamas y dos
       de las arcanas— llevaban tiempo sin hacer ni mostrar nada por esto.
       Se rellenan aquí, al crearlas, para que no vuelva a pasar. */
    if(o.ang === undefined) o.ang = 0;
    if(o.r === undefined && o.w !== undefined) o.r = Math.max(o.w, o.h) * 0.5;
    areas.push(o);
    return o;
  }
  function hitCircle(x,y,r,dmg,owner,kx,ky,tag,cd,countKills){
    queryNear(x,y,r+20,scratch);
    var killed=0;
    for(var i=0;i<scratch.length;i++){
      var f=foes[scratch[i]];
      if(!f||f.dead) continue;
      if(tag){
        f.tags = f.tags||{};
        if(f.tags[tag] > 0) continue;
      }
      if(Math.hypot(f.x-x,f.y-y) > r+f.r) continue;
      if(tag) f.tags[tag] = cd||.3;
      var before = f.hp;
      damage(scratch[i], dmg, owner, kx, ky);
      if(before>0 && f.dead) killed++;
    }
    return countKills ? killed : 0;
  }
  function nearest(x,y,range,skip){
    // las luces no cuentan como objetivo de las armas que apuntan solas
    var best=null, bd=range*range;
    queryNear(x,y,range,scratch);
    for(var i=0;i<scratch.length;i++){
      var f=foes[scratch[i]];
      if(!f||f.dead||f.def.reaper||f.def.light||f===skip) continue;
      var d=(f.x-x)*(f.x-x)+(f.y-y)*(f.y-y);
      if(d<bd){ bd=d; best=f; }
    }
    return best;
  }
  function randomFoe(p, range){
    var v=view(), tries=0;
    while(tries++ < 12){
      var f = foes[ri(0, foes.length-1)];
      if(!f || f.dead || f.def.reaper || f.def.light) continue;
      if(Math.abs(f.x-v.x) < v.hw && Math.abs(f.y-v.y) < v.hh) return f;
    }
    return nearest(p.x, p.y, range||500);
  }
  function wipe(p, dmg, collect){
    var v=view();
    for(var i=0;i<foes.length;i++){
      var f=foes[i];
      if(f.dead||f.def.reaper) continue;
      if(Math.abs(f.x-v.x) < v.hw && Math.abs(f.y-v.y) < v.hh) damage(i, dmg, p, 0, 0);
    }
    if(collect){
      for(var g=0;g<gems.length;g++){ gems[g].x = p.x; gems[g].y = p.y; }
      for(var d=0;d<drops.length;d++){ drops[d].x = p.x; drops[d].y = p.y; }
    }
  }
  V.bindApi({
    shoot:shoot, area:area, hitCircle:hitCircle, nearest:nearest, randomFoe:randomFoe,
    wipe:wipe, burst:burst, beep:beep, rf:rf, ri:ri, view:view,
    shakeBy:function(n){ shake = Math.max(shake, n); }
  });

  /* ---------------- enemigos ---------------- */
  var nidSeq = 0;
  function isTrash(f){ var d=f.def; return !d.light && !d.elite && !d.reaper; }
  function trashCount(){
    var n=0;
    for(var i=0;i<foes.length;i++) if(!foes[i].dead && isTrash(foes[i])) n++;
    return n;
  }
  function lightCount(){
    var n=0;
    for(var i=0;i<foes.length;i++) if(!foes[i].dead && foes[i].def.light) n++;
    return n;
  }
  /* mul es la fuerza del escalón de ese minuto; como en el original, un
     enemigo no se hace más fuerte con el reloj: lo que cambia es qué
     enemigo sale. La maldición sí multiplica vida y velocidad. */
  function spawnFoe(type,x,y,mul){
    var def = V.FOES[type];
    if(!def) return null;
    var boss = def.elite || def.reaper;
    if(!boss && !def.light && trashCount() >= V.FOE_CAP) return null;
    if(foes.length > 1200 && !boss) return null;
    var st = players.length ? players[0].st : null;
    var curse = st ? (st.curse||1) : 1;
    var m = (mul || 1) * (def.reaper ? 1 : curse);
    var spd = (stage && stage.mods ? stage.mods.speed : 1) || 1;
    var hp = def.hp * (def.reaper ? 1 : m);
    var f = {x:x,y:y,type:type,def:def,r:def.r,
      hp:hp, maxhp:hp,
      speed:def.speed * (def.reaper ? 1 : spd*Math.min(curse,2)),
      /* El multiplicador del minuto sube la vida del enemigo a saco, pero su
         daño solo un tercio de eso. Antes escalaba igual que la vida: en el
         minuto 29 una gárgola pegaba 144 y te mataba de dos toques tuvieras
         el héroe que tuvieras, así que el final de partida no lo decidía tu
         partida sino el reloj. */
      dmg:def.dmg * (def.reaper ? 1 : 1 + ((mul||1)-1)*0.32),
      hit:0, kx:0, ky:0, freeze:0, slow:0, dead:false, tags:null,
      fuera:0, paciencia:RECICLA + Math.random()*2.0,
      frame:ri(0,3), wob:rf(0,6.283), nid:(++nidSeq)&65535};
    foes.push(f);
    return f;
  }
  function damage(idx, dmg, owner, kx, ky, critChance){
    var f = foes[idx];
    if(!f || f.dead || f.def.reaper) return;
    var isCrit = false;
    if(owner && V.arc) dmg = V.arc.damage(owner, dmg);
    if(critChance && owner && Math.random() < critChance*(owner.st.luck||1)){
      dmg *= V.arc ? V.arc.critMul(owner) : 2;
      isCrit = true;
    }
    f.hp -= dmg; f.hit = .1;
    if(kx||ky){ var m = f.def.elite?0.12:1; f.kx += kx*m; f.ky += ky*m; }
    if((f.def.elite || isCrit) && Math.random()<0.4) floatText(f.x, f.y-f.r-6, Math.round(dmg), isCrit?"#FFE066":"#FFFFFF");
    if(f.hp <= 0) kill(idx, owner);
  }
  function kill(idx, owner){
    var f = foes[idx];
    if(f.dead) return;
    f.dead = true;
    var st = owner ? owner.st : {greed:1, luck:1, curse:1};
    var luckR = (V.arc && owner) ? V.arc.luck(owner, st.luck||1) : (st.luck||1);

    if(f.def.light){                       // una luz rota: monedas o un poder
      burst(f.x, f.y, "#FFD36B", 14);
      beep(880,.08,"square",.03);
      if(Math.random() < 0.40*luckR) drops.push({x:f.x,y:f.y,kind:pickPower(),v:1});
      else {
        var r = Math.random()*(st.luck||1);
        var coin = r>0.96 ? 100 : (r>0.70 ? 10 : 1);
        drops.push({x:f.x,y:f.y,kind:"oro",v:Math.round(coin*(st.greed||1))});
      }
      return;
    }

    kills++;
    if(owner) owner.kills++;
    if(f.freeze > 0 && owner && V.arc && V.arc.has(owner,"limites"))
      arcApi.ring(f.x, f.y, 84, 70*(owner.st.might||1), owner);
    burst(f.x, f.y, f.def.elite ? "#C2263A" : (stage ? stage.accent : "#8E1F2F"), f.def.elite?46:5);
    if(f.def.xp > 0) dropGem(f.x, f.y, f.def.xp);
    if(Math.random() < f.def.gold*(st.luck||1))
      drops.push({x:f.x,y:f.y,kind:"oro",v:Math.round(rf(3,10)*(st.greed||1))});
    if(Math.random() < 0.010*(st.luck||1)) drops.push({x:f.x,y:f.y,kind:"carne",v:1});
    if(f.def.elite){
      drops.push({x:f.x,y:f.y,kind:"cofre",v:1});
      shake = 9; say("El jefe ha caído. Ha soltado un cofre.");
      beep(170,.45,"sawtooth",.06);
    }
  }
  /* Tope de gemas en el suelo: por encima del límite, la experiencia ya no
     crea gemas nuevas, se acumula en una sola gema roja. */
  var overflowGem = null;
  function dropGem(x,y,v){
    if(gems.length >= V.GEM_CAP){
      if(overflowGem && gems.indexOf(overflowGem) >= 0){ overflowGem.v += v; return; }
      overflowGem = {x:x,y:y,v:v,t:rf(0,6.28)};
      gems.push(overflowGem);
      return;
    }
    gems.push({x:x,y:y,v:v,t:rf(0,6.28)});
  }
  function pickPower(){
    var tot=0, i;
    for(i=0;i<V.POWERUPS.length;i++) tot += V.POWERUPS[i].w;
    var r = Math.random()*tot;
    for(i=0;i<V.POWERUPS.length;i++){ r -= V.POWERUPS[i].w; if(r<=0) return V.POWERUPS[i].kind; }
    return "carne";
  }
  G.spawnFoe = spawnFoe;

  /* ---------------- jugadores ---------------- */
  function makePlayer(slotIdx, slot, at){
    var h = V.HEROES[slot.hero];
    var p = {
      slot:slotIdx, hero:slot.hero, input:slot.input, color:h.color, spr:h.spr,
      x:at.x+rf(-30,30), y:at.y+rf(-30,30), r:11,
      hp:1, maxhp:1, xp:0, lvl:1, next:5, kills:0,
      weapons:[], passives:{}, st:baseStats(),
      aimx:1, aimy:0, walk:0, face:1, hurt:0, iframe:0, down:false, reviveProg:0,
      revivesUsed:0, regenAcc:0, shield:null,
      // cargas del santuario, como los "power-up" del original
      rerolls:(V.meta&&V.meta.reroll)||0,
      skips:(V.meta&&V.meta.skip)||0,
      banishes:(V.meta&&V.meta.banish)||0,
      banned:{}, arcana:{}, startWeapon:h.weapon, moving:false
    };
    recalc(p);
    p.hp = p.maxhp;
    addWeapon(p, h.weapon);
    players.push(p);
    return p;
  }
  function addWeapon(p, key, replace, second){
    var def = V.WEAPONS[key] || V.EVOLVED[key];
    if(replace){
      for(var i=0;i<p.weapons.length;i++){
        if(p.weapons[i].key === replace){
          p.weapons[i] = {key:key, lvl:1, t:0, def:def};
          // la unión consume también la segunda arma
          if(second) for(var j=p.weapons.length-1;j>=0;j--)
            if(p.weapons[j].key === second) p.weapons.splice(j,1);
          return p.weapons[i];
        }
      }
    }
    var w = {key:key, lvl:1, t:0, def:def};
    p.weapons.push(w);
    return w;
  }
  function addPassive(p, key){
    p.passives[key] = (p.passives[key]||0)+1;
    recalc(p);
  }
  G.makePlayer = makePlayer;
  G.addWeapon = addWeapon;
  G.addPassive = addPassive;
  G.ownedWeapon = function(p,key){
    for(var i=0;i<p.weapons.length;i++) if(p.weapons[i].key===key) return p.weapons[i];
    return null;
  };

  function alive(){ var o=[]; for(var i=0;i<players.length;i++) if(!players[i].down) o.push(players[i]); return o; }
  G.alive = alive;
  function nearestPlayer(x,y){
    var bp=null, bd=1e9;
    for(var i=0;i<players.length;i++){
      var p=players[i]; if(p.down) continue;
      var d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);
      if(d<bd){ bd=d; bp=p; }
    }
    return bp;
  }

  /* Toda curación pasa por aquí: así la Zarabanda puede doblarla y hacer
     que cada punto recuperado hiera a lo que tengas cerca. */
  function healPlayer(p, amount){
    if(amount <= 0) return 0;
    if(V.arc) amount = V.arc.heal(p, amount, function(n){
      hitCircle(p.x, p.y, 110*(p.st.area||1), n, p, 0, 0, "zarabanda", .4, true);
    });
    p.hp = Math.min(p.maxhp, p.hp + amount);
    return amount;
  }
  G.healPlayer = healPlayer;

  function hurtPlayer(p, dmg){
    if(p.down || p.iframe>0 || !G.state.running) return;
    if(p.shield && p.shield.ch > 0){
      if(p.shield.def.shroud){ dmg = Math.min(dmg, 10); }
      else { p.shield.ch--; p.iframe=.5; burst(p.x,p.y,"#5FBF6A",16); beep(300,.12,"sine",.04); return; }
    }
    dmg = Math.max(1, dmg - (p.st.armor||0));
    p.hp -= dmg; p.hurt = .2; p.iframe = .38;
    if(V.arc) V.arc.hurt(p, dmg, arcApi);
    shake = Math.max(shake, Math.min(7, dmg*.28));
    beep(170,.06,"square",.04);
    if(p.hp <= 0) down(p);
  }
  function down(p){
    p.hp = 0;
    var revives = (p.st.revival||0) + ((V.meta && V.meta.alma) ? 1 : 0);
    if(p.revivesUsed < revives){
      p.revivesUsed++;
      if(V.arc && V.arc.has(p,"despertar")){ p.arcAwake = (p.arcAwake||0)+1; recalc(p); }
      p.hp = p.maxhp*.6; p.iframe = 2.4;
      burst(p.x,p.y,"#FFFFFF",50);
      say(V.HEROES[p.hero].name + " se levanta.");
      beep(700,.35,"triangle",.07);
      return;
    }
    p.down = true; p.reviveProg = 0;
    burst(p.x,p.y,p.color,34);
    say(V.HEROES[p.hero].name + " ha caído.");
    if(V.ui) V.ui.party();
    if(!alive().length && V.ui) V.ui.endRun(false);
  }
  G.hurtPlayer = hurtPlayer;

  /* ---------------- oleadas ---------------- */
  function ringPoint(dist){
    var a = rf(0,6.283);
    var ref = alive()[0] || cam;
    var d = dist || (Math.max(canvas.width,canvas.height)/zoom)*.62;
    return {x:ref.x+Math.cos(a)*d, y:ref.y+Math.sin(a)*d};
  }
  /* Lo que las arcanas necesitan del motor, en un solo sitio. */
  function arcBlast(bl){
    var o = bl.owner;
    var curse = (o && o.st ? (o.st.curse||1) : 1);
    area({x:bl.x, y:bl.y, w:88, h:88, kind:"pool", life:.26, color:"#C08BEF",
      dmg:26*curse*((o&&o.st?o.st.might:1)||1), owner:o, once:true});
  }
  var arcApi = {
    rf: rf,
    area: function(x,y,r,dmg,color,owner){
      area({x:x, y:y, w:r, h:r, kind:"pool", life:.3, color:color||"#FF8A3C",
        dmg:dmg, owner:owner||null, once:false});
      hitCircle(x, y, r*0.5, dmg, owner||null, 0, 0, "arcfuego", .5, true);
    },
    ring: function(x,y,r,dmg,owner){ hitCircle(x, y, r, dmg, owner||null, 0, 0, "arcring", .35, true); },
    drop: function(x,y){
      var k = Math.random() < .6 ? "oro" : pickPower();
      drops.push({x:x, y:y, kind:k, v:k==="oro"?Math.round(rf(4,14)):1});
    },
    heal: function(p,n){ healPlayer(p, n); },
    gather: function(p){
      for(var i=0;i<drops.length;i++){ drops[i].x = p.x; drops[i].y = p.y; }
      for(var g=0;g<gems.length;g++){ gems[g].x = p.x; gems[g].y = p.y; }
      for(var f=0;f<foes.length;f++) if(foes[f].def.light){ foes[f].x = p.x+rf(-40,40); foes[f].y = p.y+rf(-40,40); }
      say("El surco lo arrastra todo.");
    }
  };

  /* ---------------- objetos del suelo ----------------
     Los mismos que en el original: rosario, llamas, reloj de arena,
     llamada del vacío, festín y monedas. */
  function takeDrop(p, dr){
    var k = dr.kind;
    if(k === "oro"){ runGold += dr.v; floatText(dr.x,dr.y,"+"+dr.v,"#E5B95C"); return; }
    if(k === "carne"){
      var got = healPlayer(p, 30);
      floatText(dr.x,dr.y,"+"+Math.round(got),"#C2263A"); beep(600,.12,"triangle",.05); return;
    }
    if(k === "cofre"){ if(V.ui) V.ui.chest(p); return; }
    if(k === "rosario"){
      wipe(p, 99999, false);
      say("El rosario limpia la calle."); shake = 12;
      beep(140,.6,"sine",.07); return;
    }
    if(k === "reloj"){
      for(var i=0;i<foes.length;i++) if(!foes[i].def.reaper) foes[i].freeze = Math.max(foes[i].freeze, 10);
      say("El tiempo se detiene."); beep(320,.5,"sine",.05); return;
    }
    if(k === "vacio"){
      for(var g=0;g<gems.length;g++){ gems[g].x = p.x; gems[g].y = p.y; }
      say("Las gemas acuden solas."); beep(900,.3,"triangle",.05); return;
    }
    if(k === "llama"){
      p.flame = 10; say("Arde todo a tu paso."); beep(200,.4,"sawtooth",.06); return;
    }
  }
  function flameTick(p, dt){
    if(!(p.flame > 0)) return;
    p.flame -= dt;
    p.flameT = (p.flameT||0) - dt;
    if(p.flameT <= 0){
      p.flameT = 0.28;
      for(var i=0;i<3;i++){
        var a = rf(0,6.283);
        area({x:p.x+Math.cos(a)*54, y:p.y+Math.sin(a)*54, w:96*(p.st.area||1), h:96*(p.st.area||1),
          kind:"pool", life:.3, color:"#FF8A3C", dmg:22*(p.st.might||1), owner:p});
      }
      beep(260,.06,"sawtooth",.02);
    }
  }

  /* ---------------- oleadas, igual que en el original ----------------
     Cada minuto manda: dice qué enemigos salen, cuántos debe haber vivos
     como mínimo y cada cuánto se comprueba. Al comprobar, si faltan, se
     generan hasta llenar el cupo. La maldición sube cupo y frecuencia.
     Por encima del tope de vivos solo entran jefes y eventos. */
  var waveMin = -1, spawnT = 0, lightT = 3, arcIdx = 0;

  function spawnRing(type, n, mul){
    var ref = alive()[0] || cam;
    var d = (Math.max(canvas.width,canvas.height)/zoom)*.60;
    for(var i=0;i<n;i++){
      var a2=(i/n)*6.283;
      spawnFoe(type, ref.x+Math.cos(a2)*d, ref.y+Math.sin(a2)*d, mul);
    }
  }
  function spawnWall(type, n, mul){
    var ref = alive()[0] || cam;
    var d = (Math.max(canvas.width,canvas.height)/zoom)*.60;
    var side = ri(0,3);
    for(var i=0;i<n;i++){
      var off = (i-n/2)*34, x, y;
      if(side<2){ x = side===0 ? ref.x-d : ref.x+d; y = ref.y+off; }
      else { x = ref.x+off; y = side===2 ? ref.y-d : ref.y+d; }
      spawnFoe(type, x, y, mul);
    }
  }
  function spawnLight(){
    // las luces aparecen alrededor, como el mobiliario rompible del mapa
    var ref = alive()[0] || cam;
    var d = (Math.max(canvas.width,canvas.height)/zoom)*.45;
    var a2 = rf(0,6.283);
    spawnFoe("luz", ref.x+Math.cos(a2)*d, ref.y+Math.sin(a2)*d, 1);
  }

  function waves(dt){
    var st = players.length ? players[0].st : null;
    var curse = st ? (st.curse||1) : 1;
    var luck  = st ? (st.luck||1) : 1;
    var m = Math.floor(runT/60);
    var last = V.WAVES.length-1;
    var w = V.WAVES[Math.min(m, last)];

    if(m !== waveMin){                       // ha empezado un minuto nuevo
      waveMin = m;
      spawnT = 0;
      if(w.boss){
        var pt = ringPoint();
        // spawnFoe ya aplica el multiplicador del minuto: volver a aplicarlo
        // aquí lo elevaba al cuadrado (minuto 29: 54.000 de vida)
        var el = spawnFoe("elite", pt.x, pt.y, w.mul);
        say("Algo enorme ha despertado."); shake = 10;
        beep(100,.7,"sawtooth",.07);
      }
      if(w.ev){
        var t = stage.foes[w.ev.f];
        if(w.ev.kind === "ring"){ spawnRing(t, w.ev.n, w.mul); say("¡Os rodean!"); shake = 6; }
        else { spawnWall(t, w.ev.n, w.mul); say("Una muralla avanza hacia vosotros."); }
      }
    }

    spawnT -= dt*curse;
    if(spawnT <= 0){
      spawnT = w.every;
      var quota = Math.round(w.min*curse) - trashCount();
      for(var i=0;i<quota;i++){
        var type = stage.foes[w.f[ri(0,w.f.length-1)]];
        var pt2 = ringPoint();
        if(!spawnFoe(type, pt2.x, pt2.y, w.mul)) break;   // tope alcanzado
      }
    }

    var mods = (stage && stage.mods) || {lightChance:.10, maxLights:10};
    lightT -= dt;
    if(lightT <= 0){
      lightT = 1.5;
      if(lightCount() < mods.maxLights &&
         Math.random() < Math.min(0.5, mods.lightChance*luck)) spawnLight();
    }

    // minutos 11 y 21: cada superviviente elige una arcana
    while(arcIdx < V.ARCANA_AT.length && runT >= V.ARCANA_AT[arcIdx]){
      arcIdx++;
      var vivos = alive();
      for(var v2=0;v2<vivos.length;v2++) if(V.ui) V.ui.queueArcana(vivos[v2]);
      say("Las cartas se reparten.");
      beep(520,.5,"sine",.05);
      if(V.ui) V.ui.maybeOpenDraft();
    }

    if(runT >= V.RUN_LENGTH && !G.reaped){
      G.reaped = true;
      if(V.ui) V.ui.endRun(true);
      for(var r=0;r<3;r++){ var pt3 = ringPoint(); spawnFoe("segadora", pt3.x, pt3.y); }
    }
  }

  /* ---------------- bucle ---------------- */
  function update(dt){
    runT += dt;
    rebuildHash();

    for(var i=0;i<players.length;i++){
      var p = players[i];
      if(p.down){
        var helper = null;
        for(var h=0;h<players.length;h++){
          var o=players[h];
          if(o===p||o.down) continue;
          if(Math.hypot(o.x-p.x,o.y-p.y) < 48){ helper=o; break; }
        }
        if(helper){
          p.reviveProg += dt;
          if(p.reviveProg >= 5){
            p.down=false; p.hp=p.maxhp*.5; p.iframe=2;
            burst(p.x,p.y,p.color,40);
            say("¡" + V.HEROES[p.hero].name + " vuelve en pie!");
            beep(620,.25,"triangle",.06);
            if(V.ui) V.ui.party();
          }
        } else p.reviveProg = Math.max(0, p.reviveProg - dt*.8);
        continue;
      }

      var mv;
      if(p.netPeer && V.net && V.net.online && p.netPeer !== V.net.me){
        mv = V.net.inputOf(p.netPeer);            // mando de otro dispositivo
      } else {
        mv = V.ui ? V.ui.readMove(p) : {mx:0,my:0};
        if(V.net && V.net.online) V.net.setInput(mv.mx, mv.my);
      }
      var ml = Math.hypot(mv.mx, mv.my);
      p.moving = ml > .05;
      if(V.arc) V.arc.tick(p, dt, arcApi);
      if(ml > .05){
        var mx=mv.mx/ml, my=mv.my/ml;
        p.aimx=mx; p.aimy=my; p.walk += dt*10;
        if(Math.abs(mx) > .2) p.face = mx>0?1:-1;
        var stepx = mx*p.speed*dt, stepy = my*p.speed*dt;
        // las casas frenan al jugador; la horda las atraviesa
        if(V.world && V.world.solid){
          var pr = p.r*0.8;
          if(!V.world.solid(p.x + stepx + Math.sign(stepx)*pr, p.y)) p.x += stepx;
          if(!V.world.solid(p.x, p.y + stepy + Math.sign(stepy)*pr)) p.y += stepy;
          V.world.unstick(p);
        } else { p.x += stepx; p.y += stepy; }
      }
      if(p.hurt>0) p.hurt-=dt;
      if(p.iframe>0) p.iframe-=dt;
      flameTick(p, dt);
      if(p.st.recovery){
        p.regenAcc += dt;
        if(p.regenAcc >= 1){ p.regenAcc-=1; healPlayer(p, p.st.recovery); }
      }

      for(var w=0;w<p.weapons.length;w++){
        var wp = p.weapons[w], s = weaponStats(p, wp);
        if(wp.def.persistent){ if(wp.def.tick) wp.def.tick(p, wp, s, dt); }
        else {
          wp.t -= dt;
          if(wp.t <= 0){ wp.t = s.cd; wp.def.fire(p, wp, s); }
        }
      }

      // recogidas
      var mag = p.magnet;
      for(var g=gems.length-1;g>=0;g--){
        var gem=gems[g];
        var dx=p.x-gem.x, dy=p.y-gem.y, dd=Math.hypot(dx,dy)||.001;
        if(dd<mag){ var pull=clamp((mag-dd)/mag,0,1)*640+110; gem.x+=dx/dd*pull*dt; gem.y+=dy/dd*pull*dt; }
        if(dd<18){
          // con el Juego Roto la gema no da experiencia: estalla
          if(V.arc && V.arc.has(p,"juego")) arcApi.ring(gem.x, gem.y, 92, 60*(p.st.might||1), p);
          else gainXp(p, gem.v);
          gems.splice(g,1);
          if(Math.random()<.2) beep(1100+Math.random()*400,.03,"square",.02);
        }
      }
      for(var d2=drops.length-1;d2>=0;d2--){
        var dr=drops[d2];
        var ddx=p.x-dr.x, ddy=p.y-dr.y, dl=Math.hypot(ddx,ddy)||.001;
        if(dl<mag*.9){ dr.x+=ddx/dl*280*dt; dr.y+=ddy/dl*280*dt; }
        if(dl<20){
          takeDrop(p, dr);
          if(V.arc) V.arc.pickup(p, dr, arcApi);
          drops.splice(d2,1);
        }
      }
    }
    if(!G.state.running) return;

    updateBullets(dt);
    updateAreas(dt);
    updateFoes(dt);
    if(!G.state.running) return;
    waves(dt);

    for(var pa=parts.length-1;pa>=0;pa--){
      var pt=parts[pa];
      pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vx*=.9; pt.vy*=.9; pt.life-=dt;
      if(pt.life<=0) parts.splice(pa,1);
    }
    for(var fl=floats.length-1;fl>=0;fl--){
      floats[fl].y -= 26*dt; floats[fl].life -= dt*1.3;
      if(floats[fl].life<=0) floats.splice(fl,1);
    }
    for(var gg=0;gg<gems.length;gg++) gems[gg].t += dt;
    if(msgTime>0) msgTime-=dt;
    if(shake>0) shake=Math.max(0,shake-dt*24);
    updateCamera(dt);
    if(V.ui) V.ui.sync();
  }

  /* Subir de nivel no cura: en el original solo abre el draft. */
  function gainXp(p, v){
    if(V.arc) v = V.arc.xp(p, v);
    if(!v) return;
    p.xp += v * (p.st.growth||1);
    var leveled = false;
    while(p.xp >= p.next){
      p.xp -= p.next; p.lvl++;
      p.next = V.xpNeed(p.lvl);
      recalc(p);
      if(V.ui) V.ui.queueDraft(p);
      leveled = true;
      beep(760,.12,"triangle",.05);
    }
    if(leveled && V.ui) V.ui.maybeOpenDraft();
  }

  function updateBullets(dt){
    var v = view();
    for(var b=bullets.length-1;b>=0;b--){
      var bl=bullets[b];
      bl.t += dt; bl.life -= dt;
      if(bl.life<=0){
        if(bl.blast) blast(bl);
        if(bl.arcBlast) arcBlast(bl);
        bullets.splice(b,1); continue;
      }
      if(bl.bounce > 0){                 // Vals de Perlas y Voluntad de Hierro
        if(bl.x < v.x-v.hw || bl.x > v.x+v.hw){ bl.vx*=-1; bl.bounce--; }
        if(bl.y < v.y-v.hh || bl.y > v.y+v.hh){ bl.vy*=-1; bl.bounce--; }
      }

      if(bl.behavior === "arc"){
        bl.vy += 620*dt;
      } else if(bl.behavior === "boomerang"){
        var k = bl.t/(bl.life+bl.t);
        bl.vx *= (1 - dt*2.2); bl.vy *= (1 - dt*2.2);
        var hx = bl.home.x-bl.x, hy = bl.home.y-bl.y, hd = Math.hypot(hx,hy)||1;
        bl.vx += hx/hd*640*dt; bl.vy += hy/hd*640*dt;
      } else if(bl.behavior === "wall"){
        if(bl.x < v.x-v.hw || bl.x > v.x+v.hw){ bl.vx*=-1; if(bl.blast) blast(bl); }
        if(bl.y < v.y-v.hh || bl.y > v.y+v.hh){ bl.vy*=-1; if(bl.blast) blast(bl); }
        bl.x = clamp(bl.x, v.x-v.hw, v.x+v.hw);
        bl.y = clamp(bl.y, v.y-v.hh, v.y+v.hh);
      } else if(bl.behavior === "wander"){
        bl.wt = (bl.wt||0) - dt;
        if(bl.wt <= 0){
          bl.wt = rf(.4,1.1);
          var na = Math.atan2(bl.vy,bl.vx) + rf(-1.4,1.4);
          var sp = Math.hypot(bl.vx,bl.vy);
          bl.vx = Math.cos(na)*sp; bl.vy = Math.sin(na)*sp;
        }
      }
      bl.x += bl.vx*dt; bl.y += bl.vy*dt;
      if(bl.spin) bl.rotA += bl.spin*dt;
      else if(bl.rot) bl.rotA = Math.atan2(bl.vy,bl.vx);

      queryNear(bl.x, bl.y, bl.r+22, scratch);
      var gone = false;
      for(var q=0;q<scratch.length;q++){
        var idx=scratch[q], f=foes[idx];
        if(!f||f.dead) continue;
        if(bl.cool){
          f.tags = f.tags||{};
          var tg = "b"+(bl.id||(bl.id=++bulletId));
          if(f.tags[tg] > 0) continue;
        }
        if(Math.hypot(f.x-bl.x, f.y-bl.y) > bl.r+f.r) continue;
        if(bl.cool){ f.tags["b"+bl.id] = bl.cool; }
        if(bl.chill && Math.random() < bl.chill && !f.def.reaper)
          f.freeze = Math.max(f.freeze, 1.6);
        var vl = Math.hypot(bl.vx,bl.vy)||1;
        var before = f.hp;
        damage(idx, bl.dmg, bl.owner, bl.vx/vl*70, bl.vy/vl*70, bl.critChance || (bl.owner.critChance));
        if(bl.greedy && before>0 && f.dead)
          drops.push({x:f.x,y:f.y,kind:"oro",v:Math.round(6*(bl.owner.st.greed||1))});
        burst(bl.x, bl.y, "#FFFFFF", 2);
        bl.pierce--;
        if(bl.pierce <= 0){ if(bl.blast) blast(bl); gone = true; break; }
      }
      if(gone){ bullets.splice(b,1); continue; }
      // fuera de vista con mucho margen
      if(Math.abs(bl.x-v.x) > v.hw*2.2 || Math.abs(bl.y-v.y) > v.hh*2.2) bullets.splice(b,1);
    }
  }
  var bulletId = 0;
  function blast(bl){
    area({x:bl.x,y:bl.y,r:bl.blast,kind:"blast",life:.3,dmg:bl.dmg*.8,owner:bl.owner,
      color:"#FF8A3C",once:true});
    burst(bl.x,bl.y,"#FF8A3C",14);
  }

  function updateAreas(dt){
    for(var i=areas.length-1;i>=0;i--){
      var a=areas[i];
      a.life -= dt; a.t += dt;
      if(a.follow){ a.x = a.follow.x; a.y = a.follow.y; }
      if(a.kind === "wave"){ a.y -= 240*dt; }
      var doHit = false;
      if(a.once){ if(!a.done){ a.done = true; doHit = true; } }
      else { a.acc -= dt; if(a.acc <= 0){ a.acc = a.interval||.4; doHit = true; } }
      if(doHit) applyArea(a);
      if(a.life <= 0) areas.splice(i,1);
    }
  }
  function applyArea(a){
    var r = a.r || Math.max(a.w,a.h)*.6;
    queryNear(a.x, a.y, r+30, scratch);
    for(var i=0;i<scratch.length;i++){
      var idx=scratch[i], f=foes[idx];
      if(!f||f.dead) continue;
      var inside;
      if(a.w !== undefined){
        // caja orientada: giro inverso del punto
        var dx=f.x-a.x, dy=f.y-a.y;
        var ca=Math.cos(-a.ang), sa=Math.sin(-a.ang);
        var lx=dx*ca-dy*sa, ly=dx*sa+dy*ca;
        var ox = a.fromEdge ? a.w/2 : 0;
        inside = Math.abs(lx-ox) < a.w/2 + f.r && Math.abs(ly) < a.h/2 + f.r;
      } else {
        inside = Math.hypot(f.x-a.x, f.y-a.y) < r + f.r;
      }
      if(!inside) continue;
      if(a.freeze) f.freeze = Math.max(f.freeze, a.freeze);
      if(a.slow) f.slow = Math.max(f.slow, 2.0);
      if(a.halve && !f.def.elite){ f.hp = Math.min(f.hp, f.hp*.5); if(f.hp < 2) kill(idx, a.owner); continue; }
      if(!a.dmg) continue;
      var before = f.hp;
      damage(idx, a.dmg, a.owner, 0, 0, a.critChance);
      if(a.lifesteal && a.owner) a.owner.hp = Math.min(a.owner.maxhp, a.owner.hp + a.dmg*.06);
    }
  }

  /* Cuánto aguanta un enemigo fuera de cuadro antes de reaparecer. Cada uno
     lleva su propio plazo dentro de esa horquilla para que no reaparezcan
     todos a la vez formando un muro. */
  var RECICLA = 3.0;
  /* Se le manda al borde del encuadre, con dos tercios de probabilidad por
     delante de hacia donde caminas: la gracia es que te los encuentres, no
     que te salgan por la espalda. */
  function reubica(f, tgt){
    var d = (Math.max(canvas.width, canvas.height)/zoom)*0.58;
    var a;
    if(tgt.moving && Math.random() < 0.66){
      var base = Math.atan2(tgt.aimy||0, tgt.aimx||1);
      a = base + rf(-1.15, 1.15);
    } else a = rf(0, 6.283);
    f.x = tgt.x + Math.cos(a)*d;
    f.y = tgt.y + Math.sin(a)*d;
    f.kx = 0; f.ky = 0;
  }

  function updateFoes(dt){
    var pushed = 0;
    // el encuadre, con un margen para no reciclar al que asoma medio cuerpo
    var vistaW = canvas.width/(2*zoom) + 70;
    var vistaH = canvas.height/(2*zoom) + 70;
    for(var e=foes.length-1;e>=0;e--){
      var f=foes[e];
      if(f.dead){ foes.splice(e,1); continue; }
      if(f.hit>0) f.hit-=dt;
      if(f.freeze>0){ f.freeze-=dt; continue; }
      if(f.slow>0) f.slow-=dt;
      if(f.tags) for(var k in f.tags) if(f.tags[k]>0) f.tags[k]-=dt;

      var tgt = nearestPlayer(f.x,f.y);
      if(!tgt) continue;
      var dx=tgt.x-f.x, dy=tgt.y-f.y, dist=Math.hypot(dx,dy)||1;
      if(f.def.light){ if(dist > 1800) foes.splice(e,1); continue; }

      /* Reciclado. El que lleva un rato fuera del encuadre no se borra
         —borrarlo vaciaba la pantalla, porque el cupo del minuto lo seguía
         contando como vivo— ni te persigue eternamente desde atrás: se le
         manda al borde, delante de ti, con la vida que le quedaba. Huir no
         cura a nadie y tampoco despeja el camino. */
      if(Math.abs(f.x-cam.x) < vistaW && Math.abs(f.y-cam.y) < vistaH) f.fuera = 0;
      else f.fuera += dt;
      if(f.fuera > f.paciencia){
        reubica(f, tgt);
        f.fuera = 0;
        f.paciencia = RECICLA + Math.random()*2.0;
        continue;
      }
      var sp = f.speed * (f.slow>0?.45:1);
      if(f.def.erratic){ f.wob += dt*5; sp *= 1 + Math.sin(f.wob)*.35; }
      f.x += (dx/dist)*sp*dt + f.kx*dt;
      f.y += (dy/dist)*sp*dt + f.ky*dt;
      f.kx *= .86; f.ky *= .86;
      if(Math.abs(f.kx) < 1) f.kx = 0;
      if(Math.abs(f.ky) < 1) f.ky = 0;
      f.face = dx > 0 ? 1 : -1;

      if(pushed < 2600){
        var bucket = hashMap.get((Math.floor(f.x/CELL)*73856093)^(Math.floor(f.y/CELL)*19349663));
        if(bucket){
          var lim = Math.min(bucket.length, 5);
          for(var n=0;n<lim;n++){
            var oi=bucket[n];
            if(oi===e) continue;
            var of=foes[oi];
            if(!of||of.dead) continue;
            var sx=f.x-of.x, sy=f.y-of.y, sd=Math.hypot(sx,sy), mn=f.r+of.r;
            if(sd>.01 && sd<mn){
              var push=(mn-sd)/mn*46*dt;
              f.x+=sx/sd*push; f.y+=sy/sd*push; pushed++;
            }
          }
        }
      }
      if(dist < f.r+tgt.r){
        hurtPlayer(tgt, f.def.reaper ? 9999 : f.dmg);
        if(!f.def.elite && !f.def.reaper){ f.kx -= (dx/dist)*130; f.ky -= (dy/dist)*130; }
      }
    }
  }

  function updateCamera(dt){
    var list = alive();
    if(!list.length) list = players;
    if(!list.length) return;
    var minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    for(var i=0;i<list.length;i++){
      minX=Math.min(minX,list[i].x); maxX=Math.max(maxX,list[i].x);
      minY=Math.min(minY,list[i].y); maxY=Math.max(maxY,list[i].y);
    }
    var tx=(minX+maxX)/2, ty=(minY+maxY)/2;
    var z = Math.min(canvas.width/((maxX-minX)+440), canvas.height/((maxY-minY)+360));
    z = clamp(z, baseZoom*.55, baseZoom);
    zoom += (z-zoom)*Math.min(1,dt*3);
    cam.x += (tx-cam.x)*Math.min(1,dt*8);
    cam.y += (ty-cam.y)*Math.min(1,dt*8);
    if(players.length>1){
      var hw=canvas.width/(2*zoom)-32, hh=canvas.height/(2*zoom)-32;
      for(var k=0;k<players.length;k++){
        players[k].x = clamp(players[k].x, cam.x-hw, cam.x+hw);
        players[k].y = clamp(players[k].y, cam.y-hh, cam.y+hh);
      }
    }
  }

  /* ---------------- dibujado ---------------- */
  /* El arte va a doble resolución: cada sprite sabe a qué escala está
     pintado y aquí se dibuja siempre al tamaño de mundo de siempre. */
  /* Héroes pintados: la pose va en una imagen de verdad, no en una rejilla
     de píxeles, así que se dibuja suavizada y a mayor tamaño que el sprite.
     La animación la pone el motor: rebote al andar, ligera inclinación y
     desplome al caer. Es lo que permite subir el detalle del personaje sin
     mover la cámara ni quitarle mapa al jugador. */
  var blancos = {};
  function siluetaBlanca(key, img){
    if(blancos[key]) return blancos[key];
    var c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = "rgba(255,248,236,.92)";
    g.fillRect(0, 0, c.width, c.height);
    blancos[key] = c;
    return c;
  }
  /* ---------------- sombra de silueta ----------------
     Una mancha ovalada no dice nada de quién la proyecta. La sombra de
     verdad es la propia figura, en negro plano y aplastada contra el
     suelo: se le ve la pose, los brazos abiertos, la capa. Se guarda una
     silueta por sprite —no por fotograma— y se dibuja aplastada en el
     momento, así que no cuesta memoria y sirve para cualquier escala. */
  var oscuros = {};
  function siluetaOscura(key, img){
    if(oscuros[key]) return oscuros[key];
    var c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    var g = c.getContext("2d");
    /* Se desenfoca aquí, una sola vez por sprite, no en cada cuadro: la
       sombra debe insinuar la pose, no dibujar los dedos. */
    var r = Math.max(1, Math.round(img.height / 42));
    if(typeof g.filter === "string") g.filter = "blur(" + r + "px)";
    g.drawImage(img, 0, 0);
    g.filter = "none";
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#000000";
    g.fillRect(0, 0, c.width, c.height);
    oscuros[key] = c;
    return c;
  }
  /* Dibuja la sombra bajo una figura. (sx,sy,sw,sh) recorta el fotograma
     dentro de la imagen; (cx, pie) es dónde apoya, en coordenadas de
     mundo; (ancho, alto) el tamaño al que se dibuja la figura. */
  V.SOMBRA = { on: true, alfa: 0.55, aplasta: 0.30, sube: 0.26 };
  function sombraDe(key, img, sx, sy, sw, sh, cx, pie, ancho, alto, flip){
    var S = V.SOMBRA;
    if(!S.on) return;
    var sil = siluetaOscura(key, img);
    var hs = alto * S.aplasta;                  // qué aplastada queda
    ctx.save();
    ctx.globalAlpha = S.alfa;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low";
    ctx.translate(cx, pie);
    if(flip) ctx.scale(-1, 1);
    ctx.drawImage(sil, sx, sy, sw, sh, -ancho/2, -hs*S.sube, ancho, hs);
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
  }

  /* Barra de vida del jefe. Iba clavada a (y - radio - 16), que en un elite
     de casi cien píxeles de alto caía dentro del cuerpo; ahora se apoya
     encima del dibujo y mide lo que él mide. La Segadora no lleva: es
     invulnerable y una barra siempre llena solo engaña. */
  function barraJefe(fo, cima, ancho){
    if(!fo.def.elite || fo.def.reaper) return;
    var w = clamp(ancho, 54, 132), x = Math.round(fo.x - w/2), y = Math.round(cima) - 11;
    var fr = clamp(fo.hp/fo.maxhp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.72)";  ctx.fillRect(x-1, y-1, w+2, 8);
    ctx.fillStyle = "#3A1016";          ctx.fillRect(x, y, w, 6);
    ctx.fillStyle = fr > .35 ? "#C2263A" : "#E8823A";
    ctx.fillRect(x, y, Math.max(1, Math.round(w*fr)), 6);
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x, y, w, 1);
  }

  /* Los héroes se ven siempre de perfil. Antes había tres vistas —de frente
     al bajar, de espaldas al subir, de lado en horizontal— y al andar en
     diagonal el personaje giraba sobre sí mismo cada dos pasos. De perfil
     siempre, mirando al último lado hacia el que fue, se lee mejor y es lo
     que hacen los juegos de esta clase. */
  function vistaDe(pl){ return "lado"; }

  /* Hacia qué lado mira, que es lo único que decide ya el dibujo. Al andar
     en vertical puro se conserva el último, para que no dé un volantazo. */
  function ladoDe(pl){
    if(pl.moving && Math.abs(pl.aimx) > 0.15) pl.lado = pl.aimx < 0 ? "izq" : "der";
    else if(!pl.lado) pl.lado = (pl.face || 1) < 0 ? "izq" : "der";
    return pl.lado;
  }

  /* ---------------- caminata de perfil ----------------
     Tira de ocho pasos con su propio dibujo por lado, así que aquí no se
     voltea nada: el de la izquierda es el dibujo de la izquierda. La celda
     no es cuadrada; su ancho sale de dividir la tira entre los ocho pasos.
     Los pies están siempre a la misma altura dentro de la celda, así que
     basta con apoyar el borde de abajo para que no bote. */
  function dibujaHeroeLado(pl, tira, lado){
    var n = V.LADO_PASOS || 8;
    var cel = tira.width / n;
    var i = pl.moving ? (Math.floor(pl.walk * 0.95) % n + n) % n : 0;
    var alto = 34 * (V.HERO_SCALE || 1.9);
    var ancho = alto * (cel / tira.height);
    var margen = alto * (4 / tira.height);      // el aire bajo los pies
    var pie = pl.y + 9 + margen;

    sombraDe("L#"+pl.hero+lado, tira, i*cel, 0, cel, tira.height,
             pl.x, pl.y + 9, ancho, alto, false);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(Math.round(pl.x), Math.round(pie));
    if(pl.iframe > 0 && Math.floor(performance.now()/60)%2) ctx.globalAlpha = .5;
    ctx.drawImage(tira, i*cel, 0, cel, tira.height, -ancho/2, -alto, ancho, alto);
    if(pl.hurt > 0){
      ctx.globalAlpha = Math.min(1, pl.hurt*4);
      var bl = siluetaBlanca("L#"+pl.hero+lado, tira);
      ctx.drawImage(bl, i*cel, 0, cel, tira.height, -ancho/2, -alto, ancho, alto);
    }
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  /* ---------------- el paso ----------------
     De cada hoja salió una pose por vista, no una tira de fotogramas: los
     cuadros de caminata venían solapados y no había por dónde cortarlos.
     Así que el paso lo construye el motor: la figura se parte en nueve
     franjas horizontales y se les aplica una onda que baja del pecho a los
     pies, con la amplitud creciendo hacia abajo. Eso balancea el faldón y
     las piernas; encima va el rebote del cuerpo y una compresión en el
     apoyo. De lado se nota como zancada; de frente, como contoneo. */
  /* ---------------- caminata dibujada ----------------
     Los héroes cuyas hojas traían la tira de pasos se animan con los
     fotogramas de verdad: la tira es una fila de celdas cuadradas, así que
     el número de pasos sale de dividir su ancho entre su alto. La figura
     va centrada en la celda y apoyada en el borde de abajo, y se dibuja al
     tamaño que hace que mida lo mismo que su pose quieta. */
  function dibujaHeroeTira(pl, tira, quieto, vista){
    var n = Math.max(1, Math.round(tira.width / tira.height));
    var cel = tira.width / n;
    var i = pl.moving ? (Math.floor(pl.walk * 0.95) % n + n) % n : 0;
    var base = 30 * (V.HERO_SCALE || 1.9);
    var alto = base * (tira.height / Math.max(1, quieto.height));
    var ancho = alto * (cel / tira.height);
    var lateral = (vista === "lado");

    var mira = V.miraLado ? V.miraLado(pl.hero) : 1;
    var voltea = lateral && (pl.face || 1) * mira < 0;
    sombraDe("s#"+pl.hero+vista, tira, i*cel, 0, cel, tira.height,
             pl.x, pl.y + 9, ancho, alto, voltea);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(pl.x, pl.y + 9);
    if(voltea) ctx.scale(-1, 1);
    if(pl.iframe > 0 && Math.floor(performance.now()/60)%2) ctx.globalAlpha = .5;
    ctx.drawImage(tira, i*cel, 0, cel, tira.height, -ancho/2, -alto, ancho, alto);
    if(pl.hurt > 0){
      ctx.globalAlpha = Math.min(1, pl.hurt*4);
      var bl = siluetaBlanca(pl.hero + "#" + vista, tira);
      ctx.drawImage(bl, i*cel, 0, cel, tira.height, -ancho/2, -alto, ancho, alto);
    }
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  function dibujaHeroePintado(pl, img, vista){
    var alto = 30 * (V.HERO_SCALE || 1.9);
    var ancho = alto * (img.width / img.height);
    var lateral = (vista === "lado");

    var fase = pl.walk * 1.35;
    var mov  = pl.moving ? 1 : 0;
    /* El cuerpo va quieto: nada de rebote, inclinación ni compresión. Solo
       se mueve de la cintura para abajo, que es lo que hace que la caminata
       se lea fluida en vez de a saltos. */
    var onda = (lateral ? 1.1 : 0.7) * mov;
    var bob = 0, aplasta = 1, lean = 0;

    var mira0 = V.miraLado ? V.miraLado(pl.hero) : 1;
    sombraDe("s#"+pl.hero+vista, img, 0, 0, img.width, img.height,
             pl.x, pl.y + 9, ancho, alto, lateral && (pl.face || 1) * mira0 < 0);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(pl.x, pl.y + 9 + bob);
    /* Voltear solo si la marcha y el perfil de la hoja no coinciden. */
    var mira = V.miraLado ? V.miraLado(pl.hero) : 1;
    if(lateral && (pl.face || 1) * mira < 0) ctx.scale(-1, 1);
    if(lean) ctx.rotate(lean);
    if(pl.iframe > 0 && Math.floor(performance.now()/60)%2) ctx.globalAlpha = .5;

    var N = 9, sh = img.height / N;
    var altoF = (alto / N) * aplasta;
    for(var i=0;i<N;i++){
      var t = i/(N-1);                       // 0 arriba, 1 a los pies
      // de la cintura para arriba no se mueve nada
      var peso = t < 0.55 ? 0 : (t-0.55)/0.45;
      var dx = onda * Math.sin(fase - t*1.2) * peso;
      var dy = -alto*aplasta + i*altoF;
      if(mov && t > 0.60){
        /* Abajo las dos mitades van en sentidos opuestos: una pierna
           adelanta mientras la otra retrasa, y la que adelanta se levanta
           un poco. Es lo que convierte el balanceo en zancada. */
        // las mitades se solapan un poco: si no, al separarse se abre
        // una costura por el centro de la figura
        var sol = img.width*0.09, mitad = img.width/2;
        var solD = ancho*0.09, amp = (lateral ? 3.0 : 1.8)*peso;
        var izqX = -amp*Math.sin(fase), derX = amp*Math.sin(fase);
        // el pie que adelanta se despega del suelo; el otro se queda
        var izqY = -Math.max(0, Math.sin(fase))*1.5*peso;
        var derY = -Math.max(0, -Math.sin(fase))*1.5*peso;
        ctx.drawImage(img, 0, i*sh, mitad + sol, sh + 0.6,
          -ancho/2 + dx + izqX, dy + izqY, ancho/2 + solD, altoF + 0.6);
        ctx.drawImage(img, mitad - sol, i*sh, mitad + sol, sh + 0.6,
          -solD + dx + derX, dy + derY, ancho/2 + solD, altoF + 0.6);
      } else {
        ctx.drawImage(img, 0, i*sh, img.width, sh + 0.6,
                      -ancho/2 + dx, dy, ancho, altoF + 0.6);
      }
    }
    if(pl.hurt > 0){
      ctx.globalAlpha = Math.min(1, pl.hurt*4);
      var bl = siluetaBlanca(pl.hero + vista, img);
      for(var j=0;j<N;j++){
        var t2 = j/(N-1), p2 = t2*t2;
        ctx.drawImage(bl, 0, j*sh, img.width, sh + 0.6,
          -ancho/2 + onda*Math.sin(fase - t2*2.1)*p2, -alto*aplasta + j*altoF,
          ancho, altoF + 0.6);
      }
    }
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  function sw(key){ var e=V.sprInfo(key); return e ? e.art : 1; }
  function blit(cv, key, x, y){
    var a = sw(key), dw = cv.width/a, dh = cv.height/a;
    ctx.drawImage(cv, Math.round(x), Math.round(y), dw, dh);
  }

  function render(){
    var w=canvas.width, h=canvas.height;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = V.world ? V.world.bg(stageKey) : "#12101C";
    ctx.fillRect(0,0,w,h);

    var sx = shake ? rf(-shake,shake) : 0, sy = shake ? rf(-shake,shake) : 0;
    ctx.save();
    ctx.translate(Math.round(w/2+sx), Math.round(h/2+sy));
    ctx.scale(zoom, zoom);
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    var hw=(w/zoom)/2+80, hh=(h/zoom)/2+80;
    var left=cam.x-hw, right=cam.x+hw, top=cam.y-hh, bot=cam.y+hh;

    // suelo, caminos, parcelas y detalle: cuatro capas por trozos cacheados
    V.world.draw(ctx, cam.x, cam.y, zoom, w, h, stageKey);

    /* Zonas de daño, bajo los cuerpos. El látigo es la excepción: sale de la
       mano y golpea por delante, así que se pinta después de todo el mundo,
       más abajo. Si fuera aquí, los enemigos a los que pega lo taparían. */
    for(var i=0;i<areas.length;i++) if(areas[i].anim !== "latigo") drawArea(areas[i]);

    // gemas y objetos
    for(var g=0;g<gems.length;g++){
      var gem=gems[g];
      if(gem.x<left||gem.x>right||gem.y<top||gem.y>bot) continue;
      var tier = V.gemTier(gem.v);
      var key = tier===2?"i_gema3":(tier===1?"i_gema2":"i_gema");
      var s=V.sprite(key,0), ga=sw(key);
      blit(s, key, gem.x-(s.width/ga)/2, gem.y-(s.height/ga)/2+Math.sin(gem.t*4)*2);
    }
    for(var d=0;d<drops.length;d++){
      var dr=drops[d];
      var ks = dr.kind==="oro"?"i_oro":(dr.kind==="carne"?"i_carne":(dr.kind==="cofre"?"i_cofre":null));
      if(!ks){
        var pc = V.iconCanvas ? V.iconCanvas("pu_"+dr.kind) : null;
        if(pc){
          ctx.drawImage(pc, Math.round(dr.x-pc.width/2), Math.round(dr.y-pc.height/2));
          continue;
        }
        ks = "i_oro";
      }
      var sp2=V.sprite(ks,0), da=sw(ks);
      blit(sp2, ks, dr.x-(sp2.width/da)/2, dr.y-(sp2.height/da)/2);
    }

    // enemigos
    for(var f2=0;f2<foes.length;f2++){
      var fo=foes[f2];
      if(fo.x<left||fo.x>right||fo.y<top||fo.y>bot) continue;
      var spr;
      if(fo.def.light){
        // las luces se dibujan con su icono y palpitan un poco
        var lc = V.iconCanvas ? V.iconCanvas("pu_luz") : null;
        if(lc){
          ctx.globalAlpha = 0.13 + Math.sin(runT*3 + fo.wob)*0.05;
          ctx.fillStyle = "#FFD36B";
          ctx.fillRect(Math.round(fo.x)-18, Math.round(fo.y)-20, 36, 34);
          ctx.globalAlpha = 1;
          ctx.drawImage(lc, Math.round(fo.x-lc.width/2), Math.round(fo.y-lc.height+6));
        }
        continue;
      }
      /* Si el bicho tiene dibujo, se usa ese: se escala a partir de su
         radio de colisión para que el tamaño en pantalla siga a lo que de
         verdad ocupa, y lleva un contoneo corto para no parecer una
         estatua (las hojas traen una sola pose, no tira de pasos). */
      var pin = V.bicho ? V.bicho(fo.type) : null;
      if(pin){
        var alto = fo.r * 3.45 * ((V.FOE_SCALE || 1.55) / 1.55);
        var ancho = alto * (pin.width / pin.height);
        var tw = runT*7 + fo.wob;
        var aire = fo.freeze > 0 ? 0 : Math.abs(Math.sin(tw)) * alto * 0.035;
        var apl  = fo.freeze > 0 ? 1 : 1 + Math.sin(tw*2) * 0.035;
        sombraDe("e#"+fo.type, pin, 0, 0, pin.width, pin.height,
                 Math.round(fo.x), Math.round(fo.y + fo.r*0.9),
                 ancho, alto, fo.face < 0);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.translate(Math.round(fo.x), Math.round(fo.y + fo.r*0.9));
        if(fo.face < 0) ctx.scale(-1, 1);
        ctx.globalAlpha = fo.freeze > 0 ? .75 : 1;
        var iw = ancho/apl, ih = alto*apl;
        var img2 = fo.hit > 0 ? siluetaBlanca("e#"+fo.type, pin) : pin;
        ctx.drawImage(img2, -iw/2, -ih - aire, iw, ih);
        ctx.restore();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 1;
        if(fo.freeze > 0){
          ctx.fillStyle = "rgba(124,198,255,.45)";
          ctx.fillRect(fo.x-ancho/2, fo.y+fo.r*0.9-alto, ancho, 3);
          ctx.fillRect(fo.x-ancho/2, fo.y+fo.r*0.9-3, ancho, 3);
        }
        barraJefe(fo, fo.y + fo.r*0.9 - alto - aire, ancho);
        continue;
      }
      var fa = sw(fo.def.spr) / (V.FOE_SCALE || 1);
      var clip = fo.freeze > 0 ? "idle" : "walk";
      if(fo.hit>0) spr = V.spriteHit(fo.def.spr);
      else spr = V.sprite(fo.def.spr, Math.floor(runT*9)+fo.frame, clip);
      if(!spr) continue;
      var dw = spr.width/fa, dh = spr.height/fa;
      // anclado por los pies: la sombra del sprite se apoya en el suelo
      var foot = Math.round(fo.r*0.9);
      var px=Math.round(fo.x-dw/2), py=Math.round(fo.y-dh+foot);
      sombraDe("p#"+fo.def.spr, spr, 0, 0, spr.width, spr.height,
               Math.round(fo.x), Math.round(fo.y+foot), dw, dh, fo.face < 0);
      if(fo.freeze>0){ ctx.globalAlpha=.75; }
      if(fo.face<0){
        ctx.save(); ctx.translate(Math.round(fo.x),Math.round(fo.y)); ctx.scale(-1,1);
        ctx.drawImage(spr, -dw/2, -dh+foot, dw, dh); ctx.restore();
      } else ctx.drawImage(spr, px, py, dw, dh);
      ctx.globalAlpha=1;
      if(fo.freeze>0){
        ctx.fillStyle="rgba(124,198,255,.45)";
        ctx.fillRect(px, py, dw, 3);
        ctx.fillRect(px, py+dh-3, dw, 3);
      }
      barraJefe(fo, py, dw);
    }

    // proyectiles
    for(var b2=0;b2<bullets.length;b2++){
      var bu=bullets[b2];
      var bs = bu.spr ? V.sprite(bu.spr,0) : null;
      var ba = bu.spr ? sw(bu.spr) : 1;
      /* Estela. Los proyectiles son sprites pequeños y a esta velocidad se
         pierden: las balas quedaban en motas y el Ala de Ébano, que es
         negra, desaparecía contra el suelo oscuro. La estela dice de dónde
         viene y hacia dónde va, y le da un borde que lo despega del fondo. */
      var vel = Math.hypot(bu.vx||0, bu.vy||0);
      if(vel > 40){
        var ux = bu.vx/vel, uy = bu.vy/vel;
        var largo = Math.min(42, 8 + vel*0.055);
        for(var e2=0;e2<6;e2++){
          var ff = (e2+1)/6;
          ctx.globalAlpha = 0.62*(1-ff*0.85);
          ctx.fillStyle = "#FFF3D0";
          var gr = Math.max(1, Math.round(bu.r*0.95*(1-ff*0.55)));
          ctx.fillRect(Math.round(bu.x - ux*largo*ff - gr/2),
                       Math.round(bu.y - uy*largo*ff - gr/2), gr, gr);
        }
        ctx.globalAlpha = 1;
      }
      if(bs){
        ctx.save(); ctx.translate(Math.round(bu.x),Math.round(bu.y));
        if(bu.rot||bu.spin) ctx.rotate(bu.rotA);
        var sc = bu.r/8;
        if(sc>1.08||sc<0.92){ ctx.scale(sc,sc); }
        ctx.drawImage(bs, -(bs.width/ba)/2, -(bs.height/ba)/2, bs.width/ba, bs.height/ba);
        ctx.restore();
      } else {
        ctx.fillStyle="#FFF";
        ctx.fillRect(Math.round(bu.x-bu.r/2), Math.round(bu.y-bu.r/2), bu.r, bu.r);
      }
    }

    // jugadores y armas persistentes
    for(var p3=0;p3<players.length;p3++){
      var pl=players[p3];
      if(pl.down){ drawTomb(pl); continue; }
      for(var wd=0;wd<pl.weapons.length;wd++){
        var ww=pl.weapons[wd];
        if(ww.def.draw) ww.def.draw(pl, ww, ctx);
      }
      var ladoP = ladoDe(pl);
      /* Primero la hoja de perfil, que es la buena. Los héroes que todavía
         no la tienen siguen con su dibujo de antes, pero ya solo de lado. */
      var perfil = V.ladoHeroe ? V.ladoHeroe(pl.hero, ladoP) : null;
      var vistaP = vistaDe(pl);
      var pintado = perfil || (V.vistaHeroe ? V.vistaHeroe(pl.hero, vistaP) : null);
      if(pintado){
        if(perfil) dibujaHeroeLado(pl, perfil, ladoP);
        else {
          /* Si su hoja traía los pasos dibujados, se usan; si no, el paso lo
             construye el motor a partir de la pose quieta. */
          var tiraP = V.tiraHeroe ? V.tiraHeroe(pl.hero, vistaP) : null;
          if(tiraP) dibujaHeroeTira(pl, tiraP, pintado, vistaP);
          else dibujaHeroePintado(pl, pintado, vistaP);
        }
        if(players.length>1){
          ctx.fillStyle="rgba(7,6,14,.8)";
          ctx.fillRect(Math.round(pl.x)-7, Math.round(pl.y)-64, 14, 12);
          ctx.fillStyle=pl.color;
          ctx.font="700 11px 'Barlow Semi Condensed',Arial,sans-serif";
          ctx.textAlign="center";
          ctx.fillText(String(pl.slot+1), Math.round(pl.x), Math.round(pl.y)-55);
        }
        var hf2 = clamp(pl.hp/pl.maxhp, 0, 1);
        if(hf2 < 1){
          var bw2 = 30, bx2 = Math.round(pl.x)-bw2/2, by2 = Math.round(pl.y)+13;
          ctx.fillStyle="rgba(7,6,14,.85)"; ctx.fillRect(bx2-1, by2-1, bw2+2, 5);
          ctx.fillStyle="#2A1018"; ctx.fillRect(bx2, by2, bw2, 3);
          ctx.fillStyle = hf2<.3 ? "#FF4A5E" : "#C2263A";
          ctx.fillRect(bx2, by2, Math.round(bw2*hf2), 3);
        }
        continue;
      }
      var pa = sw(pl.spr);
      var clipP = pl.moving ? "walk" : "idle";
      var frame = pl.moving ? Math.floor(pl.walk*1.6) : Math.floor(runT*2.4);
      var ps = pl.hurt>0 ? V.spriteHit(pl.spr) : V.sprite(pl.spr, frame, clipP);
      var pw = ps.width/pa, phh = ps.height/pa;
      sombraDe("p#"+pl.spr, ps, 0, 0, ps.width, ps.height,
               Math.round(pl.x), Math.round(pl.y)+9, pw, phh, pl.face < 0);
      if(pl.iframe>0 && Math.floor(performance.now()/60)%2) ctx.globalAlpha=.45;
      ctx.save(); ctx.translate(Math.round(pl.x), Math.round(pl.y));
      if(pl.face<0) ctx.scale(-1,1);
      ctx.drawImage(ps, -pw/2, -(phh-12), pw, phh);
      ctx.restore();
      ctx.globalAlpha=1;
      // barra de vida pegada a los pies
      var hf = clamp(pl.hp/pl.maxhp, 0, 1);
      if(hf < 1){
        var bw = 26, bx = Math.round(pl.x)-bw/2, by = Math.round(pl.y)+9;
        ctx.fillStyle="rgba(7,6,14,.85)"; ctx.fillRect(bx-1, by-1, bw+2, 5);
        ctx.fillStyle="#2A1018"; ctx.fillRect(bx, by, bw, 3);
        ctx.fillStyle= hf<.3 ? "#FF4A5E" : "#C2263A";
        ctx.fillRect(bx, by, Math.round(bw*hf), 3);
      }
      if(players.length>1){
        ctx.fillStyle="rgba(7,6,14,.8)";
        ctx.fillRect(Math.round(pl.x)-7, Math.round(pl.y)-30, 14, 12);
        ctx.fillStyle=pl.color;
        ctx.font="700 11px 'Barlow Semi Condensed',Arial,sans-serif";
        ctx.textAlign="center";
        ctx.fillText(String(pl.slot+1), Math.round(pl.x), Math.round(pl.y)-21);
      }
    }

    // el látigo, por encima de héroes y enemigos
    for(var la=0;la<areas.length;la++) if(areas[la].anim === "latigo") drawArea(areas[la]);

    for(var pa2=0;pa2<parts.length;pa2++){
      var pt2=parts[pa2];
      ctx.globalAlpha=clamp(pt2.life*2.4,0,1);
      ctx.fillStyle=pt2.c;
      ctx.fillRect(Math.round(pt2.x), Math.round(pt2.y), pt2.s, pt2.s);
    }
    ctx.globalAlpha=1;

    ctx.font="700 13px 'Barlow Semi Condensed',Arial,sans-serif";
    ctx.textAlign="center";
    for(var fl2=0;fl2<floats.length;fl2++){
      ctx.globalAlpha=clamp(floats[fl2].life,0,1);
      ctx.fillStyle=floats[fl2].c;
      ctx.fillText(floats[fl2].t, floats[fl2].x, floats[fl2].y);
    }
    ctx.globalAlpha=1;
    ctx.restore();

    // niebla del mapa + luna
    ctx.fillStyle = stage.fog;
    ctx.fillRect(0,0,w,h);
    var lg=ctx.createRadialGradient(w/2,h/2,90*zoom,w/2,h/2,Math.max(w,h)*.72);
    lg.addColorStop(0,"rgba(0,0,0,0)");
    lg.addColorStop(.6,"rgba(4,3,10,.38)");
    lg.addColorStop(1,"rgba(4,3,10,.88)");
    ctx.fillStyle=lg; ctx.fillRect(0,0,w,h);

    if(V.ui) V.ui.drawHud(ctx, w, h, {runT:runT, runGold:runGold, msg:msgText, msgTime:msgTime, players:players});
  }

  function drawTomb(pl){
    var x=Math.round(pl.x), y=Math.round(pl.y);
    ctx.fillStyle="#3A3648";
    ctx.fillRect(x-9, y-10, 18, 20);
    ctx.fillRect(x-12, y+8, 24, 5);
    ctx.fillStyle="#6E6A80";
    ctx.fillRect(x-2, y-6, 4, 12); ctx.fillRect(x-6, y-2, 12, 4);
    if(pl.reviveProg>0){
      ctx.fillStyle=pl.color;
      ctx.fillRect(x-14, y-18, Math.round(28*(pl.reviveProg/5)), 4);
    }
  }

  /* ---------------- barrido ----------------
     Una media luna que cruza por delante, dibujada con dos arcos: el de
     fuera a la distancia del alcance y el de dentro un poco más acá. Al
     cerrarlos queda punta fina en los extremos y cuerpo en el medio, que es
     lo que hace que se lea como un tajo y no como una raya.

     Va en código y no en imagen a propósito: así toma el color del arma que
     lo lanza, se estira al alcance que tenga en ese momento, nunca se ve
     borrosa por mucho que se agrande y no cuesta un solo byte de descarga. */
  function barrido(alcance, alto, color, t){
    /* Se dibuja en local: origen en la mano, el tajo sale hacia +x. Quien
       llama ya ha colocado y girado el lienzo. */
    var R = Math.max(1, alcance);
    var escY = (alto*0.5) / R;                    // aplastado: mucho ancho, poco alto
    var med = Math.sin(Math.min(1, t*1.12) * Math.PI);
    var centro = -0.95 + 1.9*t;                   // entra por arriba y sale por abajo
    var media  = 0.30 + 0.92*med;
    var g0 = centro - media, g1 = centro + media;
    var grosor = R * (0.10 + 0.30*Math.pow(med, 0.7));
    var N = 24;
    function luna(gr){
      var i, u, g, rr;
      ctx.beginPath();
      for(i=0;i<=N;i++){
        u = i/N; g = g0 + (g1-g0)*u;
        ctx.lineTo(Math.cos(g)*R, Math.sin(g)*R*escY);
      }
      for(i=N;i>=0;i--){
        u = i/N; g = g0 + (g1-g0)*u;
        rr = R - gr*Math.sin(Math.PI*u);
        ctx.lineTo(Math.cos(g)*rr, Math.sin(g)*rr*escY);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    var a0 = clamp(t < .12 ? t/.12 : (1-t)/.55, 0, 1);
    /* El cuerpo va translúcido a propósito: un tajo opaco tapa justo a los
       enemigos que estás golpeando, que es lo que quieres ver. Con las armas
       de color casi blanco —el Viento Sacro, la Espada de la Victoria— la
       diferencia entre 0,92 y 0,55 es la que hay entre una mancha maciza y
       un barrido. */
    ctx.globalAlpha = a0 * 0.55;
    ctx.fillStyle = color;
    luna(grosor);
    /* y el filo, una media luna más fina pegada al borde de fuera: es lo que
       le da el brillo de metal. Sin él queda una mancha plana. */
    ctx.globalAlpha = a0 * 0.80;
    ctx.fillStyle = "#FFF4E2";
    luna(grosor*0.26);
    ctx.restore();
  }
  /* Dónde nace el tajo: la mano si el arma la guardó, y si no, el borde de
     atrás de su caja de daño. */
  function origenTajo(a){
    var ang = a.ang || 0;
    if(a.ox !== undefined) return {x:a.ox, y:a.oy, ang:ang};
    return {x:a.x - Math.cos(ang)*a.w*0.5, y:a.y - Math.sin(ang)*a.w*0.5, ang:ang};
  }

  function drawArea(a){
    var al = clamp(a.life/(a.max||1),0,1);
    if(a.kind === "slash" && a.anim === "latigo" && V.LATIGO && V.LATIGO.img
       && V.LATIGO_ESTILO !== "barrido"){
      /* Látigo dibujado: ocho fotogramas repartidos por la vida del área, y
         la escala sale del alcance real del arma dividido entre el del
         dibujo, así que el chasquido llega justo hasta donde llega el daño.
         Se voltea con scale, no con rotate: un giro de media vuelta lo
         pondría además del revés. */
      var L = V.LATIGO;
      var fr = clamp(Math.floor((1-al)*L.n), 0, L.n-1);
      var k = (a.w || 104) / L.alcance;
      ctx.save();
      ctx.translate(Math.round(a.ox), Math.round(a.oy));
      if(a.dir < 0) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(L.img, fr*L.cw, 0, L.cw, L.ch,
                    -L.ax*k, -L.ay*k, L.cw*k, L.ch*k);
      ctx.restore();
      ctx.imageSmoothingEnabled = false;
    }
    else if(a.kind === "slash"){
      /* Media luna en vez de las cinco barras planas de antes. El Viento
         Sacro y la Espada de la Victoria también pasan por aquí, así que
         ganan el tajo sin tocar nada suyo. */
      var o = origenTajo(a);
      ctx.save();
      ctx.translate(Math.round(o.x), Math.round(o.y));
      ctx.rotate(o.ang);
      barrido(a.w, a.h, a.color, clamp(1-al, 0, 1));
      ctx.restore();
    } else if(a.kind === "pool"){
      /* Charco: una mancha ovalada tumbada en el suelo, no un cuadrado, con
         motas girando por encima. Lo usan el Agua Bendita, las plumas del
         Ala Fantasma y las llamas, así que los tres ganan a la vez. */
      var r = a.r || 20;
      ctx.globalAlpha = Math.min(1, al*0.45);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.ellipse(Math.round(a.x), Math.round(a.y), r*0.95, r*0.62, 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, al*1.15);
      for(var q=0;q<12;q++){
        var ang = (q/12)*6.283 + a.t*1.7;
        var rr3 = r*(0.34 + 0.60*(((q*7)%5)/5));
        ctx.fillRect(Math.round(a.x+Math.cos(ang)*rr3)-2,
                     Math.round(a.y+Math.sin(ang)*rr3*0.66)-2, 4, 4);
      }
      ctx.globalAlpha=1;
    } else if(a.kind === "bolt"){
      ctx.globalAlpha=al;
      ctx.fillStyle=a.color;
      for(var s=0;s<7;s++)
        ctx.fillRect(Math.round(a.x)-3+((s%2)?6:-6), Math.round(a.y)-150+s*22, 6, 20);
      ctx.fillRect(a.x-a.r, a.y-6, a.r*2, 12);
      ctx.globalAlpha=1;
    } else if(a.kind === "flash"){
      ctx.globalAlpha=al*.55;
      ctx.fillStyle=a.color;
      var v2=view();
      ctx.fillRect(v2.x-v2.hw, v2.y-v2.hh, v2.hw*2, v2.hh*2);
      ctx.globalAlpha=1;
    } else if(a.kind === "lance"){
      /* La Lanceta congela el tiempo, así que el haz se dibuja como hielo:
         tres capas que se estrechan hacia dentro, esquirlas de escarcha a lo
         largo y una punta blanca que sale disparada. Antes eran dos barras
         planas y no se entendía qué hacía. */
      ctx.save(); ctx.translate(Math.round(a.x),Math.round(a.y)); ctx.rotate(a.ang);
      var L4 = a.w, H4 = a.h, t4 = clamp(1-al,0,1);
      var pun = Math.min(1, 0.15 + t4*3.4);          // la punta se dispara al salir
      var capas = 3, i4, f4, hh4;
      for(i4=0;i4<capas;i4++){
        f4 = i4/(capas-1);
        hh4 = H4*0.5*(1 - f4*0.70);
        ctx.globalAlpha = al*(0.28 + 0.60*f4);
        ctx.fillStyle = f4 > 0.6 ? "#FFFFFF" : a.color;
        ctx.fillRect(0, -hh4, L4*pun, hh4*2);
      }
      ctx.globalAlpha = al*0.85;
      ctx.fillStyle = "#DCF2FF";
      for(i4=0;i4<8;i4++){
        var u4 = (i4+0.5)/8, px4 = L4*pun*u4;
        var sh4 = H4*(0.30 + 0.50*Math.abs(Math.sin(u4*9 + a.t*9)));
        ctx.fillRect(Math.round(px4)-1, -sh4/2, 2, sh4);
      }
      ctx.globalAlpha = al;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(Math.round(L4*pun)-5, -H4*0.58, 5, H4*1.16);
      ctx.globalAlpha=1; ctx.restore();
    } else if(a.kind === "wave"){
      /* La Canción barre columnas enteras. Ahora son ondas de verdad: cada
         banda ondula y late en lugar de ser una barra recta. */
      var W3 = a.w, t3 = a.t, paso = 34;
      for(var y2=-450;y2<450;y2+=paso){
        var fase = y2*0.03 + t3*5;
        var lat = 0.45 + 0.40*Math.abs(Math.sin(fase));
        ctx.globalAlpha = al*0.85*lat;
        ctx.fillStyle = (((y2/paso)|0) & 1) ? "#F0E0FF" : a.color;
        for(var xx=-W3/2; xx<W3/2; xx+=10){
          var oy3 = Math.sin(xx*0.055 + fase)*7;
          var hh3 = 4 + 3*Math.cos(xx*0.055 + fase);
          ctx.fillRect(Math.round(a.x+xx), Math.round(a.y+y2+oy3), 10, Math.max(2, hh3));
        }
      }
      ctx.globalAlpha=1;
    } else if(a.kind === "blast"){
      ctx.globalAlpha=al;
      ctx.fillStyle=a.color;
      var rr=a.r*(1.2-al*.4);
      ctx.fillRect(a.x-rr, a.y-rr*.5, rr*2, rr);
      ctx.fillRect(a.x-rr*.5, a.y-rr, rr, rr*2);
      ctx.globalAlpha=1;
    }
  }

  /* ---------------- arranque / partida ---------------- */
  G.init = function(cv, scr){
    canvas = cv; ctx = cv.getContext("2d"); screenEl = scr;
    G.canvas = canvas; G.ctx = ctx;
    G.resize();
  };
  /* Resolución fija elegida por el jugador; si no hay ninguna, se usa la
     del elemento en pantalla. */
  var resFija = null;
  G.setResolucion = function(w, h){
    resFija = (w && h) ? {w:w, h:h} : null;
    G.resize();
    return resFija;
  };
  G.resolucion = function(){ return {w:canvas.width, h:canvas.height, fija:!!resFija}; };

  G.resize = function(){
    // puede llamarse antes de que exista el lienzo: en ese caso no hay nada
    // que medir todavía y la resolución elegida se aplica al arrancar
    if(!canvas || !screenEl) return;
    if(resFija){
      canvas.width = resFija.w;
      canvas.height = resFija.h;
    } else {
      var rect = screenEl.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio||1, 2);
      canvas.width = Math.max(320, Math.round(rect.width*dpr));
      canvas.height = Math.max(200, Math.round(rect.height*dpr));
    }
    /* El mundo visible es siempre el mismo ancho: subir la resolución no
       da ventaja, solo detalle. Sin tope arriba, para que en 4K se vea de
       verdad a 4K. */
    baseZoom = Math.max(0.40, canvas.width/860);
    zoom = baseZoom;
  };
  G.startRun = function(slots, stgKey){
    stageKey = stgKey; stage = V.STAGES[stageKey];
    players.length=0; foes.length=0; bullets.length=0; areas.length=0;
    gems.length=0; drops.length=0; parts.length=0; floats.length=0;
    runT=0; kills=0; runGold=0;
    waveMin=-1; spawnT=0; lightT=3; arcIdx=0; overflowGem=null; G.reaped=false;
    for(var i=0;i<slots.length;i++)
      if(slots[i].joined) makePlayer(i, slots[i], {x:0,y:0});
    cam.x=0; cam.y=0; zoom=baseZoom;
    G.state.running=true; G.state.paused=false; G.state.demo=false;
    // tanda inicial del mapa, como el "starting spawns" del original
    var n0 = (stage.mods && stage.mods.start) || 10;
    for(var q=0;q<n0;q++){
      var a0 = (q/n0)*6.283, d0 = 300;
      spawnFoe(stage.foes[0], Math.cos(a0)*d0, Math.sin(a0)*d0, 1);
    }
    say("Sobrevivid treinta minutos en " + stage.name + ".");
  };
  G.joinMid = function(slotIdx, slot){
    var anchor = alive()[0] || cam;
    var p = makePlayer(slotIdx, slot, anchor);
    var lead = players[0];
    for(var i=1;i<players.length;i++) if(players[i].lvl>lead.lvl) lead=players[i];
    for(var l=1;l<lead.lvl;l++){ p.lvl++; if(V.ui) V.ui.queueDraft(p); }
    p.next = Math.round(5 + p.lvl*3.2 + Math.pow(p.lvl,1.44));
    return p;
  };
  G.stopRun = function(){ G.state.running=false; };
  G.setStage = function(k){ stageKey=k; stage=V.STAGES[k]; if(V.world) V.world.reset(); };
  G.runGold = function(){ return runGold; };
  G.addGold = function(n){ runGold += n; };
  G.kills = function(){ return kills; };
  G.time = function(){ return runT; };
  /* adelantar el reloj de la cacería: lo usa la migración de anfitrión y
     también sirve para probar minutos concretos sin esperar media hora */
  G.setTime = function(t){ runT = t; waveMin = Math.floor(runT/60); };
  G.cam = cam;

  /* demo del menú: el páramo sigue vivo detrás */
  var demoT = 0;
  G.demoTick = function(dt){
    if(!stage) stage = V.STAGES[stageKey];
    demoT += dt;
    cam.x = Math.cos(demoT*.1)*240; cam.y = Math.sin(demoT*.08)*170;
    if(foes.length < 34 && Math.random() < .5){
      var a=rf(0,6.283), d=rf(340,520);
      spawnFoe(stage.foes[ri(0,2)], cam.x+Math.cos(a)*d, cam.y+Math.sin(a)*d);
    }
    rebuildHash();
    for(var i=foes.length-1;i>=0;i--){
      var f=foes[i];
      var dx=cam.x-f.x, dy=cam.y-f.y, dd=Math.hypot(dx,dy)||1;
      f.x+=dx/dd*f.speed*.45*dt; f.y+=dy/dd*f.speed*.45*dt;
      f.face = dx>0?1:-1;
      if(dd<50) foes.splice(i,1);
    }
    for(var p=parts.length-1;p>=0;p--){
      parts[p].x+=parts[p].vx*dt; parts[p].y+=parts[p].vy*dt; parts[p].life-=dt;
      if(parts[p].life<=0) parts.splice(p,1);
    }
    if(msgTime>0) msgTime-=dt;
  };
  /* ================= modo en línea ================= */

  G.expose = function(){
    return {players:players, foes:foes, bullets:bullets, gems:gems, drops:drops, areas:areas};
  };

  // partida en línea vista por el anfitrión: un jugador por peer conectado
  G.startOnlineHost = function(peers, stgKey){
    stageKey = stgKey; stage = V.STAGES[stageKey];
    if(V.world) V.world.reset();
    players.length=0; foes.length=0; bullets.length=0; areas.length=0;
    gems.length=0; drops.length=0; parts.length=0; floats.length=0;
    runT=0; kills=0; runGold=0;
    waveMin=-1; spawnT=0; lightT=3; arcIdx=0; overflowGem=null; G.reaped=false;
    for(var i=0;i<peers.length;i++){
      var p = makePlayer(i, {hero:V.net.heroOf(peers[i]), input:"kb1"}, {x:0,y:0});
      p.netPeer = peers[i];
    }
    cam.x=0; cam.y=0; zoom=baseZoom;
    G.state.running=true; G.state.paused=false; G.state.demo=false;
    say("Cacería en línea: " + peers.length + " en el páramo.");
  };

  var AREA_COLOR = {slash:"#C2263A", pool:"#7CC6FF", bolt:"#FFE066", flash:"#C08BEF",
    lance:"#7CC6FF", wave:"#C08BEF", blast:"#FF8A3C", aura:"#E5B95C"};

  G.startGuest = function(){
    players.length=0; foes.length=0; bullets.length=0; areas.length=0;
    gems.length=0; drops.length=0; parts.length=0; floats.length=0;
    G.state.running=true; G.state.paused=false; G.state.demo=false;
    runT=0; runGold=0; kills=0;
  };

  // el invitado no simula: interpola lo recibido y predice solo su personaje
  G.guestUpdate = function(dt){
    var R = V.net.remote, i;
    runT = R.runT; runGold = R.gold;

    var byPeer = {};
    for(i=0;i<players.length;i++) if(players[i].netPeer) byPeer[players[i].netPeer] = players[i];
    players.length = 0;
    for(i=0;i<R.players.length;i++){
      var rp = R.players[i];
      var p = byPeer[rp.peer];
      if(!p) p = {netPeer:rp.peer, x:rp.x, y:rp.y, r:11, walk:0, aimx:1, aimy:0,
        weapons:[], passives:{}, reviveProg:0, st:{}};
      var hero = V.HEROES[rp.hero] || V.HEROES.cazador;
      p.hero = rp.hero; p.spr = hero.spr; p.color = hero.color;
      p.down = rp.down; p.hurt = rp.hurt?0.15:0; p.iframe = rp.iframe?0.3:0;
      p.lvl = rp.lvl; p.xp = rp.xpFrac*100; p.next = 100;
      p.maxhp = 100; p.hp = rp.hpFrac*100;
      p.slot = i;
      if(rp.peer === V.net.me){
        var mv = V.ui ? V.ui.readMove({input:"kb1"}) : {mx:0,my:0};
        V.net.setInput(mv.mx, mv.my);
        var ml = Math.hypot(mv.mx, mv.my);
        if(ml > .05 && !rp.down){
          p.x += (mv.mx/ml)*(hero.speed||120)*dt;
          p.y += (mv.my/ml)*(hero.speed||120)*dt;
          p.walk += dt*10;
          p.aimx = mv.mx/ml; p.aimy = mv.my/ml;
          if(Math.abs(mv.mx) > .2) p.face = mv.mx>0?1:-1;
        }
        // reconciliación: se acerca a la verdad sin dar tirones
        var k = Math.min(1, dt*3.2);
        p.x += (rp.x-p.x)*k; p.y += (rp.y-p.y)*k;
        if(Math.hypot(rp.x-p.x, rp.y-p.y) > 200){ p.x=rp.x; p.y=rp.y; }
      } else {
        var k2 = Math.min(1, dt*14);
        p.x += (rp.x-p.x)*k2; p.y += (rp.y-p.y)*k2;
        p.face = rp.face; p.walk += dt*8;
      }
      players.push(p);
    }

    foes.length = 0;
    for(var id in R.foes){
      var e = R.foes[id];
      var kf = Math.min(1, dt*14);
      e.x += (e.tx-e.x)*kf; e.y += (e.ty-e.y)*kf;
      var def = V.FOES[e.type] || V.FOES.aldeano;
      foes.push({x:e.x, y:e.y, type:e.type, def:def, r:def.r,
        hit:e.hitF?.1:0, face:e.face, freeze:e.freezeF?1:0,
        hp:e.hpFrac, maxhp:1, dead:false, frame:(id|0)%4});
    }
    bullets.length = 0;
    for(var bid in R.bullets){
      var b = R.bullets[bid];
      var kb = Math.min(1, dt*18);
      b.x += (b.tx-b.x)*kb; b.y += (b.ty-b.y)*kb;
      bullets.push({x:b.x, y:b.y, spr:b.spr, rotA:b.rotA, r:b.r, rot:true});
    }
    gems.length = 0;
    for(i=0;i<R.gems.length;i++)
      gems.push({x:R.gems[i].x, y:R.gems[i].y, v:R.gems[i].tier>=2?12:(R.gems[i].tier?5:1), t:runT});
    drops.length = 0;
    for(i=0;i<R.drops.length;i++)
      drops.push({x:R.drops[i].x, y:R.drops[i].y,
        kind:(V.net && V.net.DROPK ? V.net.DROPK[R.drops[i].kind] : "oro") || "oro"});
    areas.length = 0;
    for(i=0;i<R.areas.length;i++){
      var a = R.areas[i];
      areas.push({x:a.x, y:a.y, r:a.r, w:a.r*2, h:a.r, ang:a.ang, kind:a.kind,
        life:a.life, max:1, color:AREA_COLOR[a.kind] || "#FFFFFF", t:runT});
    }

    for(var pa=parts.length-1;pa>=0;pa--){
      var pt=parts[pa];
      pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vx*=.9; pt.vy*=.9; pt.life-=dt;
      if(pt.life<=0) parts.splice(pa,1);
    }
    for(var fl=floats.length-1;fl>=0;fl--){
      floats[fl].y -= 26*dt; floats[fl].life -= dt*1.3;
      if(floats[fl].life<=0) floats.splice(fl,1);
    }
    if(msgTime>0) msgTime-=dt;
    if(shake>0) shake=Math.max(0,shake-dt*24);
    updateCamera(dt);
    if(V.ui) V.ui.sync();
  };

  // relevo de anfitrión: el nuevo arranca desde el último mundo que vio
  G.adoptFromRemote = function(R){
    foes.length = 0;
    for(var id in R.foes){
      var e = R.foes[id];
      var f = spawnFoe(e.type, e.x, e.y);
      if(f){ f.hp = f.maxhp * (e.hpFrac||1); }
    }
    bullets.length = 0; areas.length = 0;
    runT = R.runT; runGold = R.gold;
    waveMin = Math.floor(runT/60);   // el nuevo anfitrión retoma el minuto en curso
    arcIdx = 0;
    while(arcIdx < V.ARCANA_AT.length && runT >= V.ARCANA_AT[arcIdx]) arcIdx++;
    for(var i=0;i<players.length;i++){
      for(var j=0;j<R.players.length;j++)
        if(R.players[j].peer === players[i].netPeer){
          players[i].x = R.players[j].x; players[i].y = R.players[j].y;
          players[i].hp = players[i].maxhp * R.players[j].hpFrac;
          players[i].down = R.players[j].down;
        }
    }
    G.state.running = true;
  };

  G.update = update;
  G.render = render;
})();
