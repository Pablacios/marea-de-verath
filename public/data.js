/* Marea de Verrath — héroes, pasivos, enemigos y mapas */
(function(){
  "use strict";
  var V = window.V = window.V || {};

  /* ================= HÉROES ================= */
  V.HEROES = {
    cazador:{ name:"El Cazador", spr:"h_cazador", color:"#8E1F2F", glyph:"†",
      role:"Látigo y abrigo curtido. El arma más fiable del páramo.",
      hp:135, speed:112, weapon:"latigo",
      mods:{ might:1.0 }, grow:[{stat:"might", per:10, step:0.10}],
      note:"+10% de daño cada 10 niveles" },
    vicaria:{ name:"La Vicaria", spr:"h_vicaria", color:"#C0A24E", glyph:"✚",
      role:"Cruces que vuelven a su mano. Bendecida con suerte.",
      hp:120, speed:116, weapon:"cruz",
      mods:{ luck:1.25 }, grow:[{stat:"luck", per:5, step:0.05}],
      note:"+25% de suerte, y +5% más cada 5 niveles" },
    doctor:{ name:"Doctor de la Peste", spr:"h_doctor", color:"#9AA88C", glyph:"◉",
      role:"Riega el suelo de plaga. Recarga más rápida que nadie.",
      hp:115, speed:114, weapon:"agua",
      mods:{ cooldown:0.90 }, grow:[{stat:"cooldown", per:10, step:-0.05}],
      note:"−10% de recarga, y −5% más cada 10 niveles" },
    bestia:{ name:"Hijo de la Bestia", spr:"h_bestia", color:"#7A3A2E", glyph:"≈",
      role:"Sangre bestial: rápido, feroz y con el ajo pegado a la piel.",
      hp:130, speed:140, weapon:"ajo",
      mods:{ moveSpeed:1.1 }, grow:[{stat:"moveSpeed", per:10, step:0.05}],
      note:"+10% de velocidad, y +5% más cada 10 niveles" },
    astronoma:{ name:"La Astrónoma", spr:"h_astronoma", color:"#8FA8FF", glyph:"✦",
      role:"Lee el cielo y lo deja caer. Área amplia, cuerpo frágil.",
      hp:105, speed:118, weapon:"rayos",
      mods:{ area:1.15 }, grow:[{stat:"area", per:10, step:0.10}],
      note:"+15% de área, y +10% más cada 10 niveles" },
    verdugo:{ name:"El Ripper", spr:"h_verdugo", color:"#B03040", glyph:"⌁",
      role:"Cuchillas y niebla de gas. Poco alcance, mucho estrago.",
      hp:150, speed:104, weapon:"daga",
      mods:{ might:1.15, cooldown:1.08 },
      grow:[{stat:"might", per:15, step:0.10},{stat:"armor", per:10, step:1}],
      note:"+15% de daño; +10% más cada 15 niveles y +1 de armadura cada 10" },

    /* ---- los diez nuevos ---- */
    viuda:{ name:"La Viuda", spr:"h_viuda", color:"#7A2E52", glyph:"†",
      role:"Canta por los suyos. Lo que empieza, dura.",
      hp:120, speed:114, weapon:"cancion",
      mods:{ duration:1.10 }, grow:[{stat:"duration", per:5, step:0.10}],
      note:"+10% de duración, y +10% más cada 5 niveles" },
    farolero:{ name:"El Farolero", spr:"h_farolero", color:"#F2C46A", glyph:"◉",
      role:"Enciende las calles y lo que se esconde en ellas.",
      hp:120, speed:112, weapon:"varafuego",
      mods:{ area:1.05 }, grow:[{stat:"area", per:5, step:0.10}],
      note:"+10% de área cada 5 niveles" },
    sepulturero:{ name:"El Sepulturero", spr:"h_sepulturero", color:"#6E4A2E", glyph:"▣",
      role:"Cava rápido porque siempre hay prisa. Aguanta lo indecible.",
      hp:165, speed:100, weapon:"hacha",
      mods:{ armor:1 }, grow:[{stat:"might", per:5, step:0.05}],
      note:"+1 de armadura y +5% de daño cada 5 niveles" },
    nina:{ name:"La Niña Pálida", spr:"h_nina", color:"#C2263A", glyph:"✧",
      role:"No debería estar aquí. La suerte la sigue como un perro.",
      hp:100, speed:128, weapon:"gatos",
      mods:{ luck:1.15 }, grow:[{stat:"luck", per:5, step:0.10},{stat:"growth", per:5, step:0.05}],
      note:"+10% de suerte y +5% de experiencia cada 5 niveles" },
    coleccionista:{ name:"El Coleccionista", spr:"h_coleccionista", color:"#E5B95C", glyph:"♛",
      role:"Cada muerto es una moneda. Lleva la cuenta.",
      hp:115, speed:116, weapon:"pistola",
      mods:{ greed:1.30 }, grow:[{stat:"greed", per:5, step:0.20},{stat:"amount", per:20, step:1}],
      note:"+30% de oro, +20% más cada 5 niveles, +1 proyectil al 20" },
    penitente:{ name:"El Penitente", spr:"h_penitente", color:"#8A8C9E", glyph:"✚",
      role:"Camina con cadenas y no se queja. Cuesta tumbarlo.",
      hp:170, speed:96, weapon:"laurel",
      mods:{ armor:2 }, grow:[{stat:"armor", per:5, step:1},{stat:"recovery", per:10, step:0.20}],
      note:"+2 de armadura, +1 más cada 5 niveles" },
    cantora:{ name:"La Cantora", spr:"h_cantora", color:"#C08BEF", glyph:"≋",
      role:"Su voz no deja descansar a nadie. Recarga como nadie.",
      hp:110, speed:118, weapon:"biblia",
      mods:{ cooldown:0.95 }, grow:[{stat:"cooldown", per:5, step:-0.04}],
      note:"−5% de recarga, y −4% más cada 5 niveles" },
    alquimista:{ name:"El Alquimista", spr:"h_alquimista", color:"#B6E06A", glyph:"◍",
      role:"Aprende de cada cadáver. Sube de nivel antes que nadie.",
      hp:115, speed:114, weapon:"varita",
      mods:{ growth:1.10 }, grow:[{stat:"growth", per:5, step:0.08}],
      note:"+10% de experiencia, y +8% más cada 5 niveles" },
    titiritero:{ name:"El Titiritero", spr:"h_titiritero", color:"#D8B24E", glyph:"⋔",
      role:"Mueve los hilos. Lo que lanza vuela más rápido cada vez.",
      hp:120, speed:116, weapon:"trazarunas",
      mods:{ speed:1.10 }, grow:[{stat:"speed", per:5, step:0.10}],
      note:"+10% de velocidad de proyectil, y +10% más cada 5 niveles" },
    cuerva:{ name:"La Hija del Cuervo", spr:"h_cuerva", color:"#3A3448", glyph:"➶",
      role:"Ligera y carroñera: llega antes y se lleva más.",
      hp:105, speed:132, weapon:"peachone",
      mods:{ magnet:1.20 }, grow:[{stat:"moveSpeed", per:5, step:0.05},{stat:"magnet", per:5, step:0.10}],
      note:"+20% de imán, y +5% de velocidad y +10% de imán cada 5 niveles" }
  };
  V.HERO_KEYS = Object.keys(V.HEROES);
  /* Héroes con retrato pintado a mano en la carpeta arte/ */
  V.RETRATOS = {viuda:1, farolero:1, sepulturero:1, nina:1, coleccionista:1,
                penitente:1, cantora:1, alquimista:1, titiritero:1, cuerva:1,
                cazador:1, vicaria:1, doctor:1, bestia:1, astronoma:1, verdugo:1};
  /* Héroes cuya hoja traía la caminata dibujada, fotograma a fotograma. */
  V.CAMINATAS = {cazador:1, vicaria:1, doctor:1, bestia:1, astronoma:1, verdugo:1};

  /* Pose pintada de cuerpo entero para la partida. Se carga aparte; hasta
     que llega, el héroe se dibuja con su sprite de píxeles, así que el
     juego arranca al instante aunque la red vaya lenta. */
  /* Tres vistas por héroe —de frente, de espaldas y de lado— recortadas de
     sus hojas. Si alguna falta, se usa la pose lateral y no pasa nada. */
  V.HEROART = {};
  (function(){
    /* Solo la vista de lado. Desde que los héroes van siempre de perfil, las
       poses de frente y de espaldas no se dibujan nunca: pedirlas era
       descargar treinta y dos imágenes para nada y llenar la consola de
       errores por las que ni siquiera existen. */
    var VISTAS = ["lado"];
    function carga(key, vista, ruta, destino){
      var img = new Image();
      img.decoding = "async";
      img.onload = function(){
        V.HEROART[key] = V.HEROART[key] || {};
        V.HEROART[key][vista] = img;
      };
      img.src = ruta;
    }
    for(var k in V.RETRATOS){
      for(var i=0;i<VISTAS.length;i++) carga(k, VISTAS[i], "arte/v_"+k+"_"+VISTAS[i]+".webp");
      // los que tienen tira de pasos no llevan pose suelta: pedirla solo
      // dejaba un 404 por héroe en la consola
      if(!V.CAMINATAS[k]) carga(k, "pose", "arte/pose_"+k+".webp");
    }
  })();

  /* Tiras de caminata: una fila de celdas cuadradas por vista. El motor
     deduce cuántos pasos hay dividiendo el ancho entre el alto. */
  V.HEROCAM = {};
  (function(){
    // igual aquí: de perfil y punto
    var VISTAS = ["lado"];
    for(var k in V.CAMINATAS){
      for(var i=0;i<VISTAS.length;i++) (function(key, vista){
        var img = new Image();
        img.decoding = "async";
        img.onload = function(){
          V.HEROCAM[key] = V.HEROCAM[key] || {};
          V.HEROCAM[key][vista] = img;
        };
        img.src = "arte/c_"+key+"_"+vista+".webp";
      })(k, VISTAS[i]);
    }
  })();
  V.tiraHeroe = function(key, vista){
    var t = V.HEROCAM[key];
    return t ? (t[vista] || null) : null;
  };

  /* ---------------- caminata de perfil, izquierda y derecha ----------------
     Hojas nuevas: ocho pasos por lado, cada lado con su propio dibujo en vez
     de espejar uno solo. Las celdas NO son cuadradas —cada héroe tiene el
     ancho que necesita— así que el número de pasos es fijo, ocho, y el ancho
     de celda sale de dividir la tira entre ocho. Los pies van apoyados
     siempre a la misma altura de la celda, que es lo que evita que el
     personaje bote al animarse. */
  V.HEROLADO = {};
  V.LADO_PASOS = 8;
  (function(){
    var CON_LADO = ["cazador", "vicaria", "doctor", "bestia"];
    for(var i=0;i<CON_LADO.length;i++){
      var lados = ["izq", "der"];
      for(var j=0;j<2;j++) (function(key, lado){
        var img = new Image();
        img.decoding = "async";
        img.onload = function(){
          V.HEROLADO[key] = V.HEROLADO[key] || {};
          V.HEROLADO[key][lado] = img;
        };
        img.src = "arte/h_" + key + "_" + lado + ".webp";
      })(CON_LADO[i], lados[j]);
    }
  })();
  V.ladoHeroe = function(key, lado){
    var h = V.HEROLADO[key];
    return h ? (h[lado] || null) : null;
  };

  /* ---------------- arboleda pintada ----------------
     Ocho árboles dibujados, repartidos por distrito. Se dibujan a su
     tamaño natural y sin suavizar, que es pixel art como el resto del
     decorado. Cuando entra uno nuevo hay que tirar la caché de trozos del
     mundo: si no, los trozos ya dibujados se quedan sin él. */
  V.ARBOLES = {};
  /* Solo los lúgubres: los dos robles oscuros, el pino y el seco. El
     otoñal, la acacia, el cerezo y el manzano se quedaron fuera —eran los
     que rompían el tono del juego. Una clave repetida sale más veces, que
     es como se pesa el reparto sin más código. */
  V.ARBOL_POR_ESCENARIO = {
    distrito: [2, 6, 1, 9],      // roble, roble doble, pino y algún seco
    bosque:   [9, 9, 2, 1],      // el Bosque del Ahorcado va casi todo seco
    catedral: [1, 9, 9, 2]       // pino y seco, que es lo que pega al mármol
  };
  (function(){
    // solo se descargan los que se usan
    [1, 2, 6, 9].forEach(function(n){
      var img = new Image();
      img.decoding = "async";
      img.onload = function(){
        V.ARBOLES[n] = img;
        if(V.olvidaArboles) V.olvidaArboles();
        if(V.world && V.world.reset) V.world.reset();
      };
      img.src = "arte/arbol_" + n + ".webp";
    });
  })();
  V.arbol = function(n){ return V.ARBOLES[n] || null; };

  /* ---------------- enemigos pintados ----------------
     Un dibujo por enemigo, de sus hojas. Mientras no llega, se dibuja el
     sprite de píxeles, así que la partida arranca sin esperar a la red. */
  V.BICHOS = {};
  (function(){
    var claves = ["aldeano","sabueso","cuervo","bruto","ahorcado","lobo","monja",
                  "gargola","elite","segadora","osario","murcielago","vampirillo",
                  "encapuchado","cenagoso","zarzal","devoradora","centinela",
                  "heraldo","forjado"];
    for(var i=0;i<claves.length;i++) (function(k){
      var img = new Image();
      img.decoding = "async";
      img.onload = function(){ V.BICHOS[k] = img; };
      img.src = "arte/e_" + k + ".webp";
    })(claves[i]);
  })();
  V.bicho = function(k){ return V.BICHOS[k] || null; };

  /* ---------------- elementos de mapa dibujados ----------------
     Baldosas de suelo y mobiliario que vienen en archivo. En cuanto llega
     uno hay que tirar el mobiliario montado y la caché de trozos del
     mundo, o los trozos ya pintados se quedan con la versión anterior. */
  V.MAPART = {};
  (function(){
    var piezas = ["tex_piedra","tex_ladrillo","p_lapida","p_muro",
                  "p_muro_fin","p_muro_v","p_matorral","p_farola"];
    for(var i=0;i<piezas.length;i++) (function(n){
      var img = new Image();
      img.decoding = "async";
      img.onload = function(){
        V.MAPART[n] = img;
        if(V.tex && V.tex.olvida) V.tex.olvida();
        if(V.olvidaProps) V.olvidaProps();
        if(V.olvidaArboles) V.olvidaArboles();
        if(V.world && V.world.reset) V.world.reset();
      };
      img.src = "arte/" + n + ".webp";
    })(piezas[i]);
  })();
  V.mapArt = function(n){ return V.MAPART[n] || null; };

  /* La casa dibujada. Se tiñe por distrito en props64, que es donde se
     arma el mobiliario. */
  /* Animación del látigo: ocho fotogramas en fila, celdas de 272x160, con el
     mango siempre en el mismo punto de la celda —(14,112)— para que al
     animarse no baile. El dibujo alcanza 251 px desde el mango; el motor lo
     escala al alcance que tenga el arma en ese momento, así que sube con las
     mejoras de área sin tocar nada aquí. */
  V.LATIGO = {img:null, n:8, cw:272, ch:160, ax:14, ay:112, alcance:251};
  (function(){
    var img = new Image();
    img.decoding = "async";
    img.onload = function(){ V.LATIGO.img = img; };
    img.src = "arte/w_latigo.webp";
  })();

  V.CASA = null;
  (function(){
    var img = new Image();
    img.decoding = "async";
    img.onload = function(){
      V.CASA = img;
      if(V.olvidaCasa) V.olvidaCasa();
      if(V.world && V.world.reset) V.world.reset();
    };
    img.src = "arte/casa.webp";
  })();
  /* Hacia dónde mira la vista de lado tal como vino dibujada en la hoja.
     La mayoría están de perfil hacia la izquierda; dos miran a la derecha.
     El motor voltea la figura solo cuando la marcha no coincide con esto,
     así que caminar a la derecha siempre se ve mirando a la derecha. */
  V.MIRA_LADO = {
    alquimista:-1, cantora:-1, cuerva:1,  farolero:-1, nina:-1,
    penitente:-1,  sepulturero:-1, titiritero:1, viuda:-1, coleccionista:-1,
    /* de las hojas nuevas se tomó la banda DERECHA, así que ya miran allá */
    cazador:1, vicaria:1, doctor:1, bestia:1, astronoma:1, verdugo:1
  };
  V.miraLado = function(key){ return V.MIRA_LADO[key] === 1 ? 1 : -1; };

  /* Devuelve la vista que toca, con reserva si esa no existe */
  V.vistaHeroe = function(key, vista){
    var h = V.HEROART[key];
    if(!h) return null;
    return h[vista] || h.lado || h.pose || h.frente || h.espalda || null;
  };

  V.HERO_SCALE = 1.9;
  /* Enemigos y mobiliario suben con él para que las proporciones cuadren.
     Solo cambia el dibujo: los radios de colisión siguen igual, así que el
     juego se comporta exactamente como antes. */
  V.FOE_SCALE  = 1.55;
  V.PROP_SCALE = 1.45;

  /* ================= RESOLUCIONES =================
     Resolución interna de dibujado, independiente del tamaño de la caja en
     la página. Cuanto más alta, más fino y más grande se ve todo, porque
     el mundo visible se mantiene constante. Las veinte más usadas, de 240p
     a 4K, con tres panorámicas para monitores anchos. */
  V.RESOLUCIONES = [
    {n:"Automática (tu pantalla)", w:0, h:0},
    {n:"426 × 240 · 240p",         w:426,  h:240},
    {n:"640 × 360 · 360p",         w:640,  h:360},
    {n:"854 × 480 · 480p",         w:854,  h:480},
    {n:"960 × 540 · qHD",          w:960,  h:540},
    {n:"1024 × 576",               w:1024, h:576},
    {n:"1152 × 648",               w:1152, h:648},
    {n:"1280 × 720 · 720p",        w:1280, h:720},
    {n:"1366 × 768",               w:1366, h:768},
    {n:"1600 × 900 · HD+",         w:1600, h:900},
    {n:"1920 × 1080 · 1080p",      w:1920, h:1080},
    {n:"2048 × 1152",              w:2048, h:1152},
    {n:"2560 × 1080 · ultrapanorámica", w:2560, h:1080},
    {n:"2560 × 1440 · 1440p (2K)", w:2560, h:1440},
    {n:"2880 × 1620",              w:2880, h:1620},
    {n:"3440 × 1440 · ultrapanorámica 2K", w:3440, h:1440},
    {n:"3200 × 1800",              w:3200, h:1800},
    {n:"3840 × 1600 · ultrapanorámica ancha", w:3840, h:1600},
    {n:"3840 × 2160 · 4K",         w:3840, h:2160},
    {n:"4096 × 2160 · 4K DCI",     w:4096, h:2160}
  ];

  /* ================= PASIVOS =================
     Réplica del modelo de estadísticas: cada uno toca una estadística global
     que luego multiplica a todas las armas. */
  V.PASSIVES = {
    espinaca:  {name:"Sangre de Hierro", glyph:"◆", ico:"p_espinaca", color:"#C2263A", max:5, stat:"might",     step:0.10, text:"+10% de daño"},
    coraza:    {name:"Coraza",           glyph:"▣", ico:"p_coraza", color:"#8A8C9E", max:5, stat:"armor",     step:1,    text:"−1 de daño recibido"},
    corazon:   {name:"Corazón Hueco",    glyph:"♥", ico:"p_corazon", color:"#B03040", max:5, stat:"maxHealth", step:0.20, text:"+20% de vida máxima"},
    pomarola:  {name:"Hierba de Sangre", glyph:"✚", ico:"p_pomarola", color:"#5FBF6A", max:5, stat:"recovery",  step:0.25, text:"+0,25 de vida por segundo"},
    tomo:      {name:"Tomo Vacío",       glyph:"▭", ico:"p_tomo", color:"#8FA8FF", max:5, stat:"cooldown",  step:-0.08,text:"−8% de recarga"},
    candelabro:{name:"Candelabro",       glyph:"◎", ico:"p_candelabro", color:"#E5C34A", max:5, stat:"area",      step:0.10, text:"+10% de área"},
    brazal:    {name:"Brazal",           glyph:"➤", ico:"p_brazal", color:"#C9CEDC", max:5, stat:"speed",     step:0.10, text:"+10% de velocidad de proyectil"},
    encantador:{name:"Encantador",       glyph:"∞", ico:"p_encantador", color:"#C08BEF", max:5, stat:"duration",  step:0.10, text:"+10% de duración"},
    duplicador:{name:"Duplicador",       glyph:"⁝", ico:"p_duplicador", color:"#FFE066", max:2, stat:"amount",    step:1,    text:"+1 proyectil"},
    alas:      {name:"Alas",             glyph:"⇈", ico:"p_alas", color:"#E8EEFF", max:5, stat:"moveSpeed", step:0.10, text:"+10% de velocidad"},
    iman:      {name:"Piedra Imán",      glyph:"◌", ico:"p_iman", color:"#46E0C8", max:5, stat:"magnet",    step:0.25, text:"+25% de radio de recogida"},
    trebol:    {name:"Trébol",           glyph:"✧", ico:"p_trebol", color:"#7CC6FF", max:5, stat:"luck",      step:0.10, text:"+10% de suerte"},
    corona:    {name:"Corona",           glyph:"♛", ico:"p_corona", color:"#E5B95C", max:5, stat:"growth",    step:0.08, text:"+8% de experiencia"},
    mascara:   {name:"Máscara de Piedra",glyph:"☗", ico:"p_mascara", color:"#9A7220", max:5, stat:"greed",     step:0.10, text:"+10% de oro"},
    calavera:  {name:"Calavera Maldita", glyph:"☠", ico:"p_calavera", color:"#A9B6D6", max:5, stat:"curse",     step:0.10, text:"+10% de enemigos… y de recompensa"},
    tiramisu:  {name:"Reliquia",         glyph:"❂", ico:"p_reliquia", color:"#FFD36B", max:2, stat:"revival",   step:1,    text:"Revives una vez más"},

    /* La caja lo sube todo, pero atrae más noche: es el trato del original. */
    torrona:   {name:"Caja de Torrona",  glyph:"▣", ico:"p_torrona", color:"#C08BEF", max:5,
                stats:{might:0.04, area:0.04, speed:0.04, duration:0.04, curse:0.04},
                text:"+4% de daño, área, velocidad y duración… y +4% de maldición"},

    /* Los cuatro objetos mudos. Por sí solos no hacen nada; emparejados y
       al máximo son lo único que despierta la Lanceta y el Laurel. */
    plata:     {name:"Anillo de Plata",  glyph:"◌", ico:"p_plata", color:"#C9CEDC", max:5, stats:{}, mute:true,
                text:"No hace nada solo. Con el Anillo de Oro, al máximo, despierta la Lanceta"},
    oro:       {name:"Anillo de Oro",    glyph:"◌", ico:"p_oro", color:"#E5B95C", max:5, stats:{}, mute:true,
                text:"No hace nada solo. Con el Anillo de Plata, al máximo, despierta la Lanceta"},
    metaizq:   {name:"Metaglio Izquierdo",glyph:"◈", ico:"p_metaizq", color:"#8FA8FF", max:5, stats:{}, mute:true,
                text:"No hace nada solo. Con su gemelo, al máximo, despierta el Laurel"},
    metader:   {name:"Metaglio Derecho", glyph:"◈", ico:"p_metader", color:"#C2263A", max:5, stats:{}, mute:true,
                text:"No hace nada solo. Con su gemelo, al máximo, despierta el Laurel"}
  };
  V.PASSIVE_KEYS = Object.keys(V.PASSIVES);

  /* ================= ENEMIGOS ================= */
  V.FOES = {
    aldeano:  {hp:12,  speed:46, dmg:7,  r:11, spr:"f_aldeano", xp:1, gold:.06},
    sabueso:  {hp:18,  speed:92, dmg:10, r:11, spr:"f_sabueso", xp:1, gold:.06},
    cuervo:   {hp:14,  speed:108,dmg:9,  r:10, spr:"f_cuervo",  xp:1, gold:.05, erratic:true},
    bruto:    {hp:110, speed:50, dmg:20, r:14, spr:"f_bruto",   xp:4, gold:.14},
    ahorcado: {hp:34,  speed:58, dmg:13, r:12, spr:"f_ahorcado",xp:2, gold:.08},
    lobo:     {hp:44,  speed:96, dmg:16, r:12, spr:"f_lobo",    xp:2, gold:.09},
    monja:    {hp:40,  speed:62, dmg:15, r:11, spr:"f_monja",   xp:2, gold:.09},
    gargola:  {hp:150, speed:56, dmg:24, r:14, spr:"f_gargola", xp:5, gold:.18},
    elite:    {hp:1500,speed:50, dmg:34, r:28, spr:"f_elite",   xp:70, gold:1, elite:true},
    /* ---- los diez nuevos, de las hojas pintadas ---- */
    osario:     {hp:26,  speed:70, dmg:12, r:11, spr:"f_aldeano", xp:2, gold:.08},
    murcielago: {hp:20,  speed:120,dmg:11, r:11, spr:"f_cuervo",  xp:1, gold:.06, erratic:true},
    vampirillo: {hp:10,  speed:132,dmg:7,  r:9,  spr:"f_cuervo",  xp:1, gold:.04, erratic:true},
    encapuchado:{hp:60,  speed:66, dmg:18, r:12, spr:"f_monja",   xp:3, gold:.11},
    cenagoso:   {hp:130, speed:42, dmg:22, r:15, spr:"f_bruto",   xp:5, gold:.16},
    zarzal:     {hp:90,  speed:18, dmg:26, r:16, spr:"f_bruto",   xp:3, gold:.12},
    devoradora: {hp:220, speed:34, dmg:30, r:18, spr:"f_gargola", xp:8, gold:.26},
    centinela:  {hp:75,  speed:74, dmg:20, r:12, spr:"f_monja",   xp:3, gold:.12},
    heraldo:    {hp:120, speed:80, dmg:24, r:13, spr:"f_gargola", xp:4, gold:.15},
    forjado:    {hp:180, speed:68, dmg:28, r:14, spr:"f_gargola", xp:6, gold:.20},
    /* la "luz": el equivalente a las antorchas y candelabros rompibles del
       mapa. Es un enemigo inmóvil y sin daño para reaprovechar colisiones. */
    luz:      {hp:1,   speed:0,  dmg:0,  r:12, spr:null,        xp:0, gold:0, light:true},
    segadora: {hp:999999,speed:120,dmg:9999,r:30,spr:"f_segadora",xp:0, gold:0, reaper:true}
  };

  /* ================= MAPAS =================
     Tres distritos góticos. Cada uno con su paleta, su decorado dibujado
     por celdas, su elenco de enemigos y su propio guion de oleadas. */

  function deco(g, cx, cy, C, n, stage){
    // dibuja el adorno de una celda; todo con rectángulos, sin curvas
    var x = cx*C, y = cy*C;
    stage.deco(g, x, y, C, n);
  }

  V.STAGES = {
    distrito:{
      name:"Distrito de Sangre",
      blurb:"Calles adoquinadas, farolas de gas y una luna que no se pone. La caza empieza aquí.",
      ground:["#161320","#1A1626"],
      fog:"rgba(60,10,18,.20)",
      moon:"#C2263A",
      accent:"#8E1F2F",
      mods:{start:10, speed:1.00, lightChance:0.10, maxLights:10},
      /* IMPORTANTE: la tabla de oleadas nombra a los enemigos por su
         posición en esta lista (f:[0], f:[2,3]...), dando por hecho que el
         orden va de más blando a más duro. Si se reordena sin respetarlo,
         el minuto 0 te manda al enemigo del minuto 12. */
      foes:["aldeano","cuervo","osario","encapuchado","bruto","gargola"],
      deco:function(g,x,y,C,n){
        if(n > 0.955){ // farola de gas
          g.fillStyle = "#14121C"; g.fillRect(x+28, y+16, 5, 34);
          g.fillStyle = "#3A3444"; g.fillRect(x+24, y+48, 13, 4);
          g.fillStyle = "#F2C46A"; g.fillRect(x+26, y+8, 9, 9);
          g.fillStyle = "rgba(242,196,106,.16)"; g.fillRect(x+16, y-2, 29, 30);
        } else if(n > 0.90){ // adoquín roto
          g.fillStyle = "#211C2E";
          g.fillRect(x+8, y+12, 18, 7); g.fillRect(x+30, y+30, 22, 7);
        } else if(n < 0.035){ // verja
          g.fillStyle = "#0E0C14";
          for(var i=0;i<5;i++) g.fillRect(x+8+i*11, y+18, 4, 30);
          g.fillRect(x+8, y+18, 48, 4);
        } else if(n < 0.075){ // charco de sangre
          g.fillStyle = "rgba(122,18,30,.55)";
          g.fillRect(x+18, y+26, 24, 10); g.fillRect(x+24, y+22, 12, 18);
        }
      }
    },
    bosque:{
      name:"Bosque del Ahorcado",
      blurb:"Los árboles llevan fruta que no deberías mirar. El suelo respira.",
      ground:["#12180F","#151C12"],
      fog:"rgba(20,40,20,.22)",
      moon:"#C8D68A",
      accent:"#5A7A3A",
      mods:{start:12, speed:1.10, lightChance:0.10, maxLights:10},
      foes:["vampirillo","murcielago","lobo","zarzal","cenagoso","devoradora"],
      deco:function(g,x,y,C,n){
        if(n > 0.94){ // árbol con soga
          g.fillStyle = "#1A1410"; g.fillRect(x+28, y+10, 7, 40);
          g.fillRect(x+14, y+16, 16, 5); g.fillRect(x+34, y+22, 16, 5);
          g.fillStyle = "#3A3020"; g.fillRect(x+18, y+21, 3, 14);
          g.fillStyle = "#2A2418"; g.fillRect(x+15, y+35, 9, 9);
        } else if(n > 0.885){ // matorral
          g.fillStyle = "#1B2416";
          g.fillRect(x+12, y+34, 22, 10); g.fillRect(x+18, y+28, 11, 18);
        } else if(n < 0.04){ // huesos
          g.fillStyle = "#6E6A58";
          g.fillRect(x+20, y+30, 18, 4); g.fillRect(x+26, y+24, 4, 16);
        } else if(n < 0.08){
          g.fillStyle = "rgba(90,122,58,.22)";
          g.fillRect(x+10, y+10, 30, 30);
        }
      }
    },
    catedral:{
      name:"Catedral Pálida",
      blurb:"Mármol, incienso y un coro que dejó de ser humano hace mucho.",
      ground:["#151424","#191829"],
      fog:"rgba(80,60,130,.20)",
      moon:"#DCD2F0",
      accent:"#8A6ECF",
      mods:{start:8,  speed:0.95, lightChance:0.14, maxLights:12},
      foes:["sabueso","ahorcado","monja","centinela","heraldo","forjado"],
      deco:function(g,x,y,C,n){
        if(n > 0.95){ // columna
          g.fillStyle = "#262238"; g.fillRect(x+22, y+6, 18, 46);
          g.fillStyle = "#322C48"; g.fillRect(x+18, y+2, 26, 7);
          g.fillRect(x+18, y+48, 26, 7);
        } else if(n > 0.905){ // baldosa clara
          g.fillStyle = "#1E1C30"; g.fillRect(x+6, y+6, 52, 52);
          g.fillStyle = "#232140"; g.fillRect(x+10, y+10, 44, 44);
        } else if(n < 0.035){ // vitral en el suelo
          g.fillStyle = "rgba(138,110,207,.20)"; g.fillRect(x+14, y+10, 22, 34);
          g.fillStyle = "rgba(226,120,160,.16)"; g.fillRect(x+30, y+18, 18, 26);
        } else if(n < 0.07){ // cirio
          g.fillStyle = "#D8D2C4"; g.fillRect(x+30, y+26, 5, 16);
          g.fillStyle = "#F2C46A"; g.fillRect(x+31, y+20, 3, 5);
          g.fillStyle = "rgba(242,196,106,.13)"; g.fillRect(x+22, y+14, 20, 20);
        }
      }
    }
  };
  V.STAGE_KEYS = Object.keys(V.STAGES);

  /* ================= REGLAS DE PARTIDA =================
     Réplica de las reglas del juego original, tomadas de su wiki.

     Experiencia: subir de nivel 1 a 2 cuesta 5; cada nivel siguiente pide
     10 más que el anterior. En el nivel 20 el escalón sube a 13 y se añade
     un salto de 600; en el 40 sube a 16 y se añade otro de 2400. */
  V.xpNeed = function(lvl){
    if(lvl < 20) return 5 + 10*(lvl-1);
    if(lvl < 40) return 795 + 13*(lvl-20);
    return 3455 + 16*(lvl-40);
  };

  /* Gemas: el color lo decide el valor, no el enemigo.
     Azul hasta 2, verde hasta 9, roja por encima. */
  V.gemTier = function(v){ return v<=2 ? 0 : (v<=9 ? 1 : 2); };
  V.GEM_COLORS = [["#2E6BD8","#7CC6FF"], ["#1E8C4A","#6FE08A"], ["#9A1030","#FF5A72"]];
  V.GEM_CAP = 400;          // por encima, todo se funde en una gema roja
  V.FOE_CAP = 300;          // tope de enemigos vivos; solo jefes lo saltan

  /* Recogibles que sueltan las luces del mapa, con su rareza relativa. */
  V.POWERUPS = [
    {kind:"rosario", w:1,  name:"Rosario",   text:"Arrasa con todo lo que ves"},
    {kind:"llama",   w:1,  name:"Fuego fatuo", text:"Escupe llamas diez segundos"},
    {kind:"reloj",   w:2,  name:"Reloj de arena", text:"Congela el tiempo diez segundos"},
    {kind:"vacio",   w:2,  name:"Llamada del vacío", text:"Atrae todas las gemas"},
    {kind:"carne",   w:3,  name:"Festín",    text:"+30 de vida"}
  ];

  /* ================= OLEADAS, MINUTO A MINUTO =================
     Igual que en el original: cada minuto define qué enemigos salen, un
     mínimo de enemigos vivos y cada cuánto se comprueba. Si al comprobar
     no se llega al mínimo, se generan hasta llenarlo. La maldición sube
     cantidad y frecuencia; 'mul' es la fuerza de ese escalón.
     'f' son índices del elenco del mapa (0 el más débil, 5 el más duro). */
  V.WAVES = [
    {f:[0],     min:15,  every:1.0, mul:1.0},
    {f:[0,1],   min:30,  every:1.0, mul:1.0, boss:1},
    {f:[1],     min:50,  every:0.9, mul:1.1, ev:{kind:"ring", f:1, n:32}},
    {f:[0,2],   min:40,  every:0.9, mul:1.2, boss:1},
    {f:[2,3],   min:30,  every:1.0, mul:1.3},
    {f:[3],     min:20,  every:1.0, mul:1.4, boss:1, ev:{kind:"wall", f:3, n:28}},
    {f:[1,3],   min:40,  every:0.9, mul:1.5},
    {f:[2,3],   min:80,  every:0.8, mul:1.6, boss:1, ev:{kind:"ring", f:2, n:40}},
    {f:[0,1],   min:100, every:0.7, mul:1.7},
    {f:[3,4],   min:40,  every:0.9, mul:1.8, boss:1},
    {f:[4],     min:20,  every:1.2, mul:2.0, boss:1, ev:{kind:"wall", f:4, n:16}},
    {f:[2],     min:150, every:0.6, mul:2.0},
    {f:[3,4],   min:40,  every:0.9, mul:2.2, boss:1},
    {f:[1,2],   min:120, every:0.6, mul:2.2, ev:{kind:"ring", f:1, n:52}},
    {f:[4,5],   min:30,  every:1.1, mul:2.5, boss:1},
    {f:[3,4],   min:100, every:0.7, mul:2.5, boss:1},
    {f:[2,4],   min:100, every:0.7, mul:2.8},
    {f:[5],     min:25,  every:1.3, mul:3.0},
    {f:[4,5],   min:60,  every:0.9, mul:3.0, boss:1},
    {f:[4,5],   min:100, every:0.7, mul:3.3},
    {f:[3,4,5], min:110, every:0.7, mul:3.6, boss:1, ev:{kind:"ring", f:5, n:26}},
    {f:[2],     min:200, every:0.5, mul:3.6},
    {f:[4,5],   min:150, every:0.6, mul:4.0, boss:1},
    {f:[5],     min:200, every:0.5, mul:4.0, boss:1},
    {f:[4,5],   min:200, every:0.5, mul:4.4},
    {f:[5],     min:120, every:0.7, mul:4.8, boss:1, ev:{kind:"wall", f:5, n:22}},
    {f:[4,5],   min:160, every:0.6, mul:5.0},
    {f:[2,3],   min:250, every:0.5, mul:5.2, ev:{kind:"ring", f:2, n:60}},
    {f:[1,4],   min:250, every:0.5, mul:5.6},
    {f:[0,5],   min:280, every:0.5, mul:6.0, boss:1}
  ];

  /* Cofres: solo los sueltan los jefes. Se tira primero a cinco objetos,
     luego a tres, luego a uno; la suerte multiplica cada tirada. */
  V.CHEST = {
    five:{p:0.03, gold:[500,1000], n:5},
    three:{p:0.10, gold:[300,600], n:3},
    one:{p:0.50, gold:[100,200], n:1}
  };
  V.EVO_FROM = 600;   // no hay evoluciones antes del minuto diez

  /* ================= SANTUARIO ================= */
  V.BLESSINGS = [
    {key:"vida",   name:"Vigor eterno", desc:"+12% de vida máxima",  max:5, cost:[120,240,420,700,1100]},
    {key:"dano",   name:"Filo eterno",  desc:"+6% de daño",          max:5, cost:[150,300,520,850,1300]},
    {key:"paso",   name:"Paso ligero",  desc:"+4% de velocidad",     max:5, cost:[100,200,360,600,950]},
    {key:"iman",   name:"Llamada",      desc:"+25% de radio de imán",max:3, cost:[110,260,520]},
    {key:"codicia",name:"Codicia",      desc:"+15% de oro",          max:5, cost:[90,190,340,560,880]},
    {key:"suerte", name:"Fortuna",      desc:"+10% de suerte",       max:3, cost:[160,340,640]},
    {key:"reroll", name:"Presagio",    desc:"+1 relanzamiento de cartas por cacería", max:5, cost:[130,280,480,760,1150]},
    {key:"skip",   name:"Paso de largo",desc:"+1 descarte de cartas por cacería",     max:5, cost:[110,240,420,680,1050]},
    {key:"banish", name:"Destierro",    desc:"+1 destierro: esa carta no vuelve",     max:5, cost:[170,350,600,950,1400]},
    {key:"alma",   name:"Segunda alma", desc:"Revives una vez por partida", max:1, cost:[1500]}
  ];

  V.RUN_LENGTH = 1800;   // treinta minutos, como el original
})();
