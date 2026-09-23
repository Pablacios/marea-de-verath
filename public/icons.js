/* Marea de Verrath — iconos de interfaz en pixel art
   Antes eran glifos Unicode (☗ ➷ ⋔ …). Funcionaban dentro de Claude porque
   allí había fuentes que los cubrían, pero servidos desde un dominio propio
   —y sobre todo en Android— la mitad salían como cuadraditos vacíos.
   Ahora se dibujan con el mismo motor que héroes y enemigos: nada de fuentes,
   mismo lenguaje visual que el resto del juego, y se ven igual en todas partes.

   Cada icono es una rejilla de caracteres; V.px.paint le pone contorno,
   luz desde arriba-izquierda y rampa de tres tonos. Las filas se rellenan
   solas hasta la más larga, así que no hay que contar píxeles a mano. */
(function(){
  "use strict";
  var V = window.V = window.V || {};

  var ICON = {};

  function grid(a){
    var w = 0, i;
    for(i=0;i<a.length;i++) if(a[i].length > w) w = a[i].length;
    var out = [];
    for(i=0;i<a.length;i++){
      var r = a[i];
      while(r.length < w) r += ".";
      out.push(r);
    }
    return out;
  }
  /* ---------------- iconos pintados ----------------
     Los dibujó el jugador, uno por arma y por pasivo. Aquí solo se cargan.
     Las rejillas de píxeles de más abajo se quedan como red: hasta que
     llegan los archivos —o si algún día falta uno— se dibuja la de píxeles
     y el juego nunca arranca sin iconos. Los objetos del suelo (oro, carne,
     antorchas, arcanas) siguen siendo de píxeles: no tienen dibujo. */
  var PINTADOS = ("latigo varita daga hacha cruz biblia varafuego ajo agua " +
    "trazarunas rayos pentagrama peachone ebano lanceta laurel cancion gatos " +
    "pistola escopeta pluma viento brazalete victoria " +
    "p_espinaca p_coraza p_corazon p_pomarola p_tomo p_candelabro p_brazal " +
    "p_encantador p_duplicador p_alas p_iman p_trebol p_corona p_mascara " +
    "p_calavera p_reliquia p_torrona p_plata p_oro p_metaizq p_metader " +
    // y las 23 evoluciones, cada una con su dibujo
    "sangre varitasagrada milfilos espiral espadacelestial visperas infierno " +
    "devoraalmas laborra sinfuturo bucle lunaesplendida vandalier corredor " +
    "sudario mannajja hambre iragemela valquiria fuwala bibrazalete " +
    "tribrazalete solar").split(" ");
  var ES_PINTADO = {}, IMG = {};
  (function(){
    for(var i=0;i<PINTADOS.length;i++){
      ES_PINTADO[PINTADOS[i]] = 1;
      (function(k){
        var img = new Image();
        img.decoding = "async";
        img.onload = function(){ IMG[k] = img; };
        img.src = "arte/ico_" + k + ".webp";
      })(PINTADOS[i]);
    }
  })();
  /* Los pintados se dibujan con suavizado y los de píxeles sin él: quien los
     pinta necesita saber cuál tiene delante. */
  V.esPintado = function(key){ return !!ES_PINTADO[key]; };
  V.iconesPintados = function(){ return PINTADOS.slice(); };

  function ico(key, pal, rows){
    // los iconos se pintan sin luz de canto: a este tamaño solo haría ruido
    ICON[key] = {cv: V.px.paint(pal, grid(rows), {anim:false, rim:false}), url:null, evo:null};
  }

  /* variante dorada para las evoluciones: el icono base bañado en oro
     y con una chispa en la esquina. Así una evolución se reconoce de un
     vistazo sin necesitar un dibujo nuevo por arma. */
  function goldOf(cv){
    /* La chispa y el desplazamiento se miden contra el icono: uno pintado de
       128 px y una rejilla de 18 llevan la misma marca a distinta escala. */
    var u = Math.max(1, Math.round(cv.width / 18));
    var c = document.createElement("canvas");
    c.width = cv.width + 3*u; c.height = cv.height + 3*u;
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = cv.width > 40;
    g.drawImage(cv, 0, 3*u, cv.width, cv.height);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = cv.width > 40 ? .34 : .5;   // el pintado se apaga si se baña entero
    g.fillStyle = "#FFD36B";
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    // chispa de cuatro puntas arriba a la derecha
    var sx = c.width - 5*u, sy = 0;
    g.fillStyle = "#1B0E28";
    g.fillRect(sx+u, sy, 3*u, 5*u); g.fillRect(sx, sy+u, 5*u, 3*u);
    g.fillStyle = "#FFF4D6";
    g.fillRect(sx+2*u, sy+u, u, 3*u); g.fillRect(sx+u, sy+2*u, 3*u, u);
    return c;
  }

  V.iconKeys = function(){ return Object.keys(ICON); };

  /* Red de seguridad. Una evolución no tiene rejilla de píxeles propia: si su
     dibujo no llegara, en vez de dejar el hueco vacío se usa el del arma de
     la que salió. Se resuelve tarde, la primera vez que hace falta, porque
     este archivo se carga antes que weapons.js. */
  var DEQUIEN = null;
  function base(key){
    if(DEQUIEN === null){
      DEQUIEN = {};
      var R = V.EVO_RULES || [];
      for(var i=0;i<R.length;i++) if(R[i].to) DEQUIEN[R[i].to] = R[i].from;
    }
    var de = DEQUIEN[key];
    if(!de) return null;
    if(IMG[de]) return de;
    return ICON[de] ? de : base(de);      // Tri -> Bi -> Brazalete
  }
  V.iconCanvas = function(key, evo){
    /* Cada arma, pasivo y evolución tiene su dibujo: ya no se inventa la
       versión evolucionada bañando en oro la del arma base. */
    if(IMG[key]) return IMG[key];
    var e = ICON[key];
    if(!e){
      var b = base(key);
      return b ? V.iconCanvas(b, false) : null;
    }
    if(!evo) return e.cv;
    if(!e.evo) e.evo = goldOf(e.cv);
    return e.evo;
  };
  V.iconURL = function(key, evo){
    // el pintado se sirve como archivo: no hace falta cocinar un data-url
    if(ES_PINTADO[key]) return "arte/ico_" + key + ".webp";
    var e = ICON[key];
    if(!e){
      var b = base(key);
      return b ? V.iconURL(b, false) : "";
    }
    if(evo){
      if(!e.evoUrl) e.evoUrl = V.iconCanvas(key, true).toDataURL();
      return e.evoUrl;
    }
    if(!e.url) e.url = e.cv.toDataURL();
    return e.url;
  };
  /* html listo para meter en una plantilla; si el icono no existe devuelve
     una caja vacía en vez de romper la tarjeta */
  V.iconHtml = function(key, cls, evo){
    // los pintados se escalan suave; las rejillas de píxeles, a cuadraditos
    if(ES_PINTADO[key] || (!ICON[key] && base(key))) cls = (cls || "icn") + " suave";
    var u = V.iconURL(key, evo);
    if(!u) return '<span class="' + (cls||"icn") + '"></span>';
    return '<img class="' + (cls||"icn") + '" alt="" src="' + u + '">';
  };
  /* los héroes ya tienen retrato propio de 24x30: se reaprovecha */
  V.heroIconHtml = function(heroKey, cls){
    var cv = V.sprite("h_" + heroKey, 0);
    if(!cv) return '<span class="' + (cls||"icn") + '"></span>';
    return '<img class="' + (cls||"icn") + '" alt="" src="' + cv.toDataURL() + '">';
  };

  /* ================= ARMAS =================
     Todos los iconos se dibujan sobre una rejilla cuadrada de unos 18
     píxeles de lado, para que llenen el hueco del HUD en vez de flotar
     dentro. Y todos comparten la misma paleta de materiales —hierro, acero,
     oro, madera, hueso, sangre— para que se vean como un juego de piezas y
     no como veinte dibujos sueltos. */

  ico("latigo", {r:"#C2263A", d:"#7A1220", w:"#6B4A2F", n:"#40291A"}, [
    "..................",
    "..............rr..",
    ".............r..r.",
    ".............r..r.",
    "..........rrrr..r.",
    ".......rrrr....rr.",
    ".....rrr..........",
    "...rrr............",
    "..rr..............",
    ".rr...............",
    "wwr...............",
    "www...............",
    "wwww..............",
    "nnww..............",
    "nnn...............",
    ".................."
  ]);

  ico("varita", {w:"#6B4A2F", n:"#40291A", a:"#8FA8FF", l:"#DCE8FF"}, [
    "..................",
    ".......aa.........",
    "......alla........",
    ".....a.ll.a.......",
    "...aaalllaaa......",
    "....a.lll.a.......",
    ".....allla........",
    "......a.a.........",
    ".......aw.........",
    "........ww........",
    ".........ww.......",
    "..........ww......",
    "...........nw.....",
    "............nn....",
    ".............n....",
    ".................."
  ]);

  ico("daga", {s:"#9AA0B0", l:"#D6DCE8", g:"#C99A3E", n:"#40291A"}, [
    "........ll........",
    "........sl........",
    ".......ssll.......",
    ".......ssll.......",
    ".......ssll.......",
    ".......ssll.......",
    ".......ssll.......",
    "......gggggg......",
    "......gggggg......",
    "........nn........",
    "........nn........",
    "........nn........",
    "........nn........",
    ".......gggg.......",
    ".......gggg.......",
    ".................."
  ]);

  ico("hacha", {s:"#9AA0B0", l:"#D6DCE8", w:"#6B4A2F", n:"#40291A"}, [
    "..................",
    "..ssss......ssss..",
    ".slllls....sllllls",
    "sllllllssslllllll.",
    "slllllllwwllllllls",
    "slllllllwwllllllls",
    ".sllllllwwlllllls.",
    "..slllllwwllllls..",
    "...ssssswwsssss...",
    "........www.......",
    "........www.......",
    "........www.......",
    "........nnn.......",
    "........nnn.......",
    ".................."
  ]);

  ico("cruz", {g:"#C99A3E", y:"#FFE066", r:"#C2263A"}, [
    "..................",
    ".......gyyg.......",
    ".......gyyg.......",
    ".......gyyg.......",
    "...gggggyygggg....",
    "...gyyyyrryyyyg...",
    "...gyyyyrryyyyg...",
    "...gggggyygggg....",
    ".......gyyg.......",
    ".......gyyg.......",
    ".......gyyg.......",
    ".......gyyg.......",
    ".......gggg.......",
    "..................",
    ".................."
  ]);

  ico("biblia", {p:"#8E5FBF", m:"#C08BEF", c:"#F2EDE0", g:"#C99A3E"}, [
    "..................",
    "..mmmmmmmmmmmmmm..",
    "..mpppppppppppppm.",
    "..mpccccccccccppm.",
    "..mpccccgccccccpm.",
    "..mpccccgccccccpm.",
    "..mpccgggggcccpm..",
    "..mpccccgccccccpm.",
    "..mpccccgccccccpm.",
    "..mpccccccccccppm.",
    "..mpppppppppppppm.",
    "..mmmmmmmmmmmmmm..",
    "...pppppppppppp...",
    "..................",
    ".................."
  ]);

  ico("varafuego", {o:"#FF8A3C", f:"#FFD36B", r:"#C2263A", w:"#6B4A2F", n:"#40291A"}, [
    ".......oo.........",
    "......ofoo........",
    ".....offfoo.......",
    "....offfffo.......",
    "....offfffo.......",
    "....rofffor.......",
    ".....roffr........",
    "......rwwr........",
    ".......ww.........",
    "........ww........",
    ".........ww.......",
    "..........nw......",
    "...........nn.....",
    "............n.....",
    ".................."
  ]);

  ico("ajo", {b:"#E8DFC8", c:"#F2EDE0", s:"#8A7A62", v:"#5FBF6A"}, [
    "........v.........",
    ".......vv.........",
    "......vv..........",
    ".....cbbbc........",
    "...ccbbbbbcc......",
    "..cbbbsbsbbbc.....",
    ".cbbbsbbbsbbbc....",
    ".cbbsbbbbbsbbc....",
    ".cbbsbbbbbsbbc....",
    ".bbbsbbbbbsbbb....",
    "..bbsbbbbbsbb.....",
    "...bbbbbbbbb......",
    ".....bbbbb........",
    ".................."
  ]);

  ico("agua", {a:"#7CC6FF", e:"#2E5B8A", c:"#F2EDE0", g:"#C99A3E"}, [
    "........gg........",
    "........gg........",
    ".......cccc.......",
    ".......c..c.......",
    "......cc..cc......",
    ".....cc....cc.....",
    "....cc......cc....",
    "....ca......ac....",
    "....caaaaaaaac....",
    "....caaaaaaaac....",
    "....ceaaaaaaec....",
    "....ceeaaaaeec....",
    ".....ceeeeeec.....",
    "......cccccc......",
    ".................."
  ]);

  ico("trazarunas", {v:"#46E0C8", a:"#7CC6FF", l:"#DCE8FF"}, [
    "........vv........",
    ".......vaav.......",
    "......vaaaav......",
    ".....vaallaav.....",
    "....vaal..laav....",
    "...vaal....laav...",
    "..vaal......laav..",
    "...vaal....laav...",
    "....vaal..laav....",
    ".....vaallaav.....",
    "......vaaaav......",
    ".......vaav.......",
    "........vv........",
    ".................."
  ]);

  ico("rayos", {y:"#FFE066", f:"#FFD36B", k:"#3E4252"}, [
    "....kkkkkkkk......",
    "..kk........kk....",
    ".k.....yy.....k...",
    ".k....yy......k...",
    "k....yyy.......k..",
    "k...yyyyyy.....k..",
    "k......yy......k..",
    "k.....yy.......k..",
    ".k...yy.......k...",
    ".k...y........k...",
    "..kk........kk....",
    "....kkkkkkkk......",
    ".................."
  ]);

  ico("pentagrama", {m:"#C08BEF", p:"#8E5FBF", l:"#F0E0FF"}, [
    "........ll........",
    "........mm........",
    ".......mmmm.......",
    "pppppppmmmppppppp.",
    ".pmmmmmmmmmmmmmp..",
    "..pmmmmmmmmmmmp...",
    "....pmmmmmmmp.....",
    ".....pmmmmmp......",
    ".....pmmmmmp......",
    "....pmmmpmmmp.....",
    "...pmmmp.pmmmp....",
    "..pmmp.....pmmp...",
    "..pp.........pp...",
    ".................."
  ]);

  ico("peachone", {c:"#F2EDE0", b:"#E8DFC8", s:"#C8BBA6", g:"#C99A3E"}, [
    "..................",
    "...cc........cc...",
    "..cccc......cccc..",
    ".cccccc....cccccc.",
    "bbbccccc..cccccbbb",
    "bbbbcccc.ccccbbbb.",
    ".sbbbccc.cccbbbs..",
    "..ssbbcggcbbss....",
    "...ssbbggbbss.....",
    "....sssggsss......",
    "......sggs........",
    ".......gg.........",
    ".................."
  ]);

  ico("ebano", {k:"#3E4252", t:"#2A2436", s:"#6A6E80", m:"#8E5FBF"}, [
    "..................",
    "...kk........kk...",
    "..ssss......ssss..",
    ".ssskkk....kkksss.",
    "tttskkkk..kkkksttt",
    "ttttkkkk.kkkktttt.",
    ".tttkkkk.kkkkttt..",
    "..tttkkmmkkttt....",
    "...tttkmmkttt.....",
    "....tttmmttt......",
    "......tmmt........",
    ".......mm.........",
    ".................."
  ]);

  ico("lanceta", {a:"#7CC6FF", l:"#DCE8FF", k:"#3E4252"}, [
    "..............ll..",
    ".............laa..",
    "............laa...",
    "...........laa....",
    "..........laa.....",
    ".........laa......",
    "........laa.......",
    ".......laa........",
    "......laa.........",
    "....kkkk..........",
    "...kkaakk.........",
    "...kkaakk.........",
    "....kkkk..........",
    ".................."
  ]);

  ico("laurel", {v:"#5FBF6A", d:"#2F6E3A", g:"#C99A3E"}, [
    ".......vvvv.......",
    ".....vvddddvv.....",
    "....vd......dv....",
    "...vd........dv...",
    "..vd..........dv..",
    "..vd..........dv..",
    "..vd..........dv..",
    "..vd..........dv..",
    "...vd........dv...",
    "....vd......dv....",
    ".....vvd..dvv.....",
    "......gg..gg......",
    ".................."
  ]);

  ico("cancion", {m:"#C08BEF", p:"#8E5FBF", l:"#F0E0FF"}, [
    "..........llmm....",
    "..........mmmm....",
    "..........mmpm....",
    "..........mm.m....",
    "..pp......mm.m....",
    ".p..p.....mm.m....",
    "p....p...mmm.m....",
    ".p..p..mmmmm.m....",
    "..pp..mmmmmmmm....",
    "......mmmm..mm....",
    ".....mmmm...mm....",
    "......mm....mm....",
    ".................."
  ]);

  ico("gatos", {w:"#D8B070", n:"#8A6030", y:"#FFE066", r:"#C2263A"}, [
    "..ww..........ww..",
    ".wwww........wwww.",
    ".wnnw........wnnw.",
    "wwwwwwwwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwww",
    "wwyywwwwwwwwyyww..",
    "wwyywwwwwwwwyyww..",
    "wwwwwwrrrrwwwwww..",
    "wwwwwwrwwrwwwwww..",
    ".wwwwwwwwwwwwww...",
    "..nwwwwwwwwwwn....",
    "....nnwwwwnn......",
    ".................."
  ]);

  ico("pistola", {k:"#3E4252", s:"#9AA0B0", w:"#6B4A2F", n:"#40291A"}, [
    "..................",
    "......ssssssssss..",
    ".....skkkkkkkkkks.",
    ".....skkkkkkkkkks.",
    ".....skkksssssssss",
    "....sskkks........",
    "...swwkkks........",
    "...swwwkks........",
    "...swwwws.........",
    "....swwws.........",
    "....swwws.........",
    ".....swws.........",
    ".....snns.........",
    ".................."
  ]);

  ico("escopeta", {k:"#3E4252", s:"#9AA0B0", w:"#6B4A2F", n:"#40291A", y:"#FFE066"}, [
    "..................",
    ".........ssssssss.",
    "........skkkkkkkk.",
    ".......skkkkkkkky.",
    "......skkkkkkkkkk.",
    ".....skkkkkkkkkky.",
    "....skkkks........",
    "...wwwks..........",
    "..wwww............",
    ".nwww.............",
    ".nww..............",
    "nnn...............",
    ".................."
  ]);

  ico("pluma", {l:"#DCE8FF", s:"#9AA0B0", k:"#3E4252"}, [
    "..............ll..",
    "............llls..",
    "..........lllls...",
    ".........lllls....",
    "........llll.s....",
    ".......llll.s.....",
    "......llll.s......",
    ".....llll.s.......",
    "....llll.s........",
    "...ssss.s.........",
    "..sss..s..........",
    ".kk...s...........",
    ".k................",
    ".................."
  ]);

  ico("viento", {c:"#F2EDE0", l:"#DCE8FF", a:"#7CC6FF"}, [
    "..................",
    "..................",
    "...cccccccccc.....",
    "...cc.......cc....",
    "............cc....",
    "..................",
    "..................",
    "..llllllllllll....",
    "..ll.........ll...",
    ".............ll...",
    "..................",
    "..................",
    "....aaaaaaaa......",
    "....aa......aa....",
    "............aa....",
    ".................."
  ]);

  ico("brazalete", {m:"#C08BEF", p:"#8E5FBF", g:"#C99A3E", l:"#F0E0FF"}, [
    "......pppppp......",
    "....ppggggggpp....",
    "...pggg....gggp...",
    "..pgg...ll...ggp..",
    "..pg...lmml...gp..",
    "..pg...lmml...gp..",
    "..pgg...ll...ggp..",
    "...pggg....gggp...",
    "....ppggggggpp....",
    "......pppppp......",
    ".................."
  ]);

  ico("victoria", {y:"#FFE066", g:"#C99A3E", l:"#FFF4D6", c:"#F2EDE0"}, [
    "........ll........",
    "........ll........",
    ".......llll.......",
    ".......ylly.......",
    ".......ylly.......",
    ".......ylly.......",
    ".......ylly.......",
    "..cc...ylly...cc..",
    ".cccggggllggggccc.",
    "..cc.ggyyyygg.cc..",
    ".......gyyg.......",
    "........gg........",
    "........gg........",
    ".......gggg.......",
    ".................."
  ]);

  /* ================= PASIVOS ================= */

  ico("p_espinaca", {r:"#C2263A", d:"#7A1220", k:"#3E4252", s:"#9AA0B0", l:"#FF6E7E"}, [
    "........r.........",
    ".......rrr........",
    "......rrrrr.......",
    ".....rlrrrrr......",
    "....rlrrrrrrr.....",
    "...rlrrrrrrrrr....",
    "...kkkkkkkkkkk....",
    "...sssssssssss....",
    "...rrrrrrrrrrr....",
    "....rrrrrrrrr.....",
    ".....rrrrrrr......",
    "......rrrrr.......",
    ".......rrr........",
    "........d........."
  ]);

  ico("p_coraza", {s:"#9AA0B0", k:"#3E4252"}, [
    "...ssssssssssss...",
    "...ssssssssssss...",
    "...sskksssskkss...",
    "...ssssssssssss...",
    "...ssssssssssss...",
    "...sskksssskkss...",
    "...ssssssssssss...",
    "....ssssssssss....",
    "....ssssssssss....",
    ".....ssssssss.....",
    "......ssssss......",
    ".......ssss.......",
    "........ss........",
    ".................."
  ]);

  ico("p_corazon", {r:"#C2263A", d:"#7A1220", l:"#FF6E7E", k:"#3E4252"}, [
    "..rrrr....rrrr....",
    ".rllrrr..rrrrrr...",
    "rllrrrrrrrrrrrrr..",
    "rlrrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrr..",
    "drrrrrrrrrrrrrrd..",
    ".drrrrrrrrrrrrd...",
    "..drrrrrrrrrrd....",
    "...drrrrrrrrd.....",
    "....drrrrrrd......",
    ".....drrrrd.......",
    "......drrd........",
    ".......dd........."
  ]);

  ico("p_pomarola", {v:"#5FBF6A", d:"#2F6E3A", r:"#C2263A", n:"#40291A"}, [
    "........n.........",
    ".......nn.........",
    "..vv..nn..vv......",
    ".vddv.n..vddv.....",
    ".vddvvnvvddv......",
    "..vddvnvddv.......",
    "...vdvnvdv........",
    "....vvnvv.........",
    "....rrnrr.........",
    "...rrrrrrr........",
    "...rrrrrrr........",
    "....rrrrr.........",
    ".................."
  ]);

  ico("p_tomo", {a:"#7CC6FF", e:"#2E5B8A", c:"#F2EDE0", g:"#C99A3E"}, [
    "..................",
    "..eeeeee..eeeeee..",
    ".eccccccaacccccce.",
    ".eccccccaacccccce.",
    ".eccccccaacccccce.",
    ".eccccccaacccccce.",
    ".eccccccaacccccce.",
    ".eccccccaacccccce.",
    ".eggccccaaccccgge.",
    ".eeeeeeeaaeeeeeee.",
    "..eeeeee..eeeeee..",
    ".................."
  ]);

  ico("p_candelabro", {g:"#C99A3E", y:"#FFE066", c:"#F2EDE0", o:"#FF8A3C"}, [
    "..o.........o.....",
    "..o....o....o.....",
    ".ccc..ccc..ccc....",
    ".ccc..ccc..ccc....",
    ".ggg..ggg..ggg....",
    "..g....g....g.....",
    "..g....g....g.....",
    "..ggggggggggg.....",
    ".......g..........",
    ".......g..........",
    "....yyyyyyy.......",
    "...ggggggggg......",
    ".................."
  ]);

  ico("p_brazal", {s:"#9AA0B0", w:"#6B4A2F", k:"#3E4252"}, [
    "..................",
    "...ssssssssssss...",
    "...swwsssssswws...",
    "...swwsssssswws...",
    "...swwsssssswws...",
    "...swwsskksswws...",
    "...swwsssssswws...",
    "...swwsssssswws...",
    "...swwsssssswws...",
    "...ssssssssssss...",
    ".................."
  ]);

  ico("p_encantador", {m:"#C08BEF", p:"#8E5FBF", l:"#F0E0FF"}, [
    "..................",
    "...mmm.....mmm....",
    "..mlllm...mlllm...",
    ".mll.pmm.mmp.llm..",
    ".ml...pmmmp...lm..",
    ".ml....ppp....lm..",
    ".ml...pmmmp...lm..",
    ".mll.pmm.mmp.llm..",
    "..mlllm...mlllm...",
    "...mmm.....mmm....",
    ".................."
  ]);

  ico("p_duplicador", {y:"#FFE066", g:"#C99A3E", l:"#FFF4D6"}, [
    "..................",
    "....ll......ll....",
    "...lyyl....lyyl...",
    "..lyyyyl..lyyyyl..",
    ".lyyyyyyllyyyyyyl.",
    ".gyyyyyyggyyyyyyg.",
    "..gyyyyg..gyyyyg..",
    "...gyyg....gyyg...",
    "....gg......gg....",
    ".................."
  ]);

  ico("p_alas", {c:"#F2EDE0", b:"#E8DFC8", s:"#C8BBA6"}, [
    "..................",
    "..cc..........cc..",
    ".cccc........cccc.",
    "cccccc......cccccc",
    "bbcccc......ccccbb",
    "bbbccc......cccbbb",
    ".sbbcc......ccbbs.",
    "..ssbb......bbss..",
    "...sss......sss...",
    "....ss......ss....",
    ".................."
  ]);

  ico("p_iman", {r:"#C2263A", d:"#7A1220", s:"#9AA0B0", l:"#D6DCE8"}, [
    "....rrrrrrrr......",
    "...rddddddddr.....",
    "..rdd......ddr....",
    "..rd........dr....",
    "..rd........dr....",
    "..rd........dr....",
    "..rd........dr....",
    "..sl........ls....",
    "..sl........ls....",
    "..ssl......lss....",
    "...ss......ss.....",
    ".................."
  ]);

  ico("p_trebol", {v:"#5FBF6A", d:"#2F6E3A", l:"#9BE8A6", n:"#40291A"}, [
    "...vvv...vvv......",
    "..vlllv.vlllv.....",
    ".vlllllvlllllv....",
    ".vlllllvlllllv....",
    "..vlllvdvlllv.....",
    "...vvvdddvvv......",
    "..vvvdddddvvv.....",
    ".vlllvdddvlllv....",
    ".vlllllvlllllv....",
    ".vlllllvlllllv....",
    "..vlllv.vlllv.....",
    "...vvv.n.vvv......",
    ".......n..........",
    "......nn.........."
  ]);

  ico("p_corona", {y:"#FFE066", g:"#C99A3E", r:"#C2263A", l:"#FFF4D6"}, [
    "..l.....l.....l...",
    "..y.....y.....y...",
    ".yyy...yyy...yyy..",
    ".yyy...yyy...yyy..",
    ".yyyy.yyyyy.yyyy..",
    ".yyyyyyyyyyyyyyy..",
    ".yyyyyyyyyyyyyyy..",
    ".ygyyyrryyrryyyg..",
    ".ggggggggggggggg..",
    ".ggggggggggggggg..",
    ".................."
  ]);

  ico("p_mascara", {s:"#9AA0B0", k:"#3E4252", l:"#D6DCE8"}, [
    "..ssssssssssss....",
    ".sllllllllllllls..",
    ".slkkkllllkkkkls..",
    ".slkkkllllkkkkls..",
    ".sllllllllllllls..",
    ".slllllkklllllls..",
    ".slllllkklllllls..",
    ".sllllllllllllls..",
    ".slkkkkkkkkkkkls..",
    ".sllllllllllllls..",
    "..sllllllllllls...",
    "...sssssssssss....",
    ".................."
  ]);

  ico("p_calavera", {b:"#E8DFC8", c:"#F2EDE0", k:"#2A2436", s:"#C8BBA6"}, [
    "....cccccccc......",
    "...cbbbbbbbbc.....",
    "..cbbbbbbbbbbc....",
    "..cbkkkbbkkkbc....",
    "..cbkkkbbkkkbc....",
    "..cbbbbbbbbbbc....",
    "...cbbbkkbbbc.....",
    "....cbbkkbbc......",
    "....cbkbbkbc......",
    "....ssssssss......",
    ".....s.ss.s.......",
    ".................."
  ]);

  ico("p_reliquia", {y:"#FFE066", g:"#C99A3E", m:"#C08BEF", l:"#FFF4D6"}, [
    "......ggggg.......",
    ".....gyyyyyg......",
    "....gyylllyyg.....",
    "...gyyl.m.lyyg....",
    "...gyl.mmm.lyg....",
    "...gyl.mmm.lyg....",
    "...gyyl.m.lyyg....",
    "....gyylllyyg.....",
    ".....gyyyyyg......",
    "......ggggg.......",
    ".....ggggggg......",
    ".................."
  ]);

  ico("p_torrona", {g:"#C99A3E", y:"#FFE066", r:"#C2263A", n:"#40291A"}, [
    "..................",
    "...yyyyyyyyyy.....",
    "..ygggggggggy.....",
    "..yggrrrrrggy.....",
    "..yggggggggyy.....",
    "..yyyyyyyyyy......",
    "..ygggggggggy.....",
    "..yggggrggggy.....",
    "..ygggrrrgggy.....",
    "..yggggrggggy.....",
    "..ynnnnnnnnny.....",
    "...yyyyyyyyy......",
    ".................."
  ]);

  ico("p_plata", {s:"#9AA0B0", l:"#D6DCE8", a:"#7CC6FF"}, [
    "........aa........",
    ".......llll.......",
    "....llllllllll....",
    "...ll........ll...",
    "..ls..........sl..",
    "..ls..........sl..",
    "..ls..........sl..",
    "..ls..........sl..",
    "...ss........ss...",
    "....ssssssssss....",
    ".................."
  ]);

  ico("p_oro", {g:"#C99A3E", y:"#FFE066", r:"#C2263A"}, [
    "........rr........",
    ".......yyyy.......",
    "....yyyyyyyyyy....",
    "...yy........yy...",
    "..yg..........gy..",
    "..yg..........gy..",
    "..yg..........gy..",
    "..yg..........gy..",
    "...gg........gg...",
    "....gggggggggg....",
    ".................."
  ]);

  ico("p_metaizq", {a:"#7CC6FF", e:"#2E5B8A", l:"#DCE8FF"}, [
    "....aaaaaa........",
    "...aallllaa.......",
    "..aal....laa......",
    "..al......la......",
    "..al.......a......",
    "..al..............",
    "..al.......e......",
    "..ae......ea......",
    "..eae....eaa......",
    "...eaaaaeaa.......",
    "....eeeeee........",
    ".................."
  ]);

  ico("p_metader", {r:"#C2263A", d:"#7A1220", l:"#FF9AA6"}, [
    "........rrrrrr....",
    ".......rrllllrr...",
    "......rrl....lrr..",
    "......rl......lr..",
    "......r.......lr..",
    "..............lr..",
    "......d.......lr..",
    "......rd......dr..",
    "......rrd....drd..",
    ".......rrddddrd...",
    "........dddddd....",
    ".................."
  ]);

  /* ================= OBJETOS DEL SUELO ================= */

  ico("d_cura", {r:"#C2263A", l:"#FF6E7E", d:"#7A1220"}, [
    "..rrrr....rrrr....",
    ".rllrrr..rrrrrr...",
    "rllrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrr..",
    "drrrrrrrrrrrrrrd..",
    ".drrrrrrrrrrrrd...",
    "..drrrrrrrrrrd....",
    "...drrrrrrrrd.....",
    "....drrrrrrd......",
    ".....drrrrd.......",
    "......drrd........",
    ".......dd........."
  ]);

  ico("d_oro", {y:"#FFE066", g:"#C99A3E", l:"#FFF4D6"}, [
    "..................",
    ".....llyyyll......",
    "....lyyyyyyyl.....",
    "....yyyggyyyy.....",
    "....yyggggyyy.....",
    "....ggggggggg.....",
    "..llyyyllyyyyl....",
    ".lyyyyyyyyyyyyl...",
    ".yyggyyyggyyyyy...",
    ".ggggggggggggg....",
    "..ggggggggggg.....",
    ".................."
  ]);

  ico("pu_luz", {o:"#FF8A3C", f:"#FFD36B", c:"#F2EDE0", s:"#C8BBA6", g:"#C99A3E"}, [
    "........o.........",
    ".......off........",
    ".......offf.......",
    "......offffo......",
    "......oofffo......",
    ".......ooffo......",
    "........ooo.......",
    "......cccccc......",
    "......cccccc......",
    "......cccccc......",
    "......sccccs......",
    ".....gggggggg.....",
    "....gggggggggg....",
    ".................."
  ]);

  ico("pu_rosario", {c:"#F2EDE0", b:"#E8DFC8", g:"#C99A3E", y:"#FFE066"}, [
    "....ccc..ccc......",
    "...c...cc...c.....",
    "..c..........c....",
    "..c..........c....",
    "...c........c.....",
    "....c......c......",
    ".....c....c.......",
    "......gyyg........",
    "...gggyyyggg......",
    "...gggyyyggg......",
    "......gyyg........",
    "......gyyg........",
    "......gggg........",
    ".................."
  ]);

  ico("pu_llama", {o:"#FF8A3C", f:"#FFD36B", r:"#C2263A", y:"#FFF4D6"}, [
    "........r.........",
    ".......ro.........",
    "......roo.........",
    ".....rooff........",
    "....roofffo.......",
    "....rofyyffo......",
    "...rrofyyyffo.....",
    "...rrofyyyffo.....",
    "...rroofyyffo.....",
    "....rroofffo......",
    ".....rrooofo......",
    "......rrrro.......",
    ".................."
  ]);

  ico("pu_reloj", {a:"#7CC6FF", e:"#2E5B8A", g:"#C99A3E", l:"#DCE8FF"}, [
    "..gggggggggg......",
    "..gllllllllg......",
    "...aaaaaaaa.......",
    "....aaaaaa........",
    ".....aaaa.........",
    "......aa..........",
    ".....eaae.........",
    "....eeaaee........",
    "...eeeaaeee.......",
    "..eeeeaaeeee......",
    "..gllllllllg......",
    "..gggggggggg......",
    ".................."
  ]);

  ico("pu_vacio", {p:"#8E5FBF", m:"#C08BEF", k:"#2A2436", l:"#F0E0FF"}, [
    ".....mmmmmm.......",
    "...mmpppppmm......",
    "..mppkkkkkppm.....",
    "..mpkkkkkkkpm.....",
    ".mpkkkkkkkkkpm....",
    ".mpkkkklkkkkpm....",
    ".mpkkkkkkkkkpm....",
    "..mpkkkkkkkpm.....",
    "..mppkkkkkppm.....",
    "...mmpppppmm......",
    ".....mmmmmm.......",
    ".................."
  ]);

  ico("pu_carne", {w:"#C08050", n:"#7A4A28", b:"#E8DFC8", c:"#F2EDE0"}, [
    "..................",
    "....wwwww.........",
    "...wwwwwww........",
    "..wwwwwwwww.......",
    "..wwwnnwwww.......",
    "..wwwwwwwww.......",
    "...wwwwwww........",
    "....wwwwbb........",
    ".......bbbb.......",
    "........bbbb......",
    ".........bbcc.....",
    "..........ccc.....",
    ".................."
  ]);

  ico("arcana", {p:"#8E5FBF", m:"#C08BEF", c:"#F2EDE0", y:"#FFE066"}, [
    "..pppppppppppp....",
    "..pmmmmmmmmmmp....",
    "..pmccccccccmp....",
    "..pmcccyccccmp....",
    "..pmccyyycccmp....",
    "..pmcyyyyyccmp....",
    "..pmccyyycccmp....",
    "..pmcccyccccmp....",
    "..pmccccccccmp....",
    "..pmmmmmmmmmmp....",
    "..pppppppppppp....",
    ".................."
  ]);

  V.ICONS = ICON;
})();
