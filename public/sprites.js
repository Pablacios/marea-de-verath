/* Marea de Verrath — motor de pixel art 16 bits
   Un píxel de arte = un píxel de mundo (escala 1), así que subir la rejilla
   sube la resolución real sin tocar la escala del juego.
   El motor añade solo: rampa de tres tonos por color, luz desde arriba-izquierda,
   contorno oscuro y sombra proyectada. Es lo que separa 8 de 16 bits. */
(function(){
  "use strict";
  var V = window.V = window.V || {};

  /* ---------- color ---------- */
  function hex(c){
    c = c.replace("#","");
    if(c.length===3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  }
  function str(r){
    return "#"+((1<<24)+(Math.round(r[0])<<16)+(Math.round(r[1])<<8)+Math.round(r[2])).toString(16).slice(1);
  }
  function mix(a,b,t){
    var x=hex(a), y=hex(b);
    return str([x[0]+(y[0]-x[0])*t, x[1]+(y[1]-x[1])*t, x[2]+(y[2]-x[2])*t]);
  }
  // luces cálidas y sombras frías: el truco clásico que da profundidad
  function lighten(c){ return mix(c, "#FFF4D6", 0.32); }
  function darken(c){ return mix(c, "#1B0E28", 0.38); }
  V.color = {mix:mix, lighten:lighten, darken:darken};

  /* ---------- rampas ----------
     pal[k] puede ser un color suelto (se le calcula la rampa) o [oscuro, base, claro]. */
  function buildRamps(pal){
    var out = {};
    for(var k in pal){
      var v = pal[k];
      if(Object.prototype.toString.call(v) === "[object Array]") out[k] = v;
      else out[k] = [darken(v), v, lighten(v)];
    }
    return out;
  }

  /* ---------- pintado con luz y contorno ---------- */
  var OUTLINE = "#0A0710";
  function paint(pal, rows, opt){
    opt = opt || {};
    var ramps = buildRamps(pal);
    var w = rows[0].length, h = rows.length;
    var pad = 1;
    var c = document.createElement("canvas");
    c.width = w+pad*2; c.height = h+pad*2 + (opt.shadow?2:0);
    var g = c.getContext("2d");

    function at(x,y){
      if(x<0||y<0||x>=w||y>=h) return null;
      var ch = rows[y][x];
      return (!ch || ch===".") ? null : ch;
    }

    // 1) contorno: todo hueco pegado a materia
    g.fillStyle = opt.outline || OUTLINE;
    for(var y=-1; y<=h; y++) for(var x=-1; x<=w; x++){
      if(at(x,y)) continue;
      if(at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1)||
         at(x-1,y-1)||at(x+1,y-1)||at(x-1,y+1)||at(x+1,y+1))
        g.fillRect(x+pad, y+pad, 1, 1);
    }

    // 2) materia con tono según orientación a la luz
    for(var y2=0; y2<h; y2++) for(var x2=0; x2<w; x2++){
      var ch = at(x2,y2);
      if(!ch) continue;
      var ramp = ramps[ch];
      if(!ramp){ continue; }
      var tone = 1;
      var upOpen = !at(x2,y2-1), leftOpen = !at(x2-1,y2);
      var downOpen = !at(x2,y2+1), rightOpen = !at(x2+1,y2);
      if(upOpen || (leftOpen && !downOpen)) tone = 2;
      else if(downOpen || rightOpen) tone = 0;
      // un color distinto arriba también cuenta como borde interno
      else if(at(x2,y2-1) !== ch && at(x2,y2-1)) tone = 2;
      g.fillStyle = ramp[tone];
      g.fillRect(x2+pad, y2+pad, 1, 1);
    }

    // 3) sombra proyectada a los pies
    if(opt.shadow){
      g.fillStyle = "rgba(6,4,14,.42)";
      var sw = Math.round(w*0.62), sx = Math.round((c.width-sw)/2), sy = h+pad;
      g.fillRect(sx+2, sy, sw-4, 1);
      g.fillRect(sx, sy+1, sw, 1);
      g.fillRect(sx+2, sy+2, sw-4, 1);
    }
    c.px = 1;
    return c;
  }

  /* ---------- animación ---------- */
  function shiftLegs(rows, from, dir){
    var out = rows.slice();
    for(var i=from; i<rows.length; i++){
      var r = rows[i];
      out[i] = dir>0 ? ("." + r).slice(0, r.length) : (r + ".").slice(1);
    }
    return out;
  }
  function bobbed(rows){
    // un fotograma un píxel más bajo: da el rebote de caminar
    return [rows[0]].concat(rows.slice(0, rows.length-1));
  }
  function flashOf(cv){
    var c=document.createElement("canvas");
    c.width=cv.width; c.height=cv.height;
    var g=c.getContext("2d");
    g.drawImage(cv,0,0);
    g.globalCompositeOperation="source-atop";
    g.fillStyle="rgba(255,248,236,.92)";
    g.fillRect(0,0,c.width,c.height);
    return c;
  }
  function tintOf(cv,color,amount){
    var c=document.createElement("canvas");
    c.width=cv.width; c.height=cv.height;
    var g=c.getContext("2d");
    g.drawImage(cv,0,0);
    g.globalCompositeOperation="source-atop";
    g.globalAlpha=amount===undefined?.4:amount;
    g.fillStyle=color; g.fillRect(0,0,c.width,c.height);
    return c;
  }

  var BANK = {};
  function def(key, pal, rows, opt){
    opt = opt || {};
    var legsFrom = opt.legs !== undefined ? opt.legs : rows.length-5;
    var base = paint(pal, rows, opt);
    var frames;
    if(opt.anim === false) frames = [base];
    else if(opt.flap){
      frames = [base, paint(pal, bobbed(rows), opt), base, paint(pal, bobbed(rows), opt)];
    } else {
      frames = [
        base,
        paint(pal, shiftLegs(rows, legsFrom, 1), opt),
        base,
        paint(pal, shiftLegs(rows, legsFrom, -1), opt)
      ];
    }
    BANK[key] = {f:frames, hit:flashOf(base), w:base.width, h:base.height};
    return BANK[key];
  }
  V.px = {paint:paint, def:def, bank:BANK, tintOf:tintOf, flashOf:flashOf, OUTLINE:OUTLINE};
  V.sprite = function(key, frame){ var e=BANK[key]; return e ? e.f[(frame||0)%e.f.length] : null; };
  V.spriteHit = function(key){ var e=BANK[key]; return e ? e.hit : null; };

  /* ==================================================================
     HÉROES — 24 x 30, doce tonos por figura
     Proporciones de acción-RPG clásico: cabeza grande, silueta legible,
     capa o abrigo que da masa al cuerpo.
     ================================================================== */

  /* --- El Cazador: tricornio, gabán largo, forro carmesí --- */
  def("h_cazador", {
    h:"#1C1526", c:"#382C45", r:"#8E1F2F", s:"#C9A283", e:"#E8E2D4",
    w:"#D8CFC0", b:"#161020", m:"#B08A3E", l:"#5A4A6E"
  },[
    "........................",
    "........................",
    "......hhhhhhhhhhhh......",
    ".....hhhhhhhhhhhhhh.....",
    "....hhhhhhhhhhhhhhhh....",
    "...hhhhhhhhhhhhhhhhhh...",
    "...hhhhhhhhhhhhhhhhhh...",
    "....hhhhhhhhhhhhhhhh....",
    "........ssssssss........",
    ".......ssssssssss.......",
    ".......sseesseess.......",
    ".......ssssssssss.......",
    "........ssssssss........",
    "........wwwwwwww........",
    ".....cccccccccccccc.....",
    "....cccccccccccccccc....",
    "...cccccccccccccccccc...",
    "...ccccrrrrrrrrrrcccc...",
    "...ccccrrrrrrrrrrcccc...",
    "...cccmrrrrrrrrrrmccc...",
    "...ccccrrrrrrrrrrcccc...",
    "....llccccccccccccll....",
    "....cccccccccccccccc....",
    ".....cccccccccccccc.....",
    ".....cccccc..cccccc.....",
    ".....cccccc..cccccc.....",
    "......bbbb....bbbb......",
    "......bbbb....bbbb......",
    ".....bbbbb....bbbbb.....",
    "........................"
  ], {shadow:true, legs:24});

  /* --- La Vicaria: velo, hábito claro, cruz dorada --- */
  def("h_vicaria", {
    v:"#252036", w:"#CFC7B6", g:"#D8B24E", s:"#C9A283", e:"#2A2436",
    r:"#8E1F2F", b:"#181322", l:"#6E6480"
  },[
    "........................",
    ".......vvvvvvvvvv.......",
    "......vvvvvvvvvvvv......",
    ".....vvvvvvvvvvvvvv.....",
    ".....vvvvssssssvvvv.....",
    ".....vvvssssssssvvv.....",
    ".....vvvsseesseesvvv....",
    ".....vvvsssssssssvvv....",
    "......vvvsssssssvvv.....",
    "......vvvvssssvvvvv.....",
    ".......vvvvvvvvvvv......",
    ".......wwwwwwwwww.......",
    "......wwwwwwwwwwww......",
    ".....wwwwwwwwwwwwww.....",
    ".....wwwwwwggwwwwww.....",
    "....wwwwwwwggwwwwwww....",
    "....wwwwwgggggggwwww....",
    "....wwwwwwwggwwwwwww....",
    "....wwwwwwwggwwwwwww....",
    "....wwwwwwwwwwwwwwww....",
    "....rrwwwwwwwwwwwwrr....",
    "....wwwwwwwwwwwwwwww....",
    "....wwwwwwwwwwwwwwww....",
    "...wwwwwwwwwwwwwwwwww...",
    "...wwwwwwwwwwwwwwwwww...",
    "...wwwwwww....wwwwwww...",
    "......bbbb....bbbb......",
    "......bbbb....bbbb......",
    ".....bbbbb....bbbbb.....",
    "........................"
  ], {shadow:true, legs:25});

  /* --- Doctor de la Peste: máscara de pico, lentes de cristal --- */
  def("h_doctor", {
    k:"#1A1C22", c:"#2A3640", b:"#7A7452", g:"#A8B49A", l:"#D2DCC8",
    r:"#7A1E2A", m:"#8A8470", d:"#141820", s:"#C9A283"
  },[
    "........................",
    "........................",
    "......kkkkkkkkkkkk......",
    ".....kkkkkkkkkkkkkk.....",
    "....kkkkkkkkkkkkkkkk....",
    "....kkllkkkkkkkkllkk....",
    "....kkllkkkkkkkkllkk....",
    "....kkkkkkkkkkkkkkkk....",
    ".....kkkkkbbbbkkkkk.....",
    "......kkkkbbbbkkkk......",
    ".......kkkbbbbkkk.......",
    "..........bbbb..........",
    ".........bbbbbb.........",
    "........bbbbbbbb........",
    ".....cccccccccccccc.....",
    "....cccccccccccccccc....",
    "...cccccccccccccccccc...",
    "...ccccccmmmmmmcccccc...",
    "...cccccmmmmmmmmccccc...",
    "...ccccccmmmmmmcccccc...",
    "...cccccrrrrrrrrccccc...",
    "....cccccccccccccccc....",
    "....cccccccccccccccc....",
    ".....cccccccccccccc.....",
    ".....cccccc..cccccc.....",
    ".....cccccc..cccccc.....",
    "......dddd....dddd......",
    "......dddd....dddd......",
    ".....ddddd....ddddd.....",
    "........................"
  ], {shadow:true, legs:24});

  /* --- Hija de la Bestia: melena, cuernos, garras --- */
  def("h_bestia", {
    f:"#6E4634", d:"#3E2418", e:"#E5C34A", t:"#EFE6D2", c:"#7A2432",
    k:"#1A1014", g:"#C9A283", m:"#4A2C1E"
  },[
    "........................",
    "...dd..............dd...",
    "...ddd............ddd...",
    "....ddd..ffff....ddd....",
    ".....dddffffffddddd.....",
    "......ffffffffffff......",
    ".....ffffffffffffff.....",
    ".....ffeeffffffeeff.....",
    ".....ffffffffffffff.....",
    "......ffffttttffff......",
    "......ffftttttthff......",
    ".......ffffffffff.......",
    "........ffffffff........",
    ".....mffffffffffffm.....",
    "....mmffffffffffffmm....",
    "...mmfffffffffffffmm....",
    "...mfffffccccccfffffm...",
    "...mfffffccccccfffffm...",
    "...mffffffccccffffffm...",
    "....mfffffffffffffmm....",
    "....ffffffffffffffff....",
    "....ffffffffffffffff....",
    ".....ffffffffffffff.....",
    ".....ffffff..ffffff.....",
    ".....ffffff..ffffff.....",
    "....ddddd......ddddd....",
    "...dtdtd........dtdtd...",
    "...ttttt........ttttt...",
    "........................",
    "........................"
  ], {shadow:true, legs:23});

  /* --- La Astrónoma: capirote estrellado, manto azul --- */
  def("h_astronoma", {
    c:"#2E3160", y:"#E5C34A", s:"#C9A283", e:"#1A1A2A", w:"#D8DCF0",
    g:"#8FA8FF", b:"#1A1730", l:"#4A4E90"
  },[
    "..........yy............",
    ".........ycyy...........",
    "........ycccy...........",
    ".......yccccyy..........",
    "......ycccccccy.........",
    ".....ycccccccccy........",
    "....yccccccccccccy......",
    "...cccccccccccccccc.....",
    "...ccccccccccccccccc....",
    "......ssssssssss........",
    "......sseesseess........",
    "......ssssssssss........",
    ".......ssssssss.........",
    ".....llcccccccccll......",
    "....llcccccccccccll.....",
    "...llccccccccccccccl....",
    "...lcccccwwwwcccccccl...",
    "...lccccwwggwwccccccl...",
    "...lcccwwggggwwcccccl...",
    "...lccccwwggwwccccccl...",
    "...lcccccwwwwcccccccl...",
    "....lcccccccccccccll....",
    "....cccccccccccccccc....",
    "...cccccccccccccccccc...",
    "...cccccccccccccccccc...",
    "...cccccccc..cccccccc...",
    "......bbbb....bbbb......",
    "......bbbb....bbbb......",
    ".....bbbbb....bbbbb.....",
    "........................"
  ], {shadow:true, legs:25});

  /* --- El Verdugo: capucha, torso desnudo, hachón al hombro --- */
  def("h_verdugo", {
    h:"#241C1A", s:"#B99A7C", c:"#3E322C", r:"#8E1F2F", m:"#9AA0B0",
    w:"#6E5C46", k:"#161010", g:"#D8DCE8"
  },[
    "....................mm..",
    "...................mmmm.",
    "......hhhhhhhhhh..mmmmmm",
    ".....hhhhhhhhhhhh.mmmmmm",
    "....hhhhhhhhhhhhhh.mmmm.",
    "....hhhhrrrrrrhhhh..ww..",
    "....hhhhrrrrrrhhhh..ww..",
    "....hhhhhhhhhhhhhh..ww..",
    ".....hhhhhhhhhhhh...ww..",
    "......hhhhhhhhhh....ww..",
    ".......ssssssss.....ww..",
    "......ssssssssss....ww..",
    ".....sssssssssssss..ww..",
    "....ssssssssssssssssww..",
    "...ssssssssssssssss.....",
    "...ssssssssssssssss.....",
    "...sssswwwwwwwwssss.....",
    "...sssswwwwwwwwssss.....",
    "...ssssssssssssssss.....",
    "....ssssssssssssss......",
    "....cccccccccccccc......",
    "....cccccccccccccc......",
    "...cccccccccccccccc.....",
    "...cccccc....cccccc.....",
    "...cccccc....cccccc.....",
    "....kkkkk....kkkkk......",
    "....kkkkk....kkkkk......",
    "...kkkkkk....kkkkkk.....",
    "........................",
    "........................"
  ], {shadow:true, legs:23});

  /* ================= DIEZ CAZADORES MÁS =================
     Comparten el patrón de abrigo para que la silueta sea coherente, y se
     distinguen por la cabeza, la paleta y el emblema del pecho. Es el mismo
     recurso que usa el original: cuerpos parecidos, cabezas inconfundibles. */
  function torso(c, k, m){
    return [
      ".....cccccccccccccc.....".replace(/c/g, c),
      "....cccccccccccccccc....".replace(/c/g, c),
      "...cccccccccccccccccc...".replace(/c/g, c),
      "...cccc".replace(/c/g,c) + m[0] + "cccc...".replace(/c/g,c),
      "...cccc".replace(/c/g,c) + m[1] + "cccc...".replace(/c/g,c),
      "...cccc".replace(/c/g,c) + m[2] + "cccc...".replace(/c/g,c),
      "...cccc".replace(/c/g,c) + m[3] + "cccc...".replace(/c/g,c),
      "....cccccccccccccccc....".replace(/c/g, c),
      "....cccccccccccccccc....".replace(/c/g, c),
      ".....cccccccccccccc.....".replace(/c/g, c),
      ".....cccccc..cccccc.....".replace(/c/g, c),
      ".....cccccc..cccccc.....".replace(/c/g, c),
      "......kkkk....kkkk......".replace(/k/g, k),
      "......kkkk....kkkk......".replace(/k/g, k),
      ".....kkkkk....kkkkk.....".replace(/k/g, k),
      "........................"
    ];
  }
  function hero(key, pal, head, c, k, motif, opt){
    def(key, pal, head.concat(torso(c, k, motif)), opt || {shadow:true, legs:25});
  }

  /* --- La Viuda: velo de luto y tocado alto --- */
  hero("h_viuda", {n:"#1A1420", v:"#3A2C48", s:"#C9A283", e:"#1A1A2A",
                   g:"#D8B24E", b:"#141019", p:"#7A2E52"}, [
    "........................",
    "........nnnnnnnn........",
    ".......nnnnnnnnnn.......",
    "......nnnnnnnnnnnn......",
    "......nnvvvvvvvvnn......",
    "......nvvvvvvvvvvn......",
    "......nvvssssssvvn......",
    "......nvssseessssn......",
    "......nvvssssssvvn......",
    ".......vvssssssvv.......",
    ".......vvvssssvvv.......",
    "........vvvvvvvv........",
    ".........vvvvvv.........",
    "........nnnnnnnn........"
  ], "n", "b", ["..gg..gg..", ".gpppppg..", ".gpppppg..", "..gg..gg.."]);

  /* --- El Farolero: farol colgando de una pértiga --- */
  hero("h_farolero", {c:"#2A2438", f:"#F2C46A", m:"#8A8C9E", s:"#C9A283",
                      e:"#1A1A2A", b:"#161020", y:"#FFE9B0"}, [
    "..................mm....",
    ".................mffm...",
    "......cccccccc...mfym...",
    ".....cccccccccc..mffm...",
    "....cccccccccccc.mmmm...",
    "....cccccccccccc..mm....",
    ".....ssssssssss...mm....",
    ".....sseesseess...mm....",
    ".....ssssssssss...mm....",
    "......ssssssss....mm....",
    ".......ssssss.....mm....",
    "........ssss......mm....",
    "......cccccccc....mm....",
    ".....cccccccccc...mm...."
  ], "c", "b", ["...ffff...", "..ffyyff..", "..ffyyff..", "...ffff..."]);

  /* --- El Sepulturero: gorro calado y bufanda --- */
  hero("h_sepulturero", {c:"#33302A", g:"#4A4438", s:"#B99A7C", e:"#1A1A2A",
                         r:"#6E4A2E", b:"#181410", w:"#8A8474"}, [
    "........................",
    "........................",
    "......gggggggggg........",
    ".....gggggggggggg.......",
    ".....gggggggggggg.......",
    "......ssssssssss........",
    "......sseesseess........",
    "......ssssssssss........",
    ".......ssssssss.........",
    "......rrrrrrrrrr........",
    ".....rrrrrrrrrrrr.......",
    "......rrrrrrrrrr........",
    ".......ssssssss.........",
    "......cccccccccc........"
  ], "c", "b", ["....ww....", "...wwww...", "..wwwwww..", "....ww...."]);

  /* --- La Niña Pálida: cabeza grande, coletas, muñeca --- */
  hero("h_nina", {d:"#E8E2D4", s:"#EFE4D8", e:"#2A2436", h:"#6E3A52",
                  v:"#8A5A78", b:"#2A2030", r:"#C2263A"}, [
    "........................",
    "......hh........hh......",
    ".....hhhh......hhhh.....",
    ".....hhhhhhhhhhhhhh.....",
    "....hhhhhhhhhhhhhhhh....",
    "....hhssssssssssssh.....",
    "....hsssssssssssssh.....",
    "....hsseessseesssssh....",
    "....hssssssssssssssh....",
    ".....hsssssrrsssssh.....",
    ".....hhsssssssssshh.....",
    "......hhhssssssshh......",
    ".......hhhhhhhhhh.......",
    "........vvvvvvvv........"
  ], "v", "b", ["...rrrr...", "..rrrrrr..", "..rrrrrr..", "...rrrr..."],
     {shadow:true, legs:26});

  /* --- El Coleccionista: chistera y monóculo --- */
  hero("h_coleccionista", {t:"#1C1826", c:"#2E2A3A", s:"#C9A283", e:"#1A1A2A",
                           g:"#E5B95C", b:"#141019", w:"#D8CFC0"}, [
    "........................",
    ".......tttttttttt.......",
    ".......tttttttttt.......",
    ".......tttttttttt.......",
    "......tttttttttttt......",
    ".....tttttttttttttt.....",
    "......ssssssssssss......",
    "......sseessgsssss......",
    "......ssssssgsssss......",
    ".......ssssssssss.......",
    "........ssssssss........",
    "........wwwwwwww........",
    ".......cccccccccc.......",
    "......cccccccccccc......"
  ], "c", "b", ["..gggggg..", ".gg....gg.", ".gg....gg.", "..gggggg.."]);

  /* --- El Penitente: capucha baja y cadenas --- */
  hero("h_penitente", {h:"#2A2028", s:"#B99A7C", e:"#1A1A2A", m:"#8A8C9E",
                       c:"#3A2E34", b:"#181218", r:"#8E1F2F"}, [
    "........................",
    "........................",
    "......hhhhhhhhhh........",
    ".....hhhhhhhhhhhh.......",
    "....hhhhhhhhhhhhhh......",
    "....hhhhhhhhhhhhhh......",
    "....hhhhssssssshhh......",
    "....hhhsseesssshhh......",
    "....hhhhsssssshhhh......",
    ".....hhhhssssshhh.......",
    "......hhhhhhhhhh........",
    ".......hhhhhhhh.........",
    "......mmmmmmmmmm........",
    ".....cccccccccccc......."
  ], "c", "b", ["..mm..mm..", "..mm..mm..", ".mmmmmmmm.", "....rr...."]);

  /* --- La Cantora: peinado alto y gargantilla --- */
  hero("h_cantora", {p:"#5A2E4A", s:"#D8B79A", e:"#1A1A2A", g:"#D8B24E",
                     c:"#7A3A5E", b:"#2A1622", w:"#EFE4D8"}, [
    ".........pppp...........",
    "........pppppp..........",
    ".......pppppppp.........",
    "......pppppppppp........",
    "......pppssssspp........",
    "......ppsssssssp........",
    "......psseessssp........",
    "......pssssssssp........",
    ".......pssssssp.........",
    ".......ppsssspp.........",
    "........pppppp..........",
    "........gggggg..........",
    "......cccccccccc........",
    ".....cccccccccccc......."
  ], "c", "b", ["...wwww...", "..wwwwww..", "..wwgwwww.", "...wwww..."]);

  /* --- El Alquimista: gafas de cristal y capucha corta --- */
  hero("h_alquimista", {c:"#26382E", s:"#C9A283", e:"#1A1A2A", g:"#7CC6FF",
                        m:"#8A8C9E", b:"#141A16", y:"#B6E06A"}, [
    "........................",
    "........................",
    "......cccccccccc........",
    ".....cccccccccccc.......",
    "....cccccccccccccc......",
    "....ccggccccccggcc......",
    "....ccggccccccggcc......",
    "....cccccccccccccc......",
    ".....sssssssssss........",
    ".....ssssssssss.........",
    "......ssssssss..........",
    "......mmmmmmmm..........",
    ".....cccccccccc.........",
    "....cccccccccccc........"
  ], "c", "b", ["...yyyy...", "..yyyyyy..", "..yyyyyy..", "...yyyy..."]);

  /* --- El Titiritero: máscara partida y cruceta de hilos --- */
  hero("h_titiritero", {c:"#2A2438", w:"#E4E0D2", e:"#1A1A2A", m:"#8A7A5A",
                        b:"#161222", r:"#8E1F2F", g:"#D8B24E"}, [
    "....mmmmmmmmmmmm........",
    ".......m..m..m..........",
    ".......m..m..m..........",
    "......wwwwwwwwww........",
    ".....wwwwwwwwwwww.......",
    ".....wwwwwwwwwwww.......",
    ".....wweewwwweeww.......",
    ".....wwwwwwwwwwww.......",
    ".....wwrrwwwwrrww.......",
    "......wwwwwwwwww........",
    "......wwwwwwwwww........",
    ".......wwwwwwww.........",
    "......cccccccccc........",
    ".....cccccccccccc......."
  ], "c", "b", ["...gggg...", "..g....g..", "..g....g..", "...gggg..."]);

  /* --- La Hija del Cuervo: pico, plumas y capa negra --- */
  hero("h_cuerva", {n:"#1E1A24", k:"#0F0D14", s:"#C9A283", e:"#E5B95C",
                    g:"#8A8C9E", b:"#120F18", p:"#3A3448"}, [
    "........................",
    "......nnnnnnnnnn........",
    ".....nnnnnnnnnnnn.......",
    "....nnnnnnnnnnnnnn......",
    "....nneennnnnneenn......",
    "....nnnnnnnnnnnnnn......",
    ".....nnnnggggnnnn.......",
    "......nnngggggnn........",
    ".......nnggggnnn........",
    "........nggggn..........",
    ".........nggn...........",
    "........ssssss..........",
    "......pppppppppp........",
    ".....pppppppppppp......."
  ], "p", "b", ["..nn..nn..", ".nnnnnnnn.", ".nnnnnnnn.", "..nn..nn.."]);

  V.HERO_SPRITES = ["h_cazador","h_vicaria","h_doctor","h_bestia","h_astronoma","h_verdugo",
    "h_viuda","h_farolero","h_sepulturero","h_nina","h_coleccionista","h_penitente",
    "h_cantora","h_alquimista","h_titiritero","h_cuerva"];
})();
