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

  /* ---------- rampas de cinco tonos ----------
     El salto de 16 a 32 bits en 2D no fue de tamaño: fue de color. Donde
     antes había tres tonos por material ahora hay cinco, más una luz fría
     de borde. pal[k] puede ser un color suelto o una rampa ya hecha. */
  function lum(c){ var x=hex(c); return (x[0]*0.299 + x[1]*0.587 + x[2]*0.114)/255; }
  /* Los materiales muy oscuros no tienen sitio para sombrear: si se les
     restan tonos se funden con el contorno y la figura pierde las piernas.
     Se les sube el suelo antes de construir la rampa. */
  function liftDark(c){
    var l = lum(c);
    if(l >= 0.20) return c;
    return mix(c, "#6E6690", (0.20 - l) * 3.4);
  }
  function ramp5(c0){
    var c = liftDark(c0);
    return [
      mix(c, "#241A38", 0.48),   // 0 sombra fría, nunca negra
      mix(c, "#241A38", 0.24),   // 1 sombra
      c,                         // 2 base
      mix(c, "#FFEFCE", 0.20),   // 3 luz
      mix(c, "#FFF8E8", 0.42)    // 4 brillo
    ];
  }
  function buildRamps(pal){
    var out = {};
    for(var k in pal){
      var v = pal[k];
      if(Object.prototype.toString.call(v) === "[object Array]"){
        out[k] = v.length >= 5 ? v : ramp5(v[1] || v[0]);
      } else out[k] = ramp5(v);
    }
    return out;
  }

  /* ---------- doblar la rejilla sin perder la silueta ----------
     EPX: cada píxel se convierte en cuatro y las esquinas se redondean
     según los vecinos. Es lo que convierte un contorno escalonado en una
     curva, y deja sitio para que el sombreado nuevo tenga dónde lucirse. */
  function epx(rows){
    var w = rows[0].length, h = rows.length, out = [], y, x;
    function at(xx,yy){
      if(xx<0||yy<0||xx>=w||yy>=h) return ".";
      var ch = rows[yy][xx];
      return ch || ".";
    }
    for(y=0;y<h;y++){
      var r0 = "", r1 = "";
      for(x=0;x<w;x++){
        var P = at(x,y), A = at(x,y-1), B = at(x+1,y), C = at(x-1,y), D = at(x,y+1);
        var e0=P, e1=P, e2=P, e3=P;
        if(C===A && C!==D && A!==B) e0 = A;
        if(A===B && A!==C && B!==D) e1 = B;
        if(D===C && D!==B && C!==A) e2 = C;
        if(B===D && B!==A && D!==C) e3 = D;
        r0 += e0 + e1;
        r1 += e2 + e3;
      }
      out.push(r0); out.push(r1);
    }
    return out;
  }
  V.epx = epx;

  /* ---------- pintado ----------
     Cinco tonos según hacia dónde mira el píxel, contorno teñido con el
     material que envuelve, luz fría de canto abajo-derecha y sombra de
     contacto suave. Es el aspecto de la generación de 32 bits. */
  var OUTLINE = "#0A0710";
  var RIM = "#8FA8FF";
  /* Ruido estable por posición: la misma casilla saca siempre el mismo
     número, así la textura no parpadea entre fotogramas. */
  function grain(x,y){
    var h = Math.imul(x|0, 0x27d4eb2d) ^ Math.imul(y|0, 0x165667b1);
    h = Math.imul(h ^ (h>>>15), 0x85ebca6b); h ^= h>>>13;
    return ((h>>>0) % 1000) / 1000;
  }
  function paint(pal, rows, opt){
    opt = opt || {};
    var ramps = buildRamps(pal);
    var w = rows[0].length, h = rows.length;
    var pad = 1;
    var c = document.createElement("canvas");
    c.width = w+pad*2; c.height = h+pad*2 + (opt.shadow?3:0);
    var g = c.getContext("2d");

    function at(x,y){
      if(x<0||y<0||x>=w||y>=h) return null;
      var ch = rows[y][x];
      return (!ch || ch===".") ? null : ch;
    }
    function solid(x,y){ return at(x,y) !== null; }

    // 1) contorno, teñido con el material que tiene al lado
    for(var y=-1; y<=h; y++) for(var x=-1; x<=w; x++){
      if(at(x,y)) continue;
      var near = at(x-1,y)||at(x+1,y)||at(x,y-1)||at(x,y+1)||
                 at(x-1,y-1)||at(x+1,y-1)||at(x-1,y+1)||at(x+1,y+1);
      if(!near) continue;
      var rr = ramps[near];
      // las esquinas del contorno llevan un tono intermedio: es el
      // antialias a mano que redondea la silueta sin emborronarla
      var lados = (at(x-1,y)?1:0)+(at(x+1,y)?1:0)+(at(x,y-1)?1:0)+(at(x,y+1)?1:0);
      var base = rr ? mix(rr[0], OUTLINE, 0.62) : OUTLINE;
      g.fillStyle = opt.outline || (lados === 0 ? mix(base, rr?rr[0]:base, 0.5) : base);
      g.fillRect(x+pad, y+pad, 1, 1);
    }

    // 2) materia: cinco tonos según la orientación a la luz
    for(var y2=0; y2<h; y2++) for(var x2=0; x2<w; x2++){
      var ch = at(x2,y2);
      if(!ch) continue;
      var r = ramps[ch];
      if(!r) continue;

      var up = !solid(x2,y2-1), lf = !solid(x2-1,y2);
      var dn = !solid(x2,y2+1), rt = !solid(x2+1,y2);
      var upL = !solid(x2-1,y2-1), dnR = !solid(x2+1,y2+1);
      var tone = 2;
      if(up && lf) tone = 4;                       // canto que mira a la luz
      else if(up || (lf && !dn)) tone = 3;
      else if(dn && rt) tone = 0;                  // fondo del pliegue
      else if(dn || rt) tone = 1;
      else if(upL) tone = 3;
      // un material distinto encima también es un borde interno
      var above = at(x2,y2-1);
      if(above && above !== ch && tone < 2) tone = 3;

      /* Línea interior: donde dos materiales se tocan va una raya oscura.
         Es lo que separa el brazo del pecho y hace que se lea el volumen
         en vez de una mancha plana. */
      var rr2 = at(x2+1,y2), db = at(x2,y2+1);
      if((rr2 && rr2 !== ch) || (db && db !== ch)) tone = Math.min(tone, 1);

      /* Grano: un dieciseisavo de los píxeles baja un tono. De cerca es
         textura de tela; de lejos, profundidad. */
      var n2 = (ch === "s" || ch === "d") ? 0.5 : grain(x2, y2);
      if(tone === 2 && n2 < 0.16) tone = 1;
      else if(tone === 3 && n2 > 0.88) tone = 2;
      else if(tone === 1 && n2 > 0.93) tone = 2;

      g.fillStyle = r[tone];
      g.fillRect(x2+pad, y2+pad, 1, 1);

      /* Brillo especular en los materiales metálicos: la veta blanca del
         canto que mira a la luz. */
      if(opt.metal && opt.metal.indexOf(ch) >= 0 && tone === 4 && n2 > 0.35){
        g.fillStyle = "#FFFDF4";
        g.fillRect(x2+pad, y2+pad, 1, 1);
      }
    }

    // 3) luz fría de canto: el borde de abajo-derecha recibe el cielo
    if(opt.rim !== false){
      g.globalAlpha = 0.5;
      for(var y3=0; y3<h; y3++) for(var x3=0; x3<w; x3++){
        if(!solid(x3,y3)) continue;
        var edge = (!solid(x3+1,y3) && !solid(x3,y3+1)) ||
                   (!solid(x3+1,y3+1) && !solid(x3+1,y3) && solid(x3,y3+1));
        if(!edge) continue;
        g.fillStyle = RIM;
        g.fillRect(x3+pad, y3+pad, 1, 1);
      }
      g.globalAlpha = 1;
    }

    // 4) sombra de contacto, más blanda que antes
    if(opt.shadow){
      var sw = Math.round(w*0.60), sx = Math.round((c.width-sw)/2), sy = h+pad;
      g.globalAlpha = .34; g.fillStyle = "#06040E";
      g.fillRect(sx+3, sy,   sw-6, 1);
      g.fillRect(sx,   sy+1, sw,   1);
      g.globalAlpha = .22;
      g.fillRect(sx+2, sy+2, sw-4, 1);
      g.globalAlpha = 1;
    }

    c.px = 1;
    return c;
  }

  /* ---------- animación por clips ----------
     Antes había cuatro fotogramas fijos hechos de desplazar las piernas.
     Ahora cada sprite tiene clips con nombre y el rig los genera deformando
     la rejilla por regiones: zancada, balanceo del torso, rebote y, al
     morir, un desplome. Todo sobre la rejilla ya doblada, así que los
     desplazamientos son de medio píxel de mundo y el paso sale suave. */
  function shiftRow(row, dx){
    dx = Math.round(dx) || 0;
    if(!dx) return row;
    if(dx > 0) return (new Array(dx+1).join(".") + row).slice(0, row.length);
    return (row + new Array(-dx+1).join(".")).slice(-dx);
  }
  function warp(rows, fn){
    var out = [];
    for(var y=0;y<rows.length;y++) out.push(shiftRow(rows[y], Math.round(fn(y, rows.length)||0)));
    return out;
  }
  function bob(rows, dy){
    if(!dy) return rows.slice();
    var blank = new Array(rows[0].length+1).join(".");
    if(dy < 0) return rows.slice(1).concat([blank]);
    return [blank].concat(rows.slice(0, rows.length-1));
  }
  function squash(rows, k){
    // aplasta verticalmente quedándose con las filas proporcionales
    var h = rows.length, nh = Math.max(3, Math.round(h*k)), out = [], i;
    for(i=0;i<nh;i++) out.push(rows[Math.min(h-1, Math.round(i/k))]);
    var blank = new Array(rows[0].length+1).join(".");
    while(out.length < h) out.unshift(blank);
    return out;
  }

  function makeClips(pal, rows, opt){
    var legY = opt.legY !== undefined ? opt.legY
              : (opt.legs !== undefined ? opt.legs*2 : Math.round(rows.length*0.78));
    var torsoY = Math.round(legY*0.55);
    var clips = {}, i, ph, frames;

    // andar: ocho fotogramas, zancada y rebote
    frames = [];
    for(i=0;i<8;i++){
      ph = (i/8)*6.283;
      var stride = Math.sin(ph)*2.2;
      var lean   = Math.sin(ph)*0.9;
      var r = warp(rows, function(y){
        if(y >= legY) return stride;
        if(y >= torsoY) return lean*0.5;
        return lean;
      });
      r = bob(r, (Math.sin(ph*2) > 0.25) ? -1 : 0);
      frames.push(paint(pal, r, opt));
    }
    clips.walk = frames;

    // quieto: respira
    frames = [];
    for(i=0;i<4;i++){
      var d = (i===1 || i===2) ? -1 : 0;
      frames.push(paint(pal, bob(rows, d), opt));
    }
    clips.idle = frames;

    // morir: se desploma en cuatro tiempos
    frames = [];
    for(i=0;i<4;i++) frames.push(paint(pal, squash(rows, 1 - i*0.22), opt));
    clips.die = frames;

    return clips;
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

  /* Un píxel de arte ya no es un píxel de mundo: son dos. Cada entrada
     guarda su escala para que el motor la dibuje al tamaño de siempre. */
  V.ART = 2;

  var BANK = {};
  function def(key, pal, rows, opt){
    opt = opt || {};
    var art = opt.art || V.ART;
    var grid = rows;
    if(opt.up !== false && art === 2) grid = epx(rows);   // la rejilla se dobla sola
    var base = paint(pal, grid, opt);
    var clips;
    if(opt.anim === false) clips = {idle:[base], walk:[base], die:[base]};
    else clips = makeClips(pal, grid, opt);
    BANK[key] = {
      f: clips.walk, clips: clips, hit: flashOf(base),
      w: base.width, h: base.height, art: art,
      dw: base.width/art, dh: base.height/art
    };
    return BANK[key];
  }
  V.px = {paint:paint, def:def, bank:BANK, tintOf:tintOf, flashOf:flashOf,
          epx:epx, OUTLINE:OUTLINE};
  V.sprite = function(key, frame, clip){
    var e = BANK[key];
    if(!e) return null;
    var list = (clip && e.clips[clip]) ? e.clips[clip] : e.f;
    return list[(frame||0) % list.length];
  };
  V.spriteHit = function(key){ var e=BANK[key]; return e ? e.hit : null; };
  V.sprInfo = function(key){ return BANK[key] || null; };
  /* Dibuja un sprite a su tamaño de mundo, da igual a qué resolución esté
     pintado. Es el único sitio que sabe de la escala del arte. */
  V.drawSpr = function(ctx, key, frame, x, y, clip, flip){
    var e = BANK[key];
    if(!e) return;
    var cv = V.sprite(key, frame, clip);
    if(!cv) return;
    var dw = cv.width/e.art, dh = cv.height/e.art;
    if(flip){
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1,1);
      ctx.drawImage(cv, -dw/2, -dh, dw, dh); ctx.restore();
    } else {
      ctx.drawImage(cv, Math.round(x-dw/2), Math.round(y-dh), dw, dh);
    }
  };

  /* ==================================================================
     HÉROES — 48 x 60, construidos por piezas
     Cada figura se compone de cabeza, tocado, abrigo con solapas, cinturón
     con hebilla, hombreras, guanteletes y botas. El detalle interno es lo
     que separa la generación de 16 de la de 32: no es que sean más
     grandes, es que dentro pasan cosas.
     ================================================================== */
  var W = 48, H = 60, CX = 24;

  function make(){
    var g = [], y;
    for(y=0;y<H;y++) g.push(new Array(W).fill("."));
    return g;
  }
  function set(g,x,y,c){
    if(!c || x<0 || y<0 || x>=W || y>=H) return;
    g[y][x] = c;
  }
  function box(g,x,y,w,h,c){
    for(var j=0;j<h;j++) for(var i=0;i<w;i++) set(g,x+i,y+j,c);
  }
  function ell(g,cx,cy,rx,ry,c){
    for(var y=-ry;y<=ry;y++) for(var x=-rx;x<=rx;x++)
      if((x*x)/(rx*rx) + (y*y)/(ry*ry) <= 1.02) set(g,cx+x,cy+y,c);
  }
  // tronco que se ensancha o se estrecha de arriba abajo
  function taper(g,y0,y1,w0,w1,c){
    for(var y=y0;y<=y1;y++){
      var t = (y-y0)/Math.max(1,(y1-y0));
      var w = Math.round(w0 + (w1-w0)*t);
      box(g, CX-Math.floor(w/2), y, w, 1, c);
    }
  }
  // refleja la mitad izquierda sobre la derecha
  function mirror(g){
    for(var y=0;y<H;y++) for(var x=0;x<CX;x++) g[y][W-1-x] = g[y][x];
  }
  function rows(g){
    var out=[], y;
    for(y=0;y<H;y++) out.push(g[y].join(""));
    return out;
  }

  /* ---------------- piezas ----------------
     Nada de simetría: la figura está en tres cuartos, con el peso en una
     pierna, un brazo por delante del pecho y el otro por detrás. Es lo que
     separa un muñeco recortado de un personaje. */
  function head(g, o){
    ell(g, CX, 17, 10, 11, "s");                // cráneo, grande a propósito
    box(g, CX-7, 27, 14, 3, "s");               // mandíbula
    box(g, CX-7, 30, 13, 1, "d");
    // ojos: el de delante más abierto, el de detrás en escorzo
    box(g, CX-6, 16, 4, 3, "e");
    box(g, CX+2, 16, 3, 3, "e");
    set(g, CX-5, 16, "q"); set(g, CX+3, 16, "q");
    box(g, CX+1, 21, 3, 3, "d");                // nariz, desplazada
    box(g, CX-3, 25, 7, 1, "d");                // boca
    box(g, CX-10, 20, 2, 5, "d");               // pómulo en sombra
  }
  function neck(g){ box(g, CX-5, 29, 10, 3, "d"); }

  function farArm(g, o){                        // brazo de detrás, en sombra
    var x = CX - ((o.hem || 30)/2) - 6;
    box(g, x, 33, 6, 13, "n");
    box(g, x, 46, 6, 5, "n");
    box(g, x+1, 45, 5, 1, "k");
  }
  function coat(g, o){
    var sh = o.shoulders || 26, hem = o.hem || 30;
    taper(g, 31, 36, sh, sh+2, "c");
    taper(g, 37, 46, sh+2, hem, "c");
    // solapas asimétricas: una cruza por encima de la otra
    for(var i=0;i<10;i++){
      box(g, CX-9+i, 32+i, 3, 1, "r");
      set(g, CX-10+i, 32+i, "k");
      if(i<7) box(g, CX+6-i, 32+i, 2, 1, "r");
    }
    box(g, CX-4, 32, 8, 5, "r");                // pechera
    box(g, CX+1, 41, 1, 6, "k");                // costura, fuera del eje
    set(g, CX-4, 39, "g"); set(g, CX-3, 45, "g"); set(g, CX-2, 50, "g");
    box(g, CX-11, 45, 6, 1, "k");               // pliegue del faldón
    box(g, CX+5, 44, 6, 1, "k");
  }
  function belt(g, o){
    var hem = o.hem || 30;
    box(g, CX-Math.floor(hem/2)-1, 40, hem+2, 3, "m");
    box(g, CX-4, 39, 8, 5, "g");
    box(g, CX-2, 40, 4, 3, "k");
  }
  function nearArm(g, o){                       // brazo de delante, encima
    var x = CX + ((o.hem || 30)/2) - 1;
    box(g, x, 31, 7, 15, "a");
    box(g, x, 32, 1, 13, "k");                  // línea que lo separa del pecho
    box(g, x+1, 30, 6, 2, "m");                 // hombrera
    box(g, x, 46, 7, 6, "b");                   // guantelete grande
    box(g, x, 45, 7, 1, "m");
    box(g, x+1, 49, 5, 1, "k");
  }
  function legs(g){
    // pierna atrasada: más estrecha, más alta y en sombra
    box(g, CX-11, 45, 7, 10, "n");
    box(g, CX-12, 54, 9, 3, "m");               // vuelta de la bota
    box(g, CX-13, 56, 10, 3, "k");
    // pierna adelantada: más ancha y un paso por delante
    box(g, CX+2, 45, 8, 11, "b");
    box(g, CX+1, 55, 10, 3, "m");
    box(g, CX+1, 57, 12, 3, "k");
    box(g, CX+3, 47, 1, 8, "k");                // pliegue del pantalón
  }
  function cape(g, o){
    taper(g, 32, 57, (o.hem||30)+4, (o.hem||30)+12, "k");
  }

  /* tocados: cambian por completo la silueta de la cabeza, que es lo
     primero que se lee a este tamaño */
  var HATS = {
    tricornio: function(g){
      box(g, CX-15, 8, 30, 5, "h");
      taper(g, 2, 8, 12, 26, "h");
      box(g, CX-15, 12, 30, 2, "k");
      box(g, CX+6, 5, 4, 4, "g");               // escarapela, a un lado
    },
    capucha: function(g){
      ell(g, CX, 16, 14, 15, "h");
      box(g, CX-8, 11, 17, 18, "s");            // el rostro asomando
      box(g, CX-6, 16, 4, 3, "e");
      box(g, CX+2, 16, 3, 3, "e");
      box(g, CX-14, 27, 28, 7, "h");
      box(g, CX-10, 9, 20, 3, "h");
      box(g, CX-9, 12, 18, 1, "k");             // borde en sombra
    },
    velo: function(g){
      ell(g, CX, 12, 12, 9, "h");
      box(g, CX-14, 14, 28, 18, "h");
      ell(g, CX, 19, 8, 9, "s");
      box(g, CX-6, 16, 4, 3, "e");
      box(g, CX+2, 16, 3, 3, "e");
      box(g, CX-14, 30, 28, 2, "k");
    },
    chistera: function(g){
      box(g, CX-14, 10, 28, 3, "h");
      box(g, CX-8, 0, 17, 11, "h");
      box(g, CX-8, 7, 17, 2, "m");
      box(g, CX-8, 9, 17, 1, "k");
    },
    pelo: function(g){
      ell(g, CX, 13, 11, 10, "h");
      box(g, CX-13, 10, 5, 18, "h");
      box(g, CX-12, 27, 5, 9, "h");             // mechón que cae por un lado
      box(g, CX+9, 12, 4, 10, "h");
    },
    mascara: function(g){
      ell(g, CX, 16, 11, 11, "h");
      box(g, CX-8, 15, 5, 3, "q");
      box(g, CX+2, 15, 4, 3, "q");
      box(g, CX-1, 21, 5, 13, "h");             // pico
      box(g, CX, 33, 3, 4, "h");
      box(g, CX-1, 21, 1, 13, "k");
    },
    cuernos: function(g){
      ell(g, CX, 14, 11, 10, "h");
      box(g, CX-14, 3, 3, 10, "q");
      box(g, CX-13, 1, 3, 4, "q");
      box(g, CX+11, 4, 3, 9, "q");
      box(g, CX+10, 2, 3, 4, "q");
    },
    capirote: function(g){
      taper(g, 0, 13, 3, 24, "h");
      box(g, CX-12, 13, 25, 3, "m");
      set(g, CX-6, 5, "g"); set(g, CX-2, 9, "g"); set(g, CX+4, 7, "g");
    },
    gorra: function(g){
      ell(g, CX, 13, 11, 8, "h");
      box(g, CX-13, 12, 27, 3, "h");            // visera
      box(g, CX-13, 15, 27, 1, "k");
    },
    ninguno: function(g){
      ell(g, CX, 12, 11, 8, "h");
    }
  };

  function buildHero(o){
    var g = make();
    if(o.cape) cape(g, o);
    farArm(g, o);
    legs(g);
    head(g, o);
    neck(g);
    (HATS[o.hat] || HATS.ninguno)(g);
    coat(g, o);
    belt(g, o);
    nearArm(g, o);
    if(o.extra) o.extra(g, {box:box, ell:ell, set:set, taper:taper, CX:CX});
    return rows(g);
  }

  V.buildHero = buildHero;
  V.HERO_RIG = {W:W, H:H, CX:CX, HATS:HATS};

  /* paleta común: solo cambian los cinco colores que definen al personaje */
  function pal(o){
    return {
      s:o.s||"#C9A283", d:o.d||"#A8815F", e:o.e||"#2A2436", q:o.q||"#E5B95C",
      h:o.h, c:o.c, r:o.r, k:o.k||"#181222", m:o.m||"#6B4A2F",
      n:o.n || mix(o.c, "#1B0E28", 0.34),
      a:o.a || mix(o.c, "#FFEFCE", 0.13),
      b:o.b||"#241C2E", g:o.g||"#D8B24E"
    };
  }
  function hero(key, p, o){
    def(key, pal(p), buildHero(o),
        {shadow:true, art:2, up:false, legY:52, metal:"gm"});
  }

  hero("h_cazador", {h:"#241C32", c:"#3A2C48", r:"#8E1F2F", m:"#6B4A2F"},
       {hat:"tricornio", cape:true, shoulders:24, hem:28});
  hero("h_vicaria", {h:"#2A2436", c:"#CFC7B6", r:"#8E1F2F", m:"#9A8E76", g:"#D8B24E", k:"#3A3428"},
       {hat:"velo", shoulders:24, hem:30});
  hero("h_doctor", {h:"#1A1C22", c:"#2A3640", r:"#7A1E2A", m:"#8A8470", q:"#D2DCC8"},
       {hat:"mascara", cape:true, shoulders:24, hem:28});
  hero("h_bestia", {h:"#6E4634", c:"#5A3A2E", r:"#7A2432", m:"#8A5A3A", s:"#C9A283", q:"#E5C34A", k:"#2A1A12"},
       {hat:"cuernos", shoulders:26, hem:26});
  hero("h_astronoma", {h:"#2E3160", c:"#343A6E", r:"#8FA8FF", m:"#4A4E90", g:"#E5C34A"},
       {hat:"capirote", cape:true, shoulders:22, hem:30});
  hero("h_verdugo", {h:"#241C1A", c:"#3E322C", r:"#8E1F2F", m:"#6E5C46", s:"#B99A7C", b:"#1A1410"},
       {hat:"capucha", shoulders:28, hem:28});

  hero("h_viuda", {h:"#1A1420", c:"#3A2C48", r:"#7A2E52", m:"#4A3A56", k:"#120E18"},
       {hat:"velo", cape:true, shoulders:22, hem:30});
  hero("h_farolero", {h:"#2A2438", c:"#34405A", r:"#F2C46A", m:"#8A8C9E", g:"#FFE9B0"},
       {hat:"chistera", shoulders:24, hem:28});
  hero("h_sepulturero", {h:"#4A4438", c:"#33302A", r:"#6E4A2E", m:"#7A6A4E", b:"#241E16"},
       {hat:"gorra", shoulders:26, hem:28});
  hero("h_nina", {h:"#6E3A52", c:"#8A5A78", r:"#C2263A", m:"#A87090", s:"#EFE4D8", k:"#2A2030"},
       {hat:"pelo", shoulders:20, hem:24});
  hero("h_coleccionista", {h:"#1C1826", c:"#2E2A3A", r:"#E5B95C", m:"#7A6A4E", g:"#E5B95C"},
       {hat:"chistera", cape:true, shoulders:24, hem:28});
  hero("h_penitente", {h:"#2A2028", c:"#3A2E34", r:"#8E1F2F", m:"#8A8C9E", s:"#B99A7C"},
       {hat:"capucha", shoulders:28, hem:26});
  hero("h_cantora", {h:"#5A2E4A", c:"#7A3A5E", r:"#EFE4D8", m:"#D8B24E", s:"#D8B79A"},
       {hat:"pelo", cape:true, shoulders:22, hem:32});
  hero("h_alquimista", {h:"#26382E", c:"#2E4438", r:"#B6E06A", m:"#6E7A5A", q:"#7CC6FF"},
       {hat:"capucha", shoulders:24, hem:28});
  hero("h_titiritero", {h:"#E4E0D2", c:"#2A2438", r:"#8E1F2F", m:"#8A7A5A", g:"#D8B24E", e:"#1A1A2A"},
       {hat:"mascara", shoulders:24, hem:28});
  hero("h_cuerva", {h:"#1E1A24", c:"#3A3448", r:"#8A8C9E", m:"#4A4458", q:"#E5B95C", k:"#120F18"},
       {hat:"mascara", cape:true, shoulders:22, hem:30});

  V.HERO_SPRITES = ["h_cazador","h_vicaria","h_doctor","h_bestia","h_astronoma","h_verdugo",
    "h_viuda","h_farolero","h_sepulturero","h_nina","h_coleccionista","h_penitente",
    "h_cantora","h_alquimista","h_titiritero","h_cuerva"];
})();
