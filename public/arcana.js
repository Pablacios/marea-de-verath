/* Marea de Verrath — ARCANAS
   Las veintidós cartas del original, traídas a nuestro mundo. No suben
   números: cambian reglas. Se eligen en los minutos 11 y 21, y el resto de
   la cacería se juega con ellas puestas.

   Cada carta declara qué gancho usa. El motor llama a estas funciones en
   seis o siete puntos concretos; toda la lógica vive aquí para que el
   motor no se llene de casos particulares. */
(function(){
  "use strict";
  var V = window.V = window.V || {};
  var A = V.arc = {};

  /* ---------------- las cartas ---------------- */
  V.ARCANA = [
    {k:"juego",    r:"0",    name:"El Juego Roto",
     text:"La experiencia deja de contar. Las gemas estallan al tocarlas y todos los cofres traen al menos tres objetos."},
    {k:"gemelos",  r:"I",    name:"Los Gemelos",
     text:"Cada arma saca su reflejo: dispara doble."},
    {k:"requiem",  r:"II",   name:"Réquiem del Crepúsculo",
     text:"Lo que disparas estalla al agotarse. La maldición alimenta la explosión."},
    {k:"princesa", r:"III",  name:"Princesa Trágica",
     text:"Mientras caminas, tus armas recargan un tercio más rápido."},
    {k:"despertar",r:"IV",   name:"El Despertar",
     text:"+3 revividas. Cada una que gastes te deja más vida, armadura, daño, área y duración."},
    {k:"caos",     r:"V",    name:"Caos en la Noche Oscura",
     text:"La velocidad de los proyectiles sube y baja sola, entre la mitad y vez y media."},
    {k:"zarabanda",r:"VI",   name:"Zarabanda de Curación",
     text:"Curas el doble, y cada punto de vida que recuperas hiere a lo que tengas cerca."},
    {k:"hierro",   r:"VII",  name:"Voluntad de Hierro Azul",
     text:"Tus proyectiles rebotan tres veces y atraviesan un cuerpo más."},
    {k:"surco",    r:"VIII", name:"Surco Enloquecido",
     text:"Cada dos minutos, todo lo que hay en el suelo vuela hacia ti."},
    {k:"estirpe",  r:"IX",   name:"Estirpe Divina",
     text:"La armadura suma daño y devuelve golpes. Cuanta menos vida te queda, más pegas."},
    {k:"comienzo", r:"X",    name:"El Comienzo",
     text:"+1 proyectil en todas las armas, y +3 en el arma con la que empezaste."},
    {k:"perlas",   r:"XI",   name:"Vals de Perlas",
     text:"Tus proyectiles rebotan en los bordes de la pantalla."},
    {k:"limites",  r:"XII",  name:"Fuera de los Límites",
     text:"Lo que muere congelado estalla. Los relojes de arena aparecen más a menudo."},
    {k:"estacion", r:"XIII", name:"Estación Perversa",
     text:"Experiencia, suerte, oro y maldición se duplican por rachas."},
    {k:"carcel",   r:"XIV",  name:"Cárcel de Cristal",
     text:"Tus proyectiles congelan de vez en cuando."},
    {k:"disco",    r:"XV",   name:"Disco de Oro",
     text:"El oro cura: cada moneda que recoges te devuelve vida."},
    {k:"tajo",     r:"XVI",  name:"El Tajo",
     text:"Todas tus armas pueden hacer crítico, y el crítico pega el doble."},
    {k:"cuadro",   r:"XVII", name:"El Cuadro Perdido",
     text:"La duración de tus armas oscila sola, de la mitad al triple."},
    {k:"ilusiones",r:"XVIII",name:"Bugalú de Ilusiones",
     text:"El área de tus armas oscila sola, de tres cuartos a vez y media."},
    {k:"corazon",  r:"XIX",  name:"Corazón de Fuego",
     text:"Ardes: un anillo de fuego te rodea, y el fuego que ya llevas pega más."},
    {k:"santuario",r:"XX",   name:"Santuario Silencioso",
     text:"+3 relanzar, descartar y desterrar. Y un hueco más de arma."},
    {k:"astro",    r:"XXI",  name:"Astronomía de Sangre",
     text:"Cada golpe que recibes puede soltar algo al suelo, y lo que recoges hiere a lo que te rodea."}
  ];
  V.ARCANA_BY_KEY = {};
  for(var i=0;i<V.ARCANA.length;i++) V.ARCANA_BY_KEY[V.ARCANA[i].k] = V.ARCANA[i];

  /* los minutos en que se elige carta, como en el original */
  V.ARCANA_AT = [660, 1260];

  A.has = function(p,k){ return !!(p && p.arcana && p.arcana[k]); };
  A.list = function(p){
    var out = [];
    if(!p || !p.arcana) return out;
    for(var k in p.arcana) if(V.ARCANA_BY_KEY[k]) out.push(V.ARCANA_BY_KEY[k]);
    return out;
  };

  /* ---------------- oscilaciones ----------------
     Tres cartas hacen que una estadística suba y baje en ciclos de diez
     segundos. Se calculan del reloj de la partida, así que todos los
     jugadores de una sala ven lo mismo sin mandarse nada. */
  function wave10(t){ return Math.sin(t * (6.283/10)); }

  /* ---------------- gancho: estadísticas de un arma ----------------
     Se llama al final de weaponStats, con el objeto ya calculado. */
  A.weapon = function(p, w, s, t){
    if(!p.arcana) return s;
    var a = p.arcana;
    if(a.gemelos && s.count !== undefined) s.count = Math.max(1, s.count*2);
    if(a.comienzo && s.count !== undefined){
      var esInicial = (w.key === p.startWeapon) ||
        (w.def.evo && w.def.from === p.startWeapon);
      s.count += esInicial ? 3 : 1;
    }
    if(a.princesa && p.moving) s.cd = Math.max(.05, s.cd*0.66);
    if(a.caos && s.speed !== undefined) s.speed *= 1 + 0.5*wave10(t);
    if(a.cuadro) s.duration *= 1 + (wave10(t) > 0 ? 2*wave10(t) : 0.5*wave10(t));
    if(a.ilusiones) s.area *= 1 + (wave10(t) > 0 ? 0.5*wave10(t) : 0.25*wave10(t));
    if(a.hierro) s.pierce = (s.pierce||1) + 1;
    if(a.corazon && w.def.fire_kind === "fuego") s.dmg *= 1.5;
    return s;
  };

  /* ---------------- gancho: al crear un proyectil ---------------- */
  A.bullet = function(p, bl){
    if(!p.arcana) return;
    if(p.arcana.perlas || p.arcana.hierro) bl.bounce = 3;
    if(p.arcana.requiem) bl.arcBlast = true;
    if(p.arcana.carcel) bl.chill = 0.22;
    if(p.arcana.tajo) bl.critChance = (bl.critChance||0) + 0.20;
  };

  /* ---------------- gancho: daño ----------------
     Estirpe Divina: la armadura suma daño, y pegas más cuanta menos vida
     te queda. El Tajo dobla el crítico (el motor ya dobla una vez). */
  A.damage = function(p, dmg){
    if(!p || !p.arcana) return dmg;
    if(p.arcana.estirpe){
      dmg += (p.st.armor||0) * 2;
      var falta = 1 - (p.hp/p.maxhp);
      dmg *= 1 + falta*0.8;
    }
    return dmg;
  };
  A.critMul = function(p){ return (p && p.arcana && p.arcana.tajo) ? 4 : 2; };

  /* ---------------- gancho: experiencia ---------------- */
  A.xp = function(p, v){
    if(p.arcana && p.arcana.juego) return 0;
    if(p.arcana && p.arcana.estacion && A.season(p)) return v*2;
    return v;
  };
  /* Estación Perversa va por rachas de veinte segundos sí, veinte no */
  A.season = function(p){
    if(!(p.arcana && p.arcana.estacion)) return false;
    return (Math.floor(V.game.time()/20) % 2) === 0;
  };
  A.luck = function(p, l){ return A.season(p) ? l*2 : l; };

  /* ---------------- gancho: curación ---------------- */
  A.heal = function(p, amount, hitNear){
    if(p.arcana && p.arcana.zarabanda){
      amount *= 2;
      if(hitNear) hitNear(amount);
    }
    return amount;
  };

  /* ---------------- gancho: recibir un golpe ---------------- */
  A.hurt = function(p, dmg, api){
    if(!p.arcana) return;
    if(p.arcana.estirpe && (p.st.armor||0) > 0)
      api.ring(p.x, p.y, 78, (p.st.armor||0)*6, p);          // devuelve el golpe
    if(p.arcana.astro && Math.random() < 0.34)
      api.drop(p.x + api.rf(-30,30), p.y + api.rf(-30,30));
  };

  /* ---------------- gancho: recoger algo del suelo ---------------- */
  A.pickup = function(p, dr, api){
    if(!p.arcana) return;
    if(p.arcana.disco && dr.kind === "oro") api.heal(p, Math.min(30, dr.v));
    if(p.arcana.astro) api.ring(p.x, p.y, 96, 40*(p.st.might||1), p);
  };

  /* ---------------- gancho: cada fotograma ---------------- */
  A.tick = function(p, dt, api){
    if(!p.arcana) return;
    var a = p.arcana;

    if(a.corazon){                     // anillo de fuego permanente
      p.arcFire = (p.arcFire||0) - dt;
      if(p.arcFire <= 0){
        p.arcFire = 0.9;
        api.area(p.x, p.y, 132*(p.st.area||1), 26*(p.st.might||1), "#FF8A3C", p);
      }
    }
    if(a.surco){                       // cada dos minutos lo atrae todo
      p.arcGroove = (p.arcGroove||0) - dt;
      if(p.arcGroove <= 0){
        p.arcGroove = 120;
        api.gather(p);
      }
    }
  };

  /* ---------------- topes que cambian las cartas ---------------- */
  A.weaponSlots = function(p){ return A.has(p,"santuario") ? 7 : 6; };
  A.chestMin = function(p){ return A.has(p,"juego") ? 3 : 1; };

  /* ---------------- al recibir una carta ---------------- */
  A.give = function(p, k){
    p.arcana = p.arcana || {};
    if(p.arcana[k]) return false;
    p.arcana[k] = 1;
    if(k === "santuario"){ p.rerolls += 3; p.skips += 3; p.banishes += 3; }
    if(k === "despertar"){ p.arcAwake = 0; }
    V.game.recalc(p);
    return true;
  };

  /* Se aplica dentro de recalc: lo que las cartas cambian de plantilla. */
  A.stats = function(p, st){
    if(!p.arcana) return;
    if(p.arcana.despertar){
      st.revival += 3;
      var n = p.arcAwake || 0;                  // acumulado por cada revivida
      st.maxHealth *= 1 + n*0.10;
      st.armor     += n;
      st.might     *= 1 + n*0.05;
      st.area      *= 1 + n*0.05;
      st.duration  *= 1 + n*0.05;
      st.speed     *= 1 + n*0.05;
    }
    if(p.arcana.estacion && A.season(p)){
      st.growth *= 2; st.luck *= 2; st.greed *= 2; st.curse *= 2;
    }
  };

  /* ---------------- tres cartas para elegir ---------------- */
  A.offer = function(p){
    var pool = [];
    for(var i=0;i<V.ARCANA.length;i++){
      var c = V.ARCANA[i];
      if(p.arcana && p.arcana[c.k]) continue;
      pool.push(c);
    }
    for(var j=pool.length-1;j>0;j--){
      var t = Math.floor(Math.random()*(j+1)), tmp = pool[j];
      pool[j] = pool[t]; pool[t] = tmp;
    }
    return pool.slice(0, 3);
  };
})();
