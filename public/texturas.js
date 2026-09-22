/* Marea de Verrath — TEXTURAS DE SUELO Y PIEDRA

   El suelo era el punto flaco: rectángulos de color plano de 32×32 que
   ocupan toda la pantalla. Aquí se generan texturas de verdad —piedra a
   piedra, con mortero, desgaste y musgo— y se tiñen con la paleta de cada
   distrito.

   El truco para que se vean finas a 32 píxeles de baldosa: se dibujan a
   cuatro veces ese tamaño y se reducen con suavizado. Así cada piedra
   lleva su degradado en vez de un solo tono, que es lo que separa el color
   plano de una textura. Se generan una vez por distrito y quedan en
   memoria; no pesan nada porque no son archivos.

   Todas las baldosas cierran sin costura: los centros de piedra se
   colocan en una rejilla con temblor y las distancias se miden en toro,
   de modo que el borde derecho continúa en el izquierdo. */
(function(){
  "use strict";
  var V = window.V = window.V || {};
  var T = 32;              // baldosa del mundo, en píxeles
  var S = 4;               // cuántas veces se dibuja más grande
  var N = T * S;           // lienzo de trabajo

  /* ---------------- azar determinista ----------------
     Mismo trozo de mundo, mismo dibujo, en cualquier máquina. */
  function h(a, b, c){
    var x = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
    x ^= x >>> 15; x = Math.imul(x, 0x2545f491); x ^= x >>> 13;
    return (x >>> 0) / 4294967296;
  }

  /* ---------------- color ---------------- */
  function rgb(s){
    if(s.charAt(0) !== "#") return [110, 104, 134];
    if(s.length === 4) return [parseInt(s[1]+s[1],16), parseInt(s[2]+s[2],16), parseInt(s[3]+s[3],16)];
    return [parseInt(s.substr(1,2),16), parseInt(s.substr(3,2),16), parseInt(s.substr(5,2),16)];
  }
  function mez(a, b, t){
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }
  function claro(c, k){ return mez(c, [255,255,255], k); }
  function oscuro(c, k){ return mez(c, [8,6,14], k); }

  /* ---------------- utilidades de lienzo ---------------- */
  function lienzo(w, hh){
    var c = document.createElement("canvas");
    c.width = w; c.height = hh;
    return c;
  }
  /* Reduce el lienzo de trabajo a tamaño de baldosa con suavizado: es el
     paso que convierte bloques de color en piedra con degradado. */
  function reduce(grande, w, hh){
    var c = lienzo(w, hh), g = c.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(grande, 0, 0, w, hh);
    return c;
  }
  function dato(w, hh){ return new Uint8ClampedArray(w*hh*4); }
  function pon(d, w, x, y, c, a){
    var i = (y*w + x)*4;
    d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = a === undefined ? 255 : a;
  }

  /* ================= EMPEDRADO =================
     Voronoi en toro: cada piedra es la región más cercana a su centro. El
     hueco entre regiones es el mortero, y dentro de cada piedra se finge
     una cúpula iluminada desde arriba a la izquierda. */
  function empedrado(P, semilla, opciones){
    opciones = opciones || {};
    var filas = opciones.filas || 5;            // piedras por baldosa
    var temblor = opciones.temblor === undefined ? 0.36 : opciones.temblor;
    var juntaN = opciones.junta || 0.042;        // grosor del mortero
    var base = rgb(opciones.base || P.stone || "#6E6886");
    var suelo = rgb(P.ground ? P.ground[0] : "#232036");
    var musgo = rgb(P.tuftD || "#2E5034");

    // cinco tonos de piedra, del más oscuro al más claro
    /* Franja de valor estrecha a propósito: el suelo tiene que leerse
       como piedra pero quedarse detrás. Si el empedrado contrasta como en
       una textura de referencia, se come a los personajes. */
    var ramp = [oscuro(base, .34), oscuro(base, .18), base, claro(base, .09), claro(base, .18)];
    var mortero = mez(oscuro(base, .48), suelo, .55);

    var paso = N / filas, sitios = [];
    for(var j = 0; j < filas; j++) for(var i = 0; i < filas; i++){
      var r1 = h(i, j, semilla), r2 = h(i, j, semilla + 977);
      sitios.push({
        x: (i + .5 + (r1 - .5)*2*temblor) * paso,
        y: (j + .5 + (r2 - .5)*2*temblor) * paso,
        tono: 1 + Math.floor(h(i, j, semilla + 31) * 3),        // 1..3
        musgo: h(i, j, semilla + 61) > .90,
        gx: i, gy: j
      });
    }

    var d = dato(N, N);
    for(var y = 0; y < N; y++) for(var x = 0; x < N; x++){
      // dos vecinos más cercanos, midiendo en toro
      var d1 = 1e9, d2 = 1e9, cerca = null;
      for(var k = 0; k < sitios.length; k++){
        var s = sitios[k];
        var dx = x - s.x, dy = y - s.y;
        if(dx >  N/2) dx -= N; if(dx < -N/2) dx += N;
        if(dy >  N/2) dy -= N; if(dy < -N/2) dy += N;
        var dd = dx*dx + dy*dy;
        if(dd < d1){ d2 = d1; d1 = dd; cerca = {s:s, dx:dx, dy:dy}; }
        else if(dd < d2) d2 = dd;
      }
      var r1 = Math.sqrt(d1), r2 = Math.sqrt(d2);
      var borde = (r2 - r1) / paso;                  // 0 en la junta

      if(borde < juntaN){
        // mortero, con su propio grano para que no parezca una línea
        var gm = (h(x, y, semilla + 7) - .5) * 14;
        pon(d, N, x, y, [mortero[0]+gm, mortero[1]+gm, mortero[2]+gm]);
        continue;
      }

      var s2 = cerca.s;
      var c = ramp[s2.tono];
      // cúpula: más claro hacia arriba-izquierda, más oscuro en el canto
      var nx = cerca.dx / paso, ny = cerca.dy / paso;
      var lum = -(nx*0.62 + ny*0.78);
      var canto = Math.min(1, (borde - juntaN) / 0.22);   // 0 junto al mortero
      c = mez(oscuro(c, .22), c, canto);
      c = lum > 0 ? claro(c, lum * 0.15 * canto) : oscuro(c, -lum * 0.18 * canto);
      // brillo especular corto en la ceja de la piedra
      if(lum > .60 && canto > .68) c = claro(c, (lum - .60) * 0.42);
      // grano
      var g2 = (h(x*3 + 1, y*5 + 2, semilla + 13) - .5) * 11;
      c = [c[0]+g2, c[1]+g2, c[2]+g2];
      // musgo en la cara baja de algunas piedras
      if(s2.musgo && ny > .18 && canto < .52)
        c = mez(c, musgo, (1 - canto/.52) * .34);
      pon(d, N, x, y, c);
    }

    var gr = lienzo(N, N);
    gr.getContext("2d").putImageData(new ImageData(d, N, N), 0, 0);
    return reduce(gr, T, T);
  }

  /* ================= LOSAS =================
     Para caminos y plazas: sillares rectangulares a juntas corridas, con
     la ceja clara arriba y la sombra abajo. */
  function losas(P, semilla, opciones){
    opciones = opciones || {};
    var alto = opciones.alto || 2;              // losas a lo alto por baldosa
    var ancho = opciones.ancho || 2;
    var base = rgb(opciones.base || P.road || "#4E4864");
    var suelo = rgb(P.ground ? P.ground[0] : "#232036");
    var musgo = rgb(P.tuftD || "#2E5034");
    var ramp = [oscuro(base, .32), oscuro(base, .16), base, claro(base, .08), claro(base, .17)];
    var mortero = mez(oscuro(base, .46), suelo, .48);
    var ph = N / alto, pw = N / ancho, junta = Math.max(1, Math.round(N * .022));

    var d = dato(N, N);
    for(var y = 0; y < N; y++) for(var x = 0; x < N; x++){
      var fila = Math.floor(y / ph);
      var desfase = (fila % 2) * pw / 2;                 // juntas corridas
      var xr = ((x + desfase) % N + N) % N;
      var col = Math.floor(xr / pw);
      var ly = y - fila*ph, lx = xr - col*pw;
      var c;
      if(ly < junta || lx < junta || lx > pw - junta - 1 || ly > ph - junta - 1){
        var gm = (h(x, y, semilla + 5) - .5) * 12;
        c = [mortero[0]+gm, mortero[1]+gm, mortero[2]+gm];
      } else {
        var tono = 1 + Math.floor(h(col, fila, semilla + 41) * 3);
        c = ramp[tono];
        var fy = (ly - junta) / (ph - junta*2);          // 0 arriba, 1 abajo
        var fx = (lx - junta) / (pw - junta*2);
        c = claro(c, Math.max(0, .13 * (1 - fy*2.2)));   // ceja iluminada
        c = oscuro(c, Math.max(0, .16 * (fy*2.2 - 1.2)));
        c = oscuro(c, Math.max(0, .08 * (fx*2 - 1.4)));
        // vetas y picado
        var v = h(Math.floor(x/2), Math.floor(y/3), semilla + 71);
        if(v > .965) c = oscuro(c, .22);
        var g2 = (h(x*7+3, y*3+1, semilla + 17) - .5) * 10;
        c = [c[0]+g2, c[1]+g2, c[2]+g2];
        if(h(col, fila, semilla + 91) > .86 && fy > .62)
          c = mez(c, musgo, (fy - .62)/.38 * .26);
      }
      pon(d, N, x, y, c);
    }
    var gr = lienzo(N, N);
    gr.getContext("2d").putImageData(new ImageData(d, N, N), 0, 0);
    return reduce(gr, T, T);
  }

  /* ================= TIERRA =================
     Para cultivos y descampados: grano fino con surcos, sin piedra. */
  function tierra(P, semilla){
    var base = rgb(P.soil || "#4E3C24");
    var d = dato(N, N);
    for(var y = 0; y < N; y++) for(var x = 0; x < N; x++){
      var n = h(Math.floor(x/3), Math.floor(y/3), semilla) * .6
            + h(Math.floor(x/9), Math.floor(y/9), semilla + 3) * .4;
      var c = n > .5 ? claro(base, (n-.5)*.44) : oscuro(base, (.5-n)*.50);
      var surco = Math.sin((y / N) * Math.PI * 12) * .5 + .5;
      c = oscuro(c, surco * .10);
      var g2 = (h(x, y, semilla+9) - .5) * 16;
      pon(d, N, x, y, [c[0]+g2, c[1]+g2, c[2]+g2]);
    }
    var gr = lienzo(N, N);
    gr.getContext("2d").putImageData(new ImageData(d, N, N), 0, 0);
    return reduce(gr, T, T);
  }

  /* ---------------- juego de texturas por distrito ---------------- */
  var cache = {};
  V.tex = {
    /* Cuatro variantes de suelo y dos de camino: lo justo para que no se
       vea la rejilla, sin gastar memoria en docenas de baldosas. */
    juego: function(stageKey, P){
      if(cache[stageKey]) return cache[stageKey];
      var suelo = [], camino = [], i;
      /* Las cuatro variantes cambian de reparto de piedra, no de tinte:
         en cuanto cambia el color base se ve la cuadrícula de baldosas. */
      var baseSuelo = P.ground ? P.ground[1] : P.stone;
      for(i = 0; i < 4; i++)
        suelo.push(empedrado(P, 1000 + i*137, {
          filas: i % 2 ? 4 : 3,
          temblor: i < 2 ? .32 : .40,
          base: baseSuelo
        }));
      for(i = 0; i < 2; i++)
        camino.push(losas(P, 2000 + i*211, {alto: 2, ancho: i ? 2 : 3}));
      var plaza = losas(P, 2500, {alto: 3, ancho: 3, base: P.roadL || P.road});
      cache[stageKey] = {
        suelo: suelo, camino: camino, plaza: plaza,
        tierra: tierra(P, 3000),
        muro: empedrado(P, 4000, {filas: 4, temblor: .30, junta: .075, base: P.stone})
      };
      return cache[stageKey];
    },
    olvida: function(){ cache = {}; }
  };
})();
