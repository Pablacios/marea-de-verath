/* Marea de Verrath — MOBILIARIO DIBUJADO

   Los props venían de rejillas de texto de un carácter por píxel: rápido de
   escribir, pero el detalle está limitado por lo que se puede teclear. Los
   de aquí se dibujan con código a cuatro veces el tamaño final y se reducen
   con suavizado, igual que las texturas de suelo. Eso les da degradado por
   piedra, cantos redondeados y hiedra hoja a hoja sin dibujar un solo
   píxel a mano.

   Son reinterpretaciones de las referencias, no copias: la forma y el
   espíritu vienen de ahí, el trazo lo pone el motor con la paleta del
   distrito, así que casan con los personajes y no parecen pegados.

   Cada pieza se registra en el banco de sprites con el mismo formato que
   las de texto, de modo que el mundo las estampa sin enterarse. */
(function(){
  "use strict";
  var V = window.V = window.V || {};
  var S = 4;                       // resolución de trabajo

  /* ---------------- azar determinista ---------------- */
  function h(a, b, c){
    var x = Math.imul(a|0, 0x27d4eb2d) ^ Math.imul(b|0, 0x165667b1) ^ Math.imul(c|0, 0x9e3779b1);
    x ^= x >>> 15; x = Math.imul(x, 0x2545f491); x ^= x >>> 13;
    return (x >>> 0) / 4294967296;
  }

  /* ---------------- color ---------------- */
  function rgb(s){
    if(!s || s.charAt(0) !== "#") return [120,120,130];
    if(s.length === 4) return [parseInt(s[1]+s[1],16), parseInt(s[2]+s[2],16), parseInt(s[3]+s[3],16)];
    return [parseInt(s.substr(1,2),16), parseInt(s.substr(3,2),16), parseInt(s.substr(5,2),16)];
  }
  function hex(c){
    function p(v){ v = Math.max(0, Math.min(255, Math.round(v))); return (v<16?"0":"")+v.toString(16); }
    return "#"+p(c[0])+p(c[1])+p(c[2]);
  }
  function mez(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function cl(s,k){ return hex(mez(rgb(s),[255,255,255],k)); }
  function os(s,k){ return hex(mez(rgb(s),[8,6,14],k)); }

  /* ---------------- lienzo ---------------- */
  function lienzo(w,hh){ var c=document.createElement("canvas"); c.width=w; c.height=hh; return c; }

  /* Reduce a tamaño final y añade el contorno oscuro que llevan todos los
     sprites del juego, para que el prop no flote sobre el suelo. */
  function acaba(gr, w, hh, opt){
    opt = opt || {};
    var c = lienzo(w, hh), g = c.getContext("2d");
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(gr, 0, 0, w, hh);
    if(opt.contorno !== false) contorno(c, opt.tinta || "#0A0812");
    return c;
  }
  /* Contorno: un píxel oscuro allí donde el sprite toca el vacío. */
  function contorno(c, tinta){
    var g = c.getContext("2d"), w = c.width, hh = c.height;
    var d = g.getImageData(0,0,w,hh), a = d.data;
    var al = new Uint8Array(w*hh);
    for(var i=0;i<w*hh;i++) al[i] = a[i*4+3] > 40 ? 1 : 0;
    var t = rgb(tinta);
    for(var y=0;y<hh;y++) for(var x=0;x<w;x++){
      var i2 = y*w+x;
      if(al[i2]) continue;
      var vecino = (x>0&&al[i2-1]) || (x<w-1&&al[i2+1]) || (y>0&&al[i2-w]) || (y<hh-1&&al[i2+w]);
      if(!vecino) continue;
      a[i2*4] = t[0]; a[i2*4+1] = t[1]; a[i2*4+2] = t[2]; a[i2*4+3] = 235;
    }
    g.putImageData(d,0,0);
  }
  /* Sombra elíptica bajo la pieza, como la que llevan los personajes. */
  function sombra(g, cx, cy, rx, ry){
    g.save();
    g.globalAlpha = .30; g.fillStyle = "#06040E";
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.283); g.fill();
    g.restore();
  }

  /* ---------------- sillería ----------------
     Muro de piedra con hiladas a junta corrida, ceja clara arriba y
     mortero hundido. Es la base del muro, del arco y de la casa. */
  function sillar(g, x, y, w, hh, col, semilla, filaAlto, bloqueAncho){
    var fa = filaAlto || 5*S;                  // alto de hilada
    var ba = bloqueAncho || fa*2.2;            // ancho de sillar
    var junta = Math.max(1, Math.round(S*0.45));
    g.fillStyle = os(col, .45);                // mortero de fondo
    g.fillRect(x, y, w, hh);
    var fila = 0;
    for(var fy = 0; fy < hh; fy += fa, fila++){
      var alto = Math.min(fa, hh - fy) - junta;
      if(alto <= 1) continue;
      var desf = (fila % 2) * ba * 0.5;        // juntas corridas
      for(var fx = -desf; fx < w; fx += ba){
        var bx = x + Math.max(0, fx);
        var bw = Math.min(fx + ba, w) - Math.max(0, fx) - junta;
        if(bw <= 1) continue;
        var t = h(Math.round(fx), fila, semilla);
        var base = t < .34 ? os(col,.13) : (t < .70 ? col : cl(col,.08));
        var gd = g.createLinearGradient(bx, y+fy, bx, y+fy+alto);
        gd.addColorStop(0, cl(base,.20));
        gd.addColorStop(.42, base);
        gd.addColorStop(1, os(base,.30));
        g.fillStyle = gd;
        g.fillRect(bx, y+fy, bw, alto);
        if(t > .88){                            // alguna piedra picada
          g.fillStyle = os(base,.34);
          g.fillRect(bx+bw*0.3, y+fy+alto*0.4, bw*0.3, Math.max(1,S*0.4));
        }
      }
    }
  }

  /* ---------------- hiedra ----------------
     Manchas de hoja sueltas, más densas arriba, que caen por la piedra.
     Reinterpreta la ruina cubierta de la referencia. */
  function hiedra(g, x, y, w, hh, hoja, semilla, densidad){
    var n = Math.round((w*hh) / (S*S*10) * (densidad || 1));
    for(var i=0;i<n;i++){
      var r1 = h(i, semilla, 1), r2 = h(i, semilla, 2), r3 = h(i, semilla, 3);
      // más hiedra arriba y en los bordes
      var fy = Math.pow(r2, 1.7);
      var px = x + r1*w, py = y + fy*hh;
      var s2 = (1.1 + r3*1.5) * S * 0.5;
      var t = h(i, semilla, 4);
      g.fillStyle = t < .30 ? os(hoja,.34) : (t < .68 ? hoja : cl(hoja,.20));
      g.beginPath();
      g.ellipse(px, py, s2, s2*0.78, r3*3.14, 0, 6.283);
      g.fill();
      if(t > .84){                                  // nervio claro
        g.fillStyle = cl(hoja,.40);
        g.fillRect(px - s2*0.2, py - s2*0.5, Math.max(1,S*0.25), s2);
      }
    }
  }

  /* ================= PIEZAS ================= */

  /* Matorral: montones de hoja apilados, silueta irregular y base oscura.
     Reinterpreta el arbusto de la referencia. */
  function matorral(P){
    var W = 26, H = 18;                 // tamaño final en píxeles de mundo
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var hoja = P.leaf || "#3A6A44", hd = P.leafD || "#234029", hl = P.leafL || "#5C9866";
    // silueta: cinco lóbulos de distinto alto
    var lob = [[.14,.62],[.32,.86],[.52,1.0],[.72,.82],[.88,.58]];
    for(var k=0;k<lob.length;k++){
      var cx = lob[k][0]*W*S, rr = lob[k][1]*H*S*0.62;
      g.fillStyle = hd;
      g.beginPath(); g.ellipse(cx, H*S - rr*0.35, rr*0.95, rr, 0, 0, 6.283); g.fill();
    }
    // mota de hoja encima, con la luz desde arriba-izquierda
    var n = Math.round(W*H*S*S/(S*S*7));
    for(var i=0;i<n;i++){
      var r1=h(i,7,1), r2=h(i,7,2), r3=h(i,7,3);
      var px = r1*W*S, py = (0.18 + r2*0.82)*H*S;
      // dentro de la silueta
      var dentro = false;
      for(var j=0;j<lob.length;j++){
        var c2 = lob[j][0]*W*S, r4 = lob[j][1]*H*S*0.62;
        var dx=(px-c2)/(r4*0.95), dy=(py-(H*S-r4*0.35))/r4;
        if(dx*dx+dy*dy < 1){ dentro = true; break; }
      }
      if(!dentro) continue;
      var lum = 1 - (px/(W*S))*0.35 - (py/(H*S))*0.55;
      var col = lum > .62 ? hl : (lum > .34 ? hoja : hd);
      if(r3 > .93) col = cl(hl, .18);
      g.fillStyle = col;
      var s2 = (0.9 + r3*1.3)*S*0.6;
      g.beginPath(); g.ellipse(px, py, s2, s2*0.8, r3*3.1, 0, 6.283); g.fill();
    }
    return acaba(gr, W, H);
  }

  /* Farola de gas: fanal de seis caras con vidrio encendido, cuello y
     fuste acanalado, base escalonada. Reinterpreta la farola de la
     referencia sin copiarla. */
  function farola(P){
    var W = 16, H = 46;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    /* El hierro se oscurece por debajo de la paleta del distrito: si el
       cuerpo de la farola tiene el mismo valor que el vidrio, la luz deja
       de leerse como luz. */
    var fe = os(P.ironD || "#2A2640", .28), fd = os(P.ironD || "#2A2640", .52);
    var oro = "#C9A455", luz = P.win || "#FFD37A", lum = P.flameL || "#FFF6D8";
    var cx = W*S/2;

    function barra(y, hh, ancho, col){
      g.fillStyle = col; g.fillRect(cx-ancho/2, y, ancho, hh);
      g.fillStyle = cl(col,.22); g.fillRect(cx-ancho/2, y, Math.max(1,ancho*0.22), hh);
      g.fillStyle = os(col,.32); g.fillRect(cx+ancho/2-Math.max(1,ancho*0.2), y, Math.max(1,ancho*0.2), hh);
    }
    // base escalonada
    barra(H*S-4*S, 4*S, 9*S, fd);
    barra(H*S-7*S, 3*S, 7*S, fe);
    barra(H*S-9*S, 2*S, 5.5*S, fd);
    // fuste
    barra(20*S, H*S-29*S, 3.2*S, fe);
    g.fillStyle = oro; g.fillRect(cx-1.6*S, 30*S, 3.2*S, S*0.5);
    // collarín
    barra(17*S, 3*S, 5.5*S, fd);
    barra(15.5*S, 1.5*S, 7*S, fe);
    // fanal: trapecio con vidrio
    g.fillStyle = fd;
    g.beginPath();
    g.moveTo(cx-5*S, 15.5*S); g.lineTo(cx+5*S, 15.5*S);
    g.lineTo(cx+3.4*S, 5.5*S); g.lineTo(cx-3.4*S, 5.5*S);
    g.closePath(); g.fill();
    g.fillStyle = luz;
    g.beginPath();
    g.moveTo(cx-3.8*S, 14.4*S); g.lineTo(cx+3.8*S, 14.4*S);
    g.lineTo(cx+2.6*S, 6.6*S); g.lineTo(cx-2.6*S, 6.6*S);
    g.closePath(); g.fill();
    // llama dentro
    g.fillStyle = lum;
    g.beginPath(); g.ellipse(cx, 11*S, 2*S, 2.8*S, 0, 0, 6.283); g.fill();
    // montantes del fanal
    g.fillStyle = oro;
    g.fillRect(cx-3.9*S, 6.4*S, S*0.55, 8.2*S);
    g.fillRect(cx+3.35*S, 6.4*S, S*0.55, 8.2*S);
    g.fillRect(cx-4.2*S, 14.2*S, 8.4*S, S*0.6);
    // capucha y remate
    g.fillStyle = fe;
    g.beginPath();
    g.moveTo(cx-5.6*S, 5.8*S); g.lineTo(cx+5.6*S, 5.8*S);
    g.lineTo(cx+2.2*S, 2.4*S); g.lineTo(cx-2.2*S, 2.4*S);
    g.closePath(); g.fill();
    g.fillStyle = cl(fe,.24);
    g.fillRect(cx-5.6*S, 5.8*S, 11.2*S, S*0.6);
    g.fillStyle = oro;
    g.beginPath(); g.ellipse(cx, 1.6*S, 1.2*S, 1.2*S, 0, 0, 6.283); g.fill();
    return acaba(gr, W, H);
  }

  /* Muro de piedra con remate: hiladas de canto rodado y una fila de
     piezas claras arriba, con musgo al pie. Reinterpreta el muro de la
     referencia. Dos piezas: tramo horizontal y vertical. */
  function muro(P, vertical){
    var W = vertical ? 18 : 34, H = vertical ? 34 : 22;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = P.stone || "#6E6886";
    var cuerpo = os(pie, .20), remate = cl(pie, .26);
    var rh = 4*S;                              // remate

    if(vertical){
      /* Muro que corre hacia el fondo: se ve la coronación de canto y una
         franja de cara en el lado izquierdo, que es la que le da el grosor. */
      sillar(g, 2*S, 0, 5*S, H*S, os(cuerpo,.16), 13, 4.5*S, 5*S);
      for(var vy = 0; vy < H*S; vy += 4.6*S){
        var tv = h(0, Math.round(vy), 27);
        var col = tv < .5 ? remate : cl(remate,.08);
        var bh = Math.min(4.6*S, H*S-vy) - S*0.45;
        var gd2 = g.createLinearGradient(7*S, vy, 16*S, vy+bh);
        gd2.addColorStop(0, cl(col,.22)); gd2.addColorStop(.55, col); gd2.addColorStop(1, os(col,.30));
        g.fillStyle = gd2;
        g.fillRect(7*S, vy, 9*S, bh);
      }
      g.fillStyle = os(remate,.44);
      g.fillRect(6.6*S, 0, S*0.6, H*S);
    } else {
      var y0 = H*S - 17*S;
      sillar(g, 0, y0+rh, W*S, 17*S-rh, cuerpo, 11, 4.5*S, 10*S);
      // coronación: piezas anchas y claras, como en la referencia
      var rw = 5.5*S;
      for(var x = 0; x < W*S; x += rw){
        var t = h(Math.round(x), 3, 21);
        var col = t < .4 ? remate : cl(remate, .09);
        var bw = Math.min(rw, W*S-x) - S*0.45;
        var gd = g.createLinearGradient(x, y0, x, y0+rh);
        gd.addColorStop(0, cl(col,.26)); gd.addColorStop(.5, col); gd.addColorStop(1, os(col,.28));
        g.fillStyle = gd;
        g.fillRect(x, y0, bw, rh);
      }
    }
    // musgo al pie
    hiedra(g, 0, H*S-4*S, W*S, 4*S, P.tuftD || "#2E5034", 5, 0.9);
    return acaba(gr, W, H);
  }

  /* Arco en ruinas comido por la hiedra: dos machones, dovelas arriba, el
     hueco abierto y una base de sillar. Reinterpreta la ruina con hiedra. */
  function arco(P){
    var W = 40, H = 46;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = P.stone || "#6E6886";
    var cuerpo = cl(pie, .06);
    var cx = W*S/2, suelo = H*S - 5*S;

    // zócalo
    sillar(g, 1*S, suelo, (W-2)*S, 5*S, os(pie,.26), 33, 3.2*S);
    // machones
    sillar(g, 5*S, 12*S, 8*S, suelo-12*S, cuerpo, 7, 5*S);
    sillar(g, W*S-13*S, 12*S, 8*S, suelo-12*S, cuerpo, 9, 5*S);
    // arco de dovelas: se dibuja como anillo y se recorta por dentro
    var rOut = 15*S, rIn = 9.5*S, ay = 20*S;
    g.save();
    g.beginPath();
    g.arc(cx, ay, rOut, Math.PI, 0);
    g.arc(cx, ay, rIn, 0, Math.PI, true);
    g.closePath();
    g.clip();
    // dovelas radiales
    for(var k=0;k<13;k++){
      var a0 = Math.PI + (k/13)*Math.PI, a1 = Math.PI + ((k+1)/13)*Math.PI;
      var t = h(k, 2, 55);
      g.fillStyle = t<.35 ? os(cuerpo,.16) : (t<.72 ? cuerpo : cl(cuerpo,.10));
      g.beginPath();
      g.moveTo(cx+Math.cos(a0)*rIn, ay+Math.sin(a0)*rIn);
      g.lineTo(cx+Math.cos(a0)*rOut, ay+Math.sin(a0)*rOut);
      g.lineTo(cx+Math.cos(a1)*rOut, ay+Math.sin(a1)*rOut);
      g.lineTo(cx+Math.cos(a1)*rIn, ay+Math.sin(a1)*rIn);
      g.closePath(); g.fill();
      g.strokeStyle = os(cuerpo,.42); g.lineWidth = S*0.4; g.stroke();
    }
    g.restore();
    // desconchones: se comen la esquina alta derecha
    g.save();
    g.globalCompositeOperation = "destination-out";
    for(var m=0;m<7;m++){
      var r1=h(m,4,71), r2=h(m,4,72);
      g.beginPath();
      g.ellipse(W*S-8*S + r1*7*S, 5*S + r2*10*S, (1.4+r1*2.6)*S, (1.2+r2*2.2)*S, 0, 0, 6.283);
      g.fill();
    }
    g.restore();
    // hiedra: cae desde la clave y por el machón izquierdo
    hiedra(g, 2*S, 2*S, 16*S, (H-10)*S, P.leaf || "#3A6A44", 13, 1.15);
    hiedra(g, cx-13*S, 3*S, 26*S, 14*S, P.leaf || "#3A6A44", 17, 0.95);
    hiedra(g, W*S-14*S, 6*S, 13*S, (H-14)*S, P.leafD || "#234029", 19, 0.75);
    return acaba(gr, W, H);
  }

  /* Roca: dos cantos rodados con cúpula, veta clara y musgo al pie. */
  function roca(P){
    var W = 22, H = 17;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = os(P.stone || "#6E6886", .16);
    var bultos = [[.34,.62,.34,.46],[.66,.72,.26,.34],[.50,.52,.22,.26]];
    for(var k=0;k<bultos.length;k++){
      var b = bultos[k];
      var cx = b[0]*W*S, cy = b[1]*H*S, rx = b[2]*W*S, ry = b[3]*H*S;
      var col = k===0 ? pie : (k===1 ? os(pie,.14) : cl(pie,.06));
      var gd = g.createRadialGradient(cx-rx*.42, cy-ry*.55, rx*.12, cx, cy, rx*1.15);
      gd.addColorStop(0, cl(col,.30));
      gd.addColorStop(.48, col);
      gd.addColorStop(1, os(col,.42));
      g.fillStyle = gd;
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.283); g.fill();
    }
    g.fillStyle = cl(pie,.30);
    g.fillRect(0.22*W*S, 0.52*H*S, 0.20*W*S, Math.max(1,S*0.45));
    g.fillStyle = os(pie,.40);
    g.fillRect(0.44*W*S, 0.68*H*S, 0.26*W*S, Math.max(1,S*0.4));
    hiedra(g, 0, H*S*0.74, W*S, H*S*0.26, P.tuftD || "#2E5034", 23, 0.7);
    return acaba(gr, W, H);
  }

  /* Lápida: losa de canto redondeado, inscripción hundida y base hundida
     en la tierra. */
  function lapida(P){
    var W = 20, H = 24;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = P.stone || "#6E6886";
    var cx = W*S/2;
    g.fillStyle = pie;
    g.beginPath();
    g.moveTo(3*S, H*S); g.lineTo(3*S, 8*S);
    g.arc(cx, 8*S, cx-3*S, Math.PI, 0);
    g.lineTo(W*S-3*S, H*S);
    g.closePath();
    var gd = g.createLinearGradient(3*S, 0, W*S-3*S, H*S);
    gd.addColorStop(0, cl(pie,.24)); gd.addColorStop(.5, pie); gd.addColorStop(1, os(pie,.30));
    g.fillStyle = gd; g.fill();
    // moldura interior
    g.strokeStyle = os(pie,.34); g.lineWidth = S*0.5;
    g.beginPath();
    g.moveTo(5.5*S, H*S-1*S); g.lineTo(5.5*S, 8.5*S);
    g.arc(cx, 8.5*S, cx-5.5*S, Math.PI, 0);
    g.lineTo(W*S-5.5*S, H*S-1*S);
    g.stroke();
    // inscripción
    g.fillStyle = os(pie,.42);
    for(var r=0;r<3;r++) g.fillRect(7*S, (12+r*3)*S, (W-14)*S + (r===2? -2*S:0), Math.max(1,S*0.6));
    g.fillStyle = cl(pie,.30);
    g.fillRect(7*S, 11.6*S, (W-14)*S, Math.max(1,S*0.3));
    hiedra(g, 1*S, H*S-5*S, (W-2)*S, 5*S, P.tuftD || "#2E5034", 29, 0.8);
    return acaba(gr, W, H);
  }

  /* Cruz de piedra con los brazos biselados y la peana torcida. */
  function cruz(P){
    var W = 20, H = 26;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = cl(P.stone || "#6E6886", .04);
    var cx = W*S/2;
    function pieza(x,y,w,hh){
      var gd = g.createLinearGradient(x, y, x+w, y+hh);
      gd.addColorStop(0, cl(pie,.26)); gd.addColorStop(.5, pie); gd.addColorStop(1, os(pie,.32));
      g.fillStyle = gd; g.fillRect(x,y,w,hh);
      g.fillStyle = cl(pie,.32); g.fillRect(x, y, w, Math.max(1,S*0.5));
      g.fillStyle = os(pie,.38); g.fillRect(x, y+hh-S*0.5, w, Math.max(1,S*0.5));
    }
    pieza(cx-2.6*S, 2*S, 5.2*S, (H-4)*S);       // palo
    pieza(3.5*S, 8*S, (W-7)*S, 5*S);            // brazos
    g.fillStyle = os(pie,.46);                   // junta
    g.fillRect(cx-2.6*S, 8*S, 5.2*S, Math.max(1,S*0.4));
    pieza(4.5*S, H*S-3.5*S, (W-9)*S, 3.5*S);    // peana
    hiedra(g, 3*S, H*S-6*S, (W-6)*S, 6*S, P.tuftD || "#2E5034", 31, 0.7);
    return acaba(gr, W, H);
  }

  /* Pozo: brocal de canto rodado, agua negra y arco de hierro. */
  function pozo(P){
    var W = 26, H = 26;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = P.stone || "#6E6886", fe = P.iron || "#544E6E";
    var cx = W*S/2, cy = 17*S;
    // brocal
    g.fillStyle = os(pie,.34);
    g.beginPath(); g.ellipse(cx, cy, 11*S, 7*S, 0, 0, 6.283); g.fill();
    // piedras del borde
    for(var k=0;k<11;k++){
      var a = (k/11)*6.283, t = h(k,1,45);
      var px = cx + Math.cos(a)*9.6*S, py = cy + Math.sin(a)*6*S;
      var col = t<.35 ? os(pie,.12) : (t<.72 ? pie : cl(pie,.10));
      var gd = g.createRadialGradient(px-S, py-S, S*.3, px, py, 2.6*S);
      gd.addColorStop(0, cl(col,.28)); gd.addColorStop(1, os(col,.34));
      g.fillStyle = gd;
      g.beginPath(); g.ellipse(px, py, 2.4*S, 2.1*S, 0, 0, 6.283); g.fill();
    }
    // agua
    g.fillStyle = "#0B0912";
    g.beginPath(); g.ellipse(cx, cy, 6.6*S, 3.8*S, 0, 0, 6.283); g.fill();
    g.fillStyle = "rgba(200,210,255,.10)";
    g.beginPath(); g.ellipse(cx-1.6*S, cy-1*S, 2.4*S, 1.1*S, 0, 0, 6.283); g.fill();
    // dos postes, la viga y el cubo colgando de la cuerda
    function poste(px){
      g.fillStyle = os(P.wood || "#7E5C36", .22);
      g.fillRect(px-1.2*S, 3.5*S, 2.4*S, 13*S);
      g.fillStyle = cl(P.wood || "#7E5C36", .16);
      g.fillRect(px-1.2*S, 3.5*S, S*0.7, 13*S);
    }
    poste(cx-8*S); poste(cx+8*S);
    g.fillStyle = fe;
    g.fillRect(cx-9.6*S, 2.2*S, 19.2*S, 2*S);
    g.fillStyle = cl(fe,.26);
    g.fillRect(cx-9.6*S, 2.2*S, 19.2*S, S*0.6);
    // cuerda y cubo
    g.fillStyle = P.rope || "#8A7454";
    g.fillRect(cx-S*0.3, 4.2*S, S*0.6, 4.4*S);
    g.fillStyle = os(P.wood || "#7E5C36", .10);
    g.beginPath();
    g.moveTo(cx-2.4*S, 8.4*S); g.lineTo(cx+2.4*S, 8.4*S);
    g.lineTo(cx+1.9*S, 12.4*S); g.lineTo(cx-1.9*S, 12.4*S);
    g.closePath(); g.fill();
    g.fillStyle = cl(P.wood || "#7E5C36", .22);
    g.fillRect(cx-2.4*S, 8.4*S, 4.8*S, S*0.6);
    g.fillStyle = fe;
    g.fillRect(cx-2.2*S, 10.2*S, 4.4*S, S*0.5);
    hiedra(g, 2*S, H*S-6*S, (W-4)*S, 6*S, P.tuftD || "#2E5034", 37, 0.6);
    return acaba(gr, W, H);
  }

  /* Columna caída a medias: fuste acanalado, capitel y basa. */
  function columna(P){
    var W = 16, H = 40;
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pie = cl(P.stone || "#6E6886", .08);
    var cx = W*S/2;
    // fuste con acanaladuras
    for(var k=0;k<5;k++){
      var fx = 3.5*S + k*(9*S/5);
      var lum = 1 - Math.abs(k-1.2)/3.4;
      var col = lum > .7 ? cl(pie,.24) : (lum > .42 ? pie : os(pie,.24));
      g.fillStyle = col;
      g.fillRect(fx, 5*S, 9*S/5 - S*0.2, (H-9)*S);
    }
    // capitel y basa
    function bloque(y, hh, w){
      var gd = g.createLinearGradient(cx-w/2, y, cx-w/2, y+hh);
      gd.addColorStop(0, cl(pie,.30)); gd.addColorStop(.55, pie); gd.addColorStop(1, os(pie,.32));
      g.fillStyle = gd; g.fillRect(cx-w/2, y, w, hh);
    }
    bloque(2*S, 3.4*S, 13*S);
    bloque(H*S-4.5*S, 4.5*S, 13*S);
    // desconchón arriba
    g.save(); g.globalCompositeOperation = "destination-out";
    g.beginPath(); g.ellipse(cx+5*S, 3*S, 2.6*S, 2*S, 0, 0, 6.283); g.fill();
    g.restore();
    hiedra(g, 2*S, H*S*0.5, (W-4)*S, H*S*0.5, P.leafD || "#234029", 41, 0.55);
    return acaba(gr, W, H);
  }

  /* Casa: base de sillería, entramado de madera, tejado de tablillas con
     viga cumbrera y chimenea, puerta de arco y ventanas con luz dentro.
     Reinterpreta la casita de la referencia, no la copia. */
  function casa(P){
    var W = 128, H = 104;                      // ocupa cuatro por tres baldosas
    var gr = lienzo(W*S, H*S), g = gr.getContext("2d");
    var pared = P.wall || "#635674", madera = P.wood || "#7E5C36";
    var teja = P.roof || "#A63040", tejaL = P.roofL || "#C84A5A", tejaD = P.roofD || "#5E1622";
    var piedra = P.stone || "#6E6886";
    var puerta = P.door || "#5E4228", luz = P.win || "#FFD37A";

    var suelo = H*S, cuerpoAlto = 46*S, techoAlto = 40*S;
    var yCuerpo = suelo - cuerpoAlto;
    var yTecho = yCuerpo - techoAlto;

    // --- zócalo de piedra ---
    sillar(g, 0, suelo - 16*S, W*S, 16*S, piedra, 51, 5*S, 11*S);
    // --- pared de entramado ---
    var gd = g.createLinearGradient(0, yCuerpo, 0, suelo - 16*S);
    gd.addColorStop(0, cl(pared,.14)); gd.addColorStop(1, os(pared,.18));
    g.fillStyle = gd;
    g.fillRect(2*S, yCuerpo, W*S - 4*S, cuerpoAlto - 16*S);
    // vigas: pies derechos y una carrera
    g.fillStyle = os(madera,.14);
    var pies = [2, 30, 62, 94, 122];
    for(var k=0;k<pies.length;k++) g.fillRect(pies[k]*S, yCuerpo, 4*S, cuerpoAlto - 16*S);
    g.fillRect(2*S, yCuerpo, W*S-4*S, 3.5*S);
    g.fillStyle = cl(madera,.18);
    g.fillRect(2*S, yCuerpo, W*S-4*S, S*0.8);

    // --- tejado a dos aguas con tablillas ---
    var cx = W*S/2, vuelo = 6*S;
    for(var i = 0; i < techoAlto; i += 3.4*S){
      var t = i / techoAlto;
      /* La cumbrera va arriba y el alero abajo: la anchura crece con la
         altura, no al contrario. */
      var media = 3*S + (W*S/2 + vuelo - 3*S) * t;
      var y = yTecho + i;
      var filaCol = i < 3.4*S ? cl(tejaL,.10) : (((i/(3.4*S))|0) % 2 ? teja : cl(teja,.07));
      // hilada
      g.fillStyle = filaCol;
      g.fillRect(cx - media, y, media*2, 3.4*S);
      // tablillas: muescas verticales
      g.fillStyle = os(filaCol,.28);
      for(var x = -media; x < media; x += 5.5*S){
        var jj = h(Math.round(x), i, 63);
        g.fillRect(cx + x + jj*2*S, y, S*0.55, 3.4*S);
      }
      // sombra bajo la hilada
      g.fillStyle = os(filaCol,.34);
      g.fillRect(cx - media, y + 3.4*S - S*0.7, media*2, S*0.7);
    }
    // viga cumbrera y aleros
    g.fillStyle = os(madera,.22);
    g.fillRect(cx - 2*S, yTecho - 2*S, 4*S, techoAlto + 2*S);
    g.fillStyle = cl(madera,.14);
    g.fillRect(cx - 2*S, yTecho - 2*S, S*0.9, techoAlto + 2*S);
    g.fillStyle = tejaD;
    g.fillRect(0, yCuerpo - 3.4*S, W*S, 3.4*S);
    g.fillStyle = cl(tejaD,.18);
    g.fillRect(0, yCuerpo - 3.4*S, W*S, S*0.7);

    // --- chimenea ---
    var chx = W*S*0.70;
    sillar(g, chx, yTecho + 6*S, 11*S, 20*S, piedra, 57, 4*S, 11*S);
    g.fillStyle = os(piedra,.34);
    g.fillRect(chx - S, yTecho + 6*S, 13*S, 3*S);
    g.fillStyle = "#0C0A14";
    g.fillRect(chx + 2.5*S, yTecho + 7.4*S, 6*S, 1.6*S);

    // --- puerta de arco ---
    var px = cx - 11*S, py = suelo - 30*S;
    g.fillStyle = os(piedra,.10);                       // jambas
    g.fillRect(px - 2.5*S, py, 27*S, 30*S);
    g.fillStyle = puerta;
    g.beginPath();
    g.moveTo(px, suelo); g.lineTo(px, py + 10*S);
    g.arc(px + 11*S, py + 10*S, 11*S, Math.PI, 0);
    g.lineTo(px + 22*S, suelo); g.closePath();
    var gp = g.createLinearGradient(px, py, px + 22*S, suelo);
    gp.addColorStop(0, cl(puerta,.20)); gp.addColorStop(1, os(puerta,.26));
    g.fillStyle = gp; g.fill();
    g.fillStyle = os(puerta,.40);                       // duelas
    for(var d2 = 4; d2 < 22; d2 += 5) g.fillRect(px + d2*S, py + 3*S, S*0.6, 27*S);
    g.fillStyle = "#C9A455";                            // pomo
    g.beginPath(); g.ellipse(px + 17*S, suelo - 14*S, 1.4*S, 1.4*S, 0, 0, 6.283); g.fill();

    // --- ventanas ---
    function ventana(vx, vy){
      g.fillStyle = os(madera,.20);
      g.fillRect(vx - 2*S, vy - 2*S, 20*S, 18*S);
      g.fillStyle = luz;
      g.fillRect(vx, vy, 16*S, 14*S);
      g.fillStyle = cl(luz,.30);
      g.fillRect(vx, vy, 16*S, 3*S);
      g.fillStyle = os(madera,.30);                     // parteluz
      g.fillRect(vx + 7.4*S, vy, S*0.9, 14*S);
      g.fillRect(vx, vy + 6.4*S, 16*S, S*0.9);
      g.fillStyle = cl(madera,.10);                     // alféizar
      g.fillRect(vx - 3*S, vy + 16*S, 22*S, 2.4*S);
    }
    ventana(14*S, suelo - 34*S);
    ventana(W*S - 32*S, suelo - 34*S);

    // hiedra por una esquina y musgo al pie
    hiedra(g, 0, yCuerpo - 6*S, 22*S, 40*S, P.leafD || "#234029", 67, 0.55);
    hiedra(g, 0, suelo - 5*S, W*S, 5*S, P.tuftD || "#2E5034", 71, 0.7);
    return acaba(gr, W, H);
  }

  /* ---------------- alta en el banco ----------------
     Se mete con el mismo formato que los sprites de texto para que el
     mundo los estampe sin saber de dónde salieron. */
  function alta(key, cv){
    V.px.bank[key] = {
      f: [cv], clips: {idle:[cv], walk:[cv], die:[cv]},
      hit: V.px.flashOf ? V.px.flashOf(cv) : cv,
      w: cv.width, h: cv.height, art: 1,
      dw: cv.width, dh: cv.height
    };
  }

  /* ---------------- la casa dibujada ----------------
     Viene en tonos cálidos, que casan con el Distrito de Sangre pero no
     con el bosque ni con la catedral. Para los otros dos se tiñe con el
     color del distrito manteniendo el valor: así el dibujo sigue siendo
     el mismo y deja de parecer pegado de otro juego. */
  var TINTE = { bosque: "#4E7038", catedral: "#7C4EA6" };
  function casaDibujada(stageKey){
    if(!V.CASA) return null;
    var im = V.CASA;
    var c = lienzo(im.width, im.height), g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    var t = TINTE[stageKey];
    var tm = (V.TINTE_MAPA || {})[stageKey];
    if(t){
      g.globalCompositeOperation = "color";
      g.globalAlpha = 0.42;
      g.fillStyle = t;
      g.fillRect(0, 0, c.width, c.height);
    }
    if(tm){                      // mismo velo que el resto del mobiliario
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = tm.a * 0.26;
      g.fillStyle = tm.v;
      g.fillRect(0, 0, c.width, c.height);
    }
    g.globalCompositeOperation = "destination-in";
    g.globalAlpha = 1;
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "source-over";
    return c;
  }
  /* Cuando llega un dibujo hay que tirar lo que ya estaba montado. */
  V.olvidaCasa = function(){
    for(var k in V.px.bank) if(/_casa$/.test(k)) delete V.px.bank[k];
  };
  V.olvidaProps = function(){
    for(var k in V.px.bank) if(/^p_/.test(k)) delete V.px.bank[k];
  };

  /* ---------------- piezas que vienen en archivo ----------------
     Se tiñen con el color del distrito igual que el suelo, para que un
     muro de piedra caliza no cante en la Catedral Pálida. La fuerza es
     algo menor que en el suelo: el mobiliario puede permitirse resaltar
     un punto más, que para eso está encima. */
  function deArchivo(nombre, stageKey){
    var img = V.mapArt ? V.mapArt(nombre) : null;
    if(!img || !V.tinta) return null;
    /* El mobiliario se tiñe menos y se queda bastante más claro que el
       suelo: es lo que hace que una lápida se lea como lápida y no como
       una mancha sobre el empedrado. */
    /* El mobiliario NO lleva velo: se queda a su brillo, que es lo que le
       permite recortarse contra un suelo oscuro. Solo se le pasa el color
       del distrito, flojo, y se le pone el contorno del resto de piezas,
       que es lo que de verdad lo despega del empedrado. */
    var t = (V.TINTE_MAPA || {})[stageKey] || {c:"#4E4864", f:0.58};
    var c = V.tinta(img, t.c, t.f * 0.45, null, 0);
    contorno(c, "#0A0812");
    return c;
  }

  /* ---------------- árboles teñidos ----------------
     Los árboles eran lo único del mapa que se dibujaba en crudo, y por eso
     saltaban en verde vivo sobre un suelo morado de noche. Reciben el
     mismo tinte flojo que el resto del mobiliario, con un poco más de
     velo: son masa de fondo, no un elemento que haya que mirar. */
  var arbolCache = {};
  V.olvidaArboles = function(){ arbolCache = {}; };
  V.arbolTenido = function(n, stageKey){
    var img = V.arbol ? V.arbol(n) : null;
    if(!img || !V.tinta) return img;
    var k = stageKey + "#" + n;
    if(arbolCache[k]) return arbolCache[k];
    var t = (V.TINTE_MAPA || {})[stageKey] || {c:"#4E4864", f:0.58, v:"#1B1828", a:0.40};
    arbolCache[k] = V.tinta(img, t.c, t.f * 0.62, t.v, t.a * 0.42);
    return arbolCache[k];
  };

  /* Se llama desde buildProps, después de las piezas de texto: las que
     están aquí pisan a la versión antigua del mismo nombre. */
  V.buildProps64 = function(stageKey, P){
    var pre = "p_" + stageKey + "_";
    if(V.px.bank[pre + "arco"]){
      // ya está el resto; solo falta colocar la casa si acaba de cargar
      if(!V.px.bank[pre + "casa"]){
        var d2 = casaDibujada(stageKey);
        alta(pre + "casa", d2 || casa(P));
      }
      return;
    }
    /* Las piezas de código se calientan y se bajan de luz hacia la piedra
       de los dibujos: si no, una cruz gris azulada canta al lado de una
       lápida de piedra caliza. */
    function junto(cv){
      return V.tinta ? V.tinta(cv, "#6E5B44", 0.30, "#1E1A2A", 0.26) : cv;
    }
    /* Donde hay dibujo, manda el dibujo; donde no, la pieza de código. */
    alta(pre + "matorral", deArchivo("p_matorral", stageKey) || matorral(P));
    alta(pre + "farola",   deArchivo("p_farola",   stageKey) || farola(P));
    alta(pre + "lapida",   deArchivo("p_lapida",   stageKey) || lapida(P));
    alta(pre + "muroH",    deArchivo("p_muro",     stageKey) || muro(P, false));
    var fin = deArchivo("p_muro_fin", stageKey);
    if(fin) alta(pre + "muroFin", fin);
    alta(pre + "roca",     junto(roca(P)));
    alta(pre + "cruz",     junto(cruz(P)));
    alta(pre + "pozo",     junto(pozo(P)));
    alta(pre + "columna",  junto(columna(P)));
    alta(pre + "muroV",    deArchivo("p_muro_v", stageKey) || junto(muro(P, true)));
    alta(pre + "arco",     junto(arco(P)));
    var dib = casaDibujada(stageKey);
    alta(pre + "casa", dib || casa(P));
  };
})();
