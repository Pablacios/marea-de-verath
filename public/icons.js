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
  function ico(key, pal, rows){
    ICON[key] = {cv: V.px.paint(pal, grid(rows), {anim:false}), url:null, evo:null};
  }

  /* variante dorada para las evoluciones: el icono base bañado en oro
     y con una chispa en la esquina. Así una evolución se reconoce de un
     vistazo sin necesitar un dibujo nuevo por arma. */
  function goldOf(cv){
    var c = document.createElement("canvas");
    c.width = cv.width + 3; c.height = cv.height + 3;
    var g = c.getContext("2d");
    g.drawImage(cv, 0, 3);
    g.globalCompositeOperation = "source-atop";
    g.globalAlpha = .5;
    g.fillStyle = "#FFD36B";
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    // chispa de cuatro puntas arriba a la derecha
    var sx = c.width - 5, sy = 0;
    g.fillStyle = "#1B0E28";
    g.fillRect(sx+1, sy, 3, 5); g.fillRect(sx, sy+1, 5, 3);
    g.fillStyle = "#FFF4D6";
    g.fillRect(sx+2, sy+1, 1, 3); g.fillRect(sx+1, sy+2, 3, 1);
    return c;
  }

  V.iconCanvas = function(key, evo){
    var e = ICON[key];
    if(!e) return null;
    if(!evo) return e.cv;
    if(!e.evo) e.evo = goldOf(e.cv);
    return e.evo;
  };
  V.iconURL = function(key, evo){
    var e = ICON[key];
    if(!e) return "";
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

  /* ================= ARMAS ================= */

  ico("latigo", {c:"#C2263A", h:"#6B4A2F"}, [
    "..............c",
    "...........ccc.",
    ".........cc....",
    ".......cc......",
    ".....cc........",
    "...cc..........",
    "..cc...........",
    ".cc............",
    "hhh............",
    "hhh............",
    "hh............."
  ]);

  ico("varita", {w:"#8A6A46", g:"#8FA8FF", s:"#FFF4D6"}, [
    ".....g.........",
    "....ggg........",
    "...gg.gg.......",
    "...gg.gg.......",
    "....ggg........",
    ".....gw........",
    "......ww.......",
    ".......ww......",
    "........ww.....",
    ".........ww....",
    "..........ww..."
  ]);

  ico("daga", {b:"#C9CEDC", g:"#6B4A2F", p:"#E5B95C"}, [
    "......b........",
    ".....bbb.......",
    ".....bbb.......",
    ".....bbb.......",
    ".....bbb.......",
    ".....bbb.......",
    "...ppppppp.....",
    "......g........",
    "......g........",
    "......g........",
    ".....ppp......."
  ]);

  ico("hacha", {b:"#9AA0B0", h:"#6B4A2F"}, [
    ".bbbb..h...",
    "bbbbbb.h...",
    "bbbbbbbh...",
    "bbbbbbbh...",
    "bbbbbb.h...",
    ".bbbb..h...",
    ".......h...",
    ".......h...",
    ".......h...",
    ".......h..."
  ]);

  ico("cruz", {g:"#E5C34A"}, [
    ".....gg........",
    ".....gg........",
    "..gggggggg.....",
    "..gggggggg.....",
    ".....gg........",
    ".....gg........",
    ".....gg........",
    ".....gg........",
    ".....gg........"
  ]);

  ico("biblia", {c:"#C08BEF", p:"#F2EDE0", g:"#E5B95C"}, [
    "..ccccccccccc..",
    "..cpppppppppc..",
    "..cppppgpppppc",
    "..cppppgpppppc",
    "..cppgggggppc.",
    "..cpppppppppc..",
    "..ccccccccccc..",
    "..ccccccccccc.."
  ]);

  ico("varafuego", {o:"#FF8A3C", y:"#FFE066", r:"#C2263A"}, [
    "......o........",
    ".....ooo.......",
    "....ooyoo......",
    "...ooyyyoo.....",
    "...oyyyyyo.....",
    "...ryyyyyr.....",
    "....ryyyr......",
    ".....rrr......."
  ]);

  ico("ajo", {w:"#F0E8D8", s:"#C8BBA6", g:"#5FBF6A"}, [
    "......g........",
    ".....g.........",
    "....wwwww......",
    "...wwsswww.....",
    "..wwwsswwww....",
    "..wwwsswwww....",
    "...wwwwwww.....",
    "....wwwww......"
  ]);

  ico("agua", {g:"#C9CEDC", b:"#7CC6FF", c:"#6B4A2F"}, [
    ".....cc........",
    ".....cc........",
    "....gggg.......",
    "...gbbbbg......",
    "..gbbbbbbg.....",
    "..gbbbbbbg.....",
    "..gbbbbbbg.....",
    "...gbbbbg......",
    "....gggg......."
  ]);

  ico("trazarunas", {t:"#46E0C8", s:"#FFF4D6"}, [
    "......t........",
    ".....ttt.......",
    "....ttstt......",
    "...ttsssstt....",
    "....ttstt......",
    ".....ttt.......",
    "......t........"
  ]);

  ico("rayos", {y:"#FFE066"}, [
    "......yy.......",
    ".....yy........",
    "....yy.........",
    "...yyyyy.......",
    ".....yy........",
    "....yy.........",
    "...yy.........."
  ]);

  ico("pentagrama", {p:"#C08BEF"}, [
    "....p....",
    "....p....",
    "ppppppppp",
    ".ppppppp.",
    "..ppppp..",
    "..pp.pp..",
    ".pp...pp."
  ]);

  ico("peachone", {w:"#E8EEFF", s:"#B8C2D8"}, [
    "ww.......ww",
    "wwww...wwww",
    "wwwww.wwwww",
    ".wwww.wwww.",
    "..sww.wws..",
    "...ss.ss...",
    "....s.s...."
  ]);

  ico("ebano", {w:"#4A4A60", s:"#2A2A38"}, [
    "ww.......ww",
    "wwww...wwww",
    "wwwww.wwwww",
    ".wwww.wwww.",
    "..sww.wws..",
    "...ss.ss...",
    "....s.s...."
  ]);

  ico("lanceta", {b:"#7CC6FF", w:"#E8EEFF"}, [
    "...bbbbb.......",
    "..b.....b......",
    ".b...w...b.....",
    ".b...ww..b.....",
    ".b....ww.b.....",
    "..b.....b......",
    "...bbbbb......."
  ]);

  ico("laurel", {g:"#5FBF6A"}, [
    "...gg.gg...",
    "..g.....g..",
    ".g.......g.",
    "g.........g",
    "g.........g",
    ".g.......g.",
    "..g.....g..",
    "...gg.gg..."
  ]);

  ico("cancion", {p:"#C08BEF"}, [
    "......ppppp....",
    "......p...pp...",
    "......p....p...",
    "......p........",
    "......p........",
    "....ppp........",
    "...ppppp.......",
    "...ppppp.......",
    "....ppp........"
  ]);

  ico("gatos", {c:"#D8B070", e:"#2A2233"}, [
    ".cc.......cc...",
    ".ccc.....ccc...",
    ".ccccccccccc...",
    "ccccccccccccc..",
    "cc.ee...ee.cc..",
    "ccccccccccccc..",
    "ccccceeeccccc..",
    ".ccccccccccc...",
    "..ccccccccc...."
  ]);

  ico("pistola", {m:"#C9CEDC", g:"#6B4A2F"}, [
    "mmmmmmmmm..",
    "mmmmmmmmm..",
    "mm..mm.....",
    "mmggg......",
    "..gggg.....",
    "..gggg.....",
    "...ggg.....",
    "...ggg....."
  ]);

  ico("escopeta", {m:"#FFD36B", g:"#6B4A2F"}, [
    "mm.............",
    "mmm............",
    "mmmmmmmmm......",
    "mmmmmmmmmgg....",
    "mmm.......gg...",
    "mm.........gg..",
    "............gg."
  ]);

  /* ================= PASIVOS ================= */

  ico("p_espinaca", {r:"#C2263A"}, [
    "......r........",
    ".....rrr.......",
    "....rrrrr......",
    "...rrrrrrr.....",
    "...rrrrrrr.....",
    "....rrrrr......",
    ".....rrr......."
  ]);

  ico("p_coraza", {s:"#8A8C9E", d:"#5A5C6E"}, [
    "sssssssss",
    "sddddddds",
    "sddddddds",
    "sddddddds",
    ".sddddds.",
    "..sddds..",
    "...sds...",
    "....s...."
  ]);

  ico("p_corazon", {r:"#B03040"}, [
    "..rr...rr......",
    ".rrrr.rrrr.....",
    "rrrrrrrrrrr....",
    "rrrrrrrrrrr....",
    ".rrrrrrrrr.....",
    "..rrrrrrr......",
    "...rrrrr.......",
    "....rrr........",
    ".....r........."
  ]);

  ico("p_pomarola", {g:"#5FBF6A", s:"#3E8C4A"}, [
    "......gg.......",
    "....gggggg.....",
    "...gggsgggg....",
    "..ggggsggggg...",
    "...gggsgggg....",
    "....ggsgg......",
    "......s........",
    "......s........"
  ]);

  ico("p_tomo", {b:"#8FA8FF", p:"#F2EDE0"}, [
    "..bbbbbbbbb....",
    "..bpppppppb....",
    "..bpppppppb....",
    "..bpppppppb....",
    "..bpppppppb....",
    "..bbbbbbbbb...."
  ]);

  ico("p_candelabro", {y:"#E5C34A", f:"#FFD36B", w:"#F2EDE0"}, [
    "..f...f...f....",
    "..w...w...w....",
    "..w...w...w....",
    "..y...y...y....",
    "..yyyyyyyyy....",
    "......y........",
    "....yyyyy......"
  ]);

  ico("p_brazal", {m:"#C9CEDC", d:"#8A8C9E"}, [
    "..mmmmmmm..",
    ".mdddddddm.",
    "mddmdddmddm",
    "mdddddddddm",
    ".mdddddddm.",
    "..mmmmmmm.."
  ]);

  ico("p_encantador", {p:"#C08BEF"}, [
    "..ppp...ppp....",
    ".p...p.p...p...",
    ".p....p....p...",
    ".p...p.p...p...",
    "..ppp...ppp...."
  ]);

  ico("p_duplicador", {y:"#FFE066"}, [
    "..yy.....yy....",
    ".yyyy...yyyy...",
    ".yyyy...yyyy...",
    "..yy.....yy....",
    "...............",
    "..yy.....yy....",
    ".yyyy...yyyy...",
    ".yyyy...yyyy...",
    "..yy.....yy...."
  ]);

  ico("p_alas", {w:"#E8EEFF"}, [
    "ww.......ww",
    "wwww...wwww",
    "wwwww.wwwww",
    ".wwww.wwww.",
    "..www.www..",
    "...ww.ww...",
    "....w.w...."
  ]);

  ico("p_iman", {r:"#C2263A", m:"#46E0C8"}, [
    "..rrrrrrr..",
    ".rrrrrrrrr.",
    ".rr.....rr.",
    ".rr.....rr.",
    ".rr.....rr.",
    ".rr.....rr.",
    ".mm.....mm."
  ]);

  ico("p_trebol", {g:"#7CC6FF"}, [
    "..gg...gg..",
    ".gggg.gggg.",
    ".gggg.gggg.",
    "..ggg.ggg..",
    "....ggg....",
    "..ggg.ggg..",
    ".gggg.gggg.",
    ".gggg.gggg.",
    "..gg...gg..",
    "....g......",
    "....g......"
  ]);

  ico("p_corona", {g:"#E5B95C", j:"#C2263A"}, [
    "g...g...g......",
    "gg.ggg.gg......",
    "ggggggggg......",
    "ggjggjggg......",
    "ggggggggg......",
    "ggggggggg......"
  ]);

  ico("p_mascara", {s:"#9A7220", e:"#2A2233"}, [
    ".sssssssss.....",
    "sssssssssss....",
    "ss.ee.ee.ss....",
    "sssssssssss....",
    "sss.sss.sss....",
    ".sssssssss.....",
    "..sssssss......",
    "...sssss......."
  ]);

  ico("p_calavera", {b:"#A9B6D6", e:"#2A2233"}, [
    "..bbbbbbb......",
    ".bbbbbbbbb.....",
    ".bb.ee.ee.b....",
    ".bbbbbbbbb.....",
    ".bbb.e.bbb.....",
    "..bbbbbbb......",
    "...b.b.b......."
  ]);

  ico("p_reliquia", {y:"#FFD36B", w:"#FFF4D6"}, [
    "...yyyyyyy.....",
    "..yywwwwwyy....",
    ".yyyywwwyyyy...",
    "..yyyyyyyyy....",
    "...yyyyyyy.....",
    "....yyyyy......",
    ".....yyy.......",
    "......y........"
  ]);

  /* ================= OBJETOS DEL SUELO ================= */

  ico("d_cura", {r:"#C2263A"}, [
    "..rr...rr......",
    ".rrrr.rrrr.....",
    "rrrrrrrrrrr....",
    "rrrrrrrrrrr....",
    ".rrrrrrrrr.....",
    "..rrrrrrr......",
    "...rrrrr.......",
    "....rrr........",
    ".....r........."
  ]);

  ico("d_oro", {g:"#8A6A46", y:"#E5B95C"}, [
    "...gg.ggg......",
    "..ggggggggg....",
    ".ggyyyyyyyggg..",
    ".gyyyyyyyyygg..",
    ".gyyy.y.yyygg..",
    ".ggyyyyyyyggg..",
    "..ggggggggg....",
    "...ggggggg....."
  ]);

  /* ========== PODERES DEL SUELO Y LUCES ========== */

  ico("pu_luz", {h:"#3A3444", f:"#FFD36B", c:"#FF8A3C"}, [
    "...ff...",
    "..fcf...",
    "..fff...",
    "...h....",
    "...h....",
    "...h....",
    "..hhh..."
  ]);

  ico("pu_rosario", {b:"#E8EEFF", g:"#E5B95C"}, [
    "..bb.bb..",
    ".b.....b.",
    "b.......b",
    "b.......b",
    ".b.....b.",
    "..b.g.b..",
    "....g....",
    "..ggggg..",
    "....g....",
    "....g...."
  ]);

  ico("pu_llama", {o:"#FF8A3C", y:"#FFE066", r:"#C2263A"}, [
    "....o....",
    "...ooo...",
    "..ooyoo..",
    ".ooyyyoo.",
    ".oyyyyyo.",
    ".ryyyyyr.",
    "..ryyyr..",
    "...rrr..."
  ]);

  ico("pu_reloj", {g:"#E5B95C", s:"#7CC6FF"}, [
    "ggggggg",
    ".sssss.",
    "..sss..",
    "...s...",
    "..s.s..",
    ".sssss.",
    "ggggggg"
  ]);

  ico("pu_vacio", {t:"#46E0C8", d:"#1E8C4A"}, [
    "..ttttt..",
    ".t.....t.",
    "t..ddd..t",
    "t.dd.dd.t",
    "t..ddd..t",
    ".t.....t.",
    "..ttttt.."
  ]);

  ico("pu_carne", {m:"#C2263A", h:"#F0E8D8"}, [
    "..mmmmm..",
    ".mmmmmmm.",
    "mmmmmmmmm",
    "mmmmmmmmm",
    ".mmmmmmm.",
    "...hhh...",
    "..h...h.."
  ]);

  V.ICONS = ICON;
})();
