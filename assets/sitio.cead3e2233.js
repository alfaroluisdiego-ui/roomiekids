/* Roomie Kids. JS pequeño, sin dependencias. Sin JavaScript el sitio se ve y funciona completo;
   esto agrega Mi lista, el buscador, la galería con visor y los ajustes del pedido. */
(function () {
  'use strict';
  var d = document;
  var raiz = d.documentElement.getAttribute('data-raiz') || './';
  var sinMovimiento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Vista local con file://: los enlaces a carpetas necesitan index.html. */
  var esArchivo = location.protocol === 'file:';
  function local(href) {
    if (!esArchivo || !href || /^([a-z]+:|\/\/|#)/i.test(href)) return href;
    var corte = href.search(/[?#]/);
    var ruta = corte < 0 ? href : href.slice(0, corte);
    var resto = corte < 0 ? '' : href.slice(corte);
    if (ruta === '' || ruta === './') ruta = './index.html';
    else if (ruta.charAt(ruta.length - 1) === '/') ruta += 'index.html';
    return ruta + resto;
  }
  function arreglarEnlaces(ambito) {
    if (!esArchivo) return;
    (ambito || d).querySelectorAll('a[href]').forEach(function (a) {
      a.setAttribute('href', local(a.getAttribute('href')));
    });
  }
  arreglarEnlaces(d);

  /* ------------------------------------------------------------ menú y desplegable */
  function cerrable(det) {
    var boton = det.querySelector('summary');
    d.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && det.open) { det.open = false; boton.focus(); }
    });
    d.addEventListener('click', function (ev) {
      if (det.open && !det.contains(ev.target)) det.open = false;
    });
    det.addEventListener('focusout', function (ev) {
      if (det.open && ev.relatedTarget && !det.contains(ev.relatedTarget)) det.open = false;
    });
  }
  d.querySelectorAll('[data-menu], [data-desplegable]').forEach(cerrable);
  d.querySelectorAll('[data-menu]').forEach(function (m) {
    m.addEventListener('toggle', function () {
      var c = m.closest('.cabecera');
      if (c) c.classList.toggle('cabecera--menu', m.open);
    });
  });

  /* Chips de categoría en móvil: el de la página actual queda a la vista dentro de su carril. */
  d.querySelectorAll('.chips ul').forEach(function (ul) {
    var activo = ul.querySelector('[aria-current="page"]');
    if (activo && ul.scrollWidth > ul.clientWidth) {
      var li = activo.parentNode;
      var x = li.getBoundingClientRect().left - ul.getBoundingClientRect().left + ul.scrollLeft;
      ul.scrollLeft = Math.max(0, x - (ul.clientWidth - li.offsetWidth) / 2);
    }
  });

  /* ------------------------------------------------------------ Mi lista (localStorage) */
  var CLAVE = 'rk-lista';
  function leerLista() {
    try {
      var v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      if (!Array.isArray(v)) return [];
      var vistos = {};
      return v.filter(function (x) {
        if (!x || typeof x.s !== 'string' || vistos[x.s]) return false;
        vistos[x.s] = true;
        return true;
      });
    } catch (err) { return []; }
  }
  function guardarLista(l) {
    try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (err) { return false; }
  }
  var hayAlmacen = (function () {
    try { var k = '__rk'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (err) { return false; }
  })();
  function enLista(slug) { return leerLista().some(function (x) { return x.s === slug; }); }
  function agregar(slug, variante) {
    var l = leerLista();
    var ya = l.filter(function (x) { return x.s === slug; })[0];
    if (ya) { if (variante) ya.v = variante; } else l.push({ s: slug, v: variante || '' });
    guardarLista(l);
    cambio();
  }
  function quitar(slug) {
    guardarLista(leerLista().filter(function (x) { return x.s !== slug; }));
    cambio();
  }
  function textoProductos(n) { return n === 1 ? '1 producto' : n + ' productos'; }

  var oyentes = [];
  function cambio() { oyentes.forEach(function (f) { f(); }); }
  window.addEventListener('storage', function (ev) { if (ev.key === CLAVE) cambio(); });

  /* contador de la cabecera */
  function contador() {
    var n = leerLista().length;
    d.querySelectorAll('[data-lista-enlace]').forEach(function (a) {
      var span = a.querySelector('[data-lista-n]');
      if (span) { span.textContent = n; span.hidden = n === 0; }
      a.setAttribute('aria-label', n ? 'Mi lista, ' + textoProductos(n) : 'Mi lista');
    });
  }
  if (hayAlmacen) { oyentes.push(contador); contador(); }

  /* aviso breve al agregar o quitar. La región viva ([data-aviso-vivo]) está siempre en la página,
     oculta a la vista, y solo cambia su texto: así los lectores de pantalla la leen. La caja visible
     dura 8 s y se detiene mientras tenga el mouse o el foco encima. */
  var aviso = d.querySelector('[data-aviso-lista]');
  var vivo = d.querySelector('[data-aviso-vivo]');
  var avisoTiempo = null, avisoPausa = false, avisoDeshacer = null;
  function ocultarAviso() { if (aviso) aviso.classList.add('aviso-lista--fuera'); avisoDeshacer = null; }
  function programarAviso() {
    clearTimeout(avisoTiempo);
    avisoTiempo = setTimeout(function () { if (!avisoPausa) ocultarAviso(); }, 8000);
  }
  function avisar(texto, deshacer) {
    if (vivo) {
      vivo.textContent = '';
      setTimeout(function () { vivo.textContent = texto; }, 60);
    }
    if (!aviso) return;
    var t = aviso.querySelector('[data-aviso-texto]');
    if (t) t.textContent = texto;
    var b = aviso.querySelector('[data-aviso-deshacer]');
    avisoDeshacer = deshacer || null;
    if (b) b.hidden = !deshacer;
    var enlace = aviso.querySelector('[data-aviso-enlace]');
    if (enlace) enlace.hidden = !!deshacer;
    aviso.classList.remove('aviso-lista--fuera');
    programarAviso();
  }
  if (aviso) {
    var pausar = function () { avisoPausa = true; clearTimeout(avisoTiempo); };
    var seguir = function () { avisoPausa = false; programarAviso(); };
    aviso.addEventListener('mouseenter', pausar);
    aviso.addEventListener('mouseleave', seguir);
    aviso.addEventListener('focusin', pausar);
    aviso.addEventListener('focusout', seguir);
    var botonDeshacer = aviso.querySelector('[data-aviso-deshacer]');
    if (botonDeshacer) botonDeshacer.addEventListener('click', function () {
      var f = avisoDeshacer;
      avisoPausa = false;
      ocultarAviso();
      if (f) f();
    });
  }

  /* corazón de las tarjetas */
  function marcarCorazones() {
    d.querySelectorAll('[data-guardar]').forEach(function (b) {
      var esta = enLista(b.getAttribute('data-guardar'));
      b.setAttribute('aria-pressed', esta ? 'true' : 'false');
    });
  }
  if (hayAlmacen) {
    d.querySelectorAll('[data-guardar]').forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        var slug = b.getAttribute('data-guardar');
        if (enLista(slug)) {
          var antes = leerLista().filter(function (x) { return x.s === slug; })[0];
          quitar(slug);
          avisar('Lo quitamos de su lista.', function () { agregar(slug, antes ? antes.v : ''); b.focus(); });
        }
        else { agregar(slug, ''); avisar('Agregado a su lista.'); }
      });
    });
    oyentes.push(marcarCorazones);
    marcarCorazones();
  }

  /* combos: agregar todos */
  function marcarCombos() {
    d.querySelectorAll('[data-combo-caja]').forEach(function (caja) {
      var boton = caja.querySelector('[data-combo]');
      var listo = caja.querySelector('[data-combo-listo]');
      var todos = boton.getAttribute('data-combo').split(' ').every(enLista);
      boton.hidden = todos;
      if (listo) listo.hidden = !todos;
    });
  }
  if (hayAlmacen) {
    d.querySelectorAll('[data-combo-caja]').forEach(function (caja) {
      caja.hidden = false;
      caja.querySelector('[data-combo]').addEventListener('click', function (ev) {
        ev.currentTarget.getAttribute('data-combo').split(' ').forEach(function (s) { if (!enLista(s)) agregar(s, ''); });
        avisar('Agregados a su lista.');
        var listo = caja.querySelector('[data-combo-listo] a');
        if (listo) listo.focus();
      });
    });
    oyentes.push(marcarCombos);
    marcarCombos();
  }

  /* ------------------------------------------------------------ ficha: opciones y pedido */
  var radios = d.querySelectorAll('[data-color]');
  var enlacesPedir = d.querySelectorAll('[data-pedir]');
  function opcionElegida() {
    var r = d.querySelector('[data-color]:checked');
    return r ? r.value : '';
  }
  function actualizarPedir(color) {
    enlacesPedir.forEach(function (a) {
      var base = (a.getAttribute('data-base') || a.getAttribute('href')).split('?')[0];
      if (!a.getAttribute('data-base')) a.setAttribute('data-base', base);
      a.setAttribute('href', base + (color ? '?color=' + encodeURIComponent(color) : ''));
    });
  }

  /* botón Agregar a mi lista de la ficha */
  var fichaLista = d.querySelector('[data-ficha-lista]');
  function marcarFicha() {
    if (!fichaLista) return;
    var esta = enLista(fichaLista.getAttribute('data-slug'));
    fichaLista.querySelector('[data-lista-agregar]').hidden = esta;
    fichaLista.querySelector('[data-lista-esta]').hidden = !esta;
  }
  if (fichaLista && hayAlmacen) {
    fichaLista.hidden = false;
    var slugFicha = fichaLista.getAttribute('data-slug');
    fichaLista.querySelector('[data-lista-agregar]').addEventListener('click', function () {
      agregar(slugFicha, opcionElegida());
      avisar('Agregado a su lista.');
      var enlace = fichaLista.querySelector('[data-lista-esta] a');
      if (enlace) enlace.focus();
    });
    fichaLista.querySelector('[data-lista-quitar]').addEventListener('click', function () {
      quitar(slugFicha);
      avisar('Lo quitamos de su lista.');
      fichaLista.querySelector('[data-lista-agregar]').focus();
    });
    oyentes.push(marcarFicha);
    marcarFicha();
  }

  /* ------------------------------------------------------------ galería */
  var galerias = [];
  d.querySelectorAll('[data-galeria]').forEach(function (g) {
    var pista = g.querySelector('.galeria__pista');
    var fotos = g.querySelectorAll('.galeria__foto');
    var minis = g.querySelectorAll('.galeria__mini');
    var contador = g.querySelector('[data-contador]');
    var ant = g.querySelector('[data-galeria-ant]');
    var sig = g.querySelector('[data-galeria-sig]');
    var ayuda = g.querySelector('[data-galeria-ayuda]');
    var ampliarB = g.querySelector('[data-ampliar]');
    if (!pista || !fotos.length) return;
    var total = fotos.length, actual = 0, pendiente = false;
    function marcar(i) {
      if (i === actual && contador && contador.getAttribute('data-listo')) return;
      actual = i;
      if (ampliarB) ampliarB.setAttribute('aria-label', 'Ampliar la foto ' + (i + 1) + ' de ' + total);
      if (contador) { contador.textContent = 'Foto ' + (i + 1) + ' de ' + total; contador.setAttribute('data-listo', '1'); }
      minis.forEach(function (m, j) {
        if (j === i) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current');
      });
      if (ant) ant.disabled = i === 0;
      if (sig) sig.disabled = i === total - 1;
    }
    function ir(i, suave) {
      i = Math.max(0, Math.min(total - 1, i));
      pista.scrollTo({ left: i * pista.clientWidth, behavior: (suave && !sinMovimiento) ? 'smooth' : 'auto' });
      marcar(i);
    }
    minis.forEach(function (m, i) { m.addEventListener('click', function () { ir(i, true); }); });
    if (ant) { ant.hidden = false; ant.addEventListener('click', function () { ir(actual - 1, true); }); }
    if (sig) { sig.hidden = false; sig.addEventListener('click', function () { ir(actual + 1, true); }); }
    pista.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () {
        pendiente = false;
        marcar(Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth)));
      });
    }, { passive: true });
    pista.addEventListener('keydown', function (ev) {
      var paso = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
      if (!paso) return;
      ev.preventDefault();
      ir(actual + paso, true);
    });
    marcar(0);
    var api = { ir: ir, actual: function () { return actual; }, g: g };
    galerias.push(api);

    /* visor a pantalla completa */
    var visor = d.querySelector('[data-visor]');
    if (visor && typeof visor.showModal === 'function') {
      if (ayuda) ayuda.hidden = false;
      if (ampliarB) {
        ampliarB.hidden = false;
        ampliarB.addEventListener('click', function () { abrirVisor(visor, actual, api); });
      }
      fotos.forEach(function (f, i) {
        var img = f.querySelector('img');
        if (!img) return;
        img.addEventListener('click', function () { abrirVisor(visor, i, api); });
        img.style.cursor = 'zoom-in';
      });
    }
  });

  radios.forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      actualizarPedir(r.value);
      var i = r.getAttribute('data-foto');
      if (i !== null && galerias[0]) galerias[0].ir(+i, true);
    });
  });
  (function () {
    var colorPedido = null;
    try { colorPedido = new URLSearchParams(location.search).get('color'); } catch (err) { colorPedido = null; }
    radios.forEach(function (r) {
      if (colorPedido && r.value === colorPedido) {
        r.checked = true;
        actualizarPedir(r.value);
        var i = r.getAttribute('data-foto');
        if (i !== null && galerias[0]) galerias[0].ir(+i, false);
      }
    });
  })();

  /* ------------------------------------------------------------ visor con zoom */
  var estadoVisor = null;
  function abrirVisor(visor, inicio, galeria) {
    if (estadoVisor) return;
    var escena = visor.querySelector('[data-visor-escena]');
    var figuras = visor.querySelectorAll('[data-visor-foto]');
    var contador = visor.querySelector('[data-visor-contador]');
    var total = figuras.length;
    var st = {
      i: inicio, s: 1, x: 0, y: 0, punteros: {}, pinza: null, arrastre: null, toque: 0, toqueX: 0, toqueY: 0,
      volverA: d.activeElement
    };
    estadoVisor = st;
    function img() { return figuras[st.i].querySelector('img'); }
    /* Hasta donde la foto se sigue viendo nítida: el doble de su resolución en pantalla (entre 1,5 y 4). */
    function tope() {
      var im = img();
      if (!im || !im.naturalWidth || !im.offsetWidth) return 2.5;
      return Math.min(4, Math.max(1.5, im.naturalWidth / im.offsetWidth * 2));
    }
    function cargar(i) {
      var f = figuras[i];
      if (!f) return;
      var im = f.querySelector('img');
      if (im && !im.getAttribute('src')) {
        im.setAttribute('srcset', im.getAttribute('data-srcset'));
        im.setAttribute('src', im.getAttribute('data-src'));
      }
    }
    function aplicar(suave) {
      var im = img();
      if (!im) return;
      im.style.transition = (suave && !sinMovimiento) ? 'transform 220ms cubic-bezier(0.16,1,0.3,1)' : 'none';
      im.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.s + ')';
      visor.classList.toggle('visor--zoom', st.s > 1.01);
    }
    function limitar() {
      var im = img();
      if (!im) return;
      var w = im.offsetWidth * st.s, h = im.offsetHeight * st.s;
      var mx = Math.max(0, (w - escena.clientWidth) / 2), my = Math.max(0, (h - escena.clientHeight) / 2);
      st.x = Math.max(-mx, Math.min(mx, st.x));
      st.y = Math.max(-my, Math.min(my, st.y));
    }
    function mostrar(i) {
      var anterior = img();
      if (anterior) { anterior.style.transform = ''; anterior.style.transition = 'none'; }
      st.i = (i + total) % total; st.s = 1; st.x = 0; st.y = 0;
      figuras.forEach(function (f, j) { f.hidden = j !== st.i; });
      cargar(st.i); cargar(st.i + 1); cargar(st.i - 1);
      if (contador) contador.textContent = 'Foto ' + (st.i + 1) + ' de ' + total;
      aplicar(false);
    }
    function zoomEn(s, px, py, suave) {
      var r = escena.getBoundingClientRect();
      var cx = px - (r.left + r.width / 2), cy = py - (r.top + r.height / 2);
      var nuevo = Math.max(1, Math.min(tope(), s));
      st.x = cx - (cx - st.x) * (nuevo / st.s);
      st.y = cy - (cy - st.y) * (nuevo / st.s);
      st.s = nuevo;
      if (st.s === 1) { st.x = 0; st.y = 0; }
      limitar();
      aplicar(suave);
    }
    function centro() { var r = escena.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

    function abajo(ev) {
      if (ev.target.closest('button')) return;
      var imAct = img();
      if (imAct) imAct.style.willChange = 'transform';
      escena.setPointerCapture && escena.setPointerCapture(ev.pointerId);
      st.punteros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(st.punteros);
      if (ids.length === 2) {
        var a = st.punteros[ids[0]], b = st.punteros[ids[1]];
        st.pinza = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: st.s, x: st.x, y: st.y,
                     mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        st.arrastre = null;
      } else if (ids.length === 1) {
        st.arrastre = { x0: ev.clientX, y0: ev.clientY, x: st.x, y: st.y, dx: 0, t: Date.now() };
      }
    }
    function mover(ev) {
      if (!st.punteros[ev.pointerId]) return;
      st.punteros[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(st.punteros);
      if (st.pinza && ids.length >= 2) {
        var a = st.punteros[ids[0]], b = st.punteros[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var r = escena.getBoundingClientRect();
        var c0x = st.pinza.mx - (r.left + r.width / 2), c0y = st.pinza.my - (r.top + r.height / 2);
        var c1x = mx - (r.left + r.width / 2), c1y = my - (r.top + r.height / 2);
        var s = Math.max(1, Math.min(tope(), st.pinza.s * dist / st.pinza.dist));
        st.x = c1x - (c0x - st.pinza.x) * (s / st.pinza.s);
        st.y = c1y - (c0y - st.pinza.y) * (s / st.pinza.s);
        st.s = s;
        limitar();
        aplicar(false);
      } else if (st.arrastre) {
        var dx = ev.clientX - st.arrastre.x0, dy = ev.clientY - st.arrastre.y0;
        if (st.s > 1.01) {
          st.x = st.arrastre.x + dx; st.y = st.arrastre.y + dy;
          limitar();
          aplicar(false);
        } else if (total > 1) {
          st.arrastre.dx = dx;
          var im = img();
          if (im) { im.style.transition = 'none'; im.style.transform = 'translate(' + dx + 'px,0)'; }
        }
      }
    }
    function arriba(ev) {
      if (!st.punteros[ev.pointerId]) return;
      delete st.punteros[ev.pointerId];
      var quedan = Object.keys(st.punteros).length;
      if (st.pinza) {
        if (quedan < 2) st.pinza = null;
        if (st.s < 1.05) { st.s = 1; st.x = 0; st.y = 0; aplicar(true); }
        return;
      }
      var a = st.arrastre;
      st.arrastre = null;
      if (!a) return;
      var movio = Math.hypot(ev.clientX - a.x0, ev.clientY - a.y0) > 10;
      if (st.s <= 1.01 && total > 1 && Math.abs(a.dx) > 60) {
        mostrar(st.i + (a.dx < 0 ? 1 : -1));
        return;
      }
      if (st.s <= 1.01) { st.x = 0; aplicar(true); }
      if (movio) return;
      /* doble toque: acerca o aleja en el punto tocado */
      var ahora = Date.now();
      if (ahora - st.toque < 320 && Math.hypot(ev.clientX - st.toqueX, ev.clientY - st.toqueY) < 30) {
        st.toque = 0;
        if (st.s > 1.01) zoomEn(1, ev.clientX, ev.clientY, true);
        else zoomEn(Math.min(2.5, tope()), ev.clientX, ev.clientY, true);
      } else {
        st.toque = ahora; st.toqueX = ev.clientX; st.toqueY = ev.clientY;
      }
    }
    function rueda(ev) {
      ev.preventDefault();
      zoomEn(st.s * (ev.deltaY < 0 ? 1.2 : 1 / 1.2), ev.clientX, ev.clientY, false);
    }
    function teclas(ev) {
      /* Con la foto acercada, las flechas la mueven 40 px; sin acercar, cambian de foto. */
      var pasos = { ArrowRight: [-40, 0], ArrowLeft: [40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
      if (st.s > 1.01 && pasos[ev.key]) {
        ev.preventDefault();
        st.x += pasos[ev.key][0]; st.y += pasos[ev.key][1];
        limitar(); aplicar(true);
      }
      else if (ev.key === 'ArrowRight' && total > 1) { ev.preventDefault(); mostrar(st.i + 1); }
      else if (ev.key === 'ArrowLeft' && total > 1) { ev.preventDefault(); mostrar(st.i - 1); }
      else if (ev.key === '+' || ev.key === '=') { var c = centro(); zoomEn(st.s * 1.5, c[0], c[1], true); }
      else if (ev.key === '-') { var c2 = centro(); zoomEn(st.s / 1.5, c2[0], c2[1], true); }
      else if (ev.key === 'Tab') {
        /* foco atrapado dentro del visor */
        var focos = Array.prototype.filter.call(visor.querySelectorAll('button'), function (b) { return !b.hidden && b.offsetParent !== null; });
        if (!focos.length) return;
        var i = focos.indexOf(d.activeElement);
        if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); focos[focos.length - 1].focus(); }
        else if (!ev.shiftKey && i === focos.length - 1) { ev.preventDefault(); focos[0].focus(); }
      }
    }
    var cerrarBtn = visor.querySelector('[data-visor-cerrar]');
    var antBtn = visor.querySelector('[data-visor-ant]');
    var sigBtn = visor.querySelector('[data-visor-sig]');
    function alCerrarClic() { visor.close(); }
    function alAnt() { mostrar(st.i - 1); }
    function alSig() { mostrar(st.i + 1); }
    /* Botón o gesto Atrás del teléfono: cierra el visor en vez de salir de la ficha. */
    var enHistoria = false;
    function alAtras() { if (estadoVisor === st) { st.porAtras = true; visor.close(); } }
    function alCerrar() {
      window.removeEventListener('popstate', alAtras);
      if (enHistoria && !st.porAtras && history.state && history.state.rkVisor) history.back();
      figuras.forEach(function (f) { var im = f.querySelector('img'); if (im) im.style.willChange = ''; });
      escena.removeEventListener('pointerdown', abajo);
      escena.removeEventListener('pointermove', mover);
      escena.removeEventListener('pointerup', arriba);
      escena.removeEventListener('pointercancel', arriba);
      escena.removeEventListener('wheel', rueda);
      visor.removeEventListener('keydown', teclas);
      visor.removeEventListener('close', alCerrar);
      if (cerrarBtn) cerrarBtn.removeEventListener('click', alCerrarClic);
      if (antBtn) antBtn.removeEventListener('click', alAnt);
      if (sigBtn) sigBtn.removeEventListener('click', alSig);
      d.documentElement.classList.remove('sin-scroll');
      var i = st.i;
      estadoVisor = null;
      if (galeria) galeria.ir(i, false);
      /* El foco vuelve al botón Ampliar (que ya dice la foto actual) o a lo que lo tenía; si se abrió
         tocando la foto, no se mueve. */
      var v = st.volverA;
      if (v && v !== d.body && v.focus) {
        try { v.focus({ preventScroll: true }); } catch (err) { v.focus(); }
      }
    }
    escena.addEventListener('pointerdown', abajo);
    escena.addEventListener('pointermove', mover);
    escena.addEventListener('pointerup', arriba);
    escena.addEventListener('pointercancel', arriba);
    escena.addEventListener('wheel', rueda, { passive: false });
    visor.addEventListener('keydown', teclas);
    visor.addEventListener('close', alCerrar);
    if (cerrarBtn) cerrarBtn.addEventListener('click', alCerrarClic);
    if (antBtn) antBtn.addEventListener('click', alAnt);
    if (sigBtn) sigBtn.addEventListener('click', alSig);
    d.documentElement.classList.add('sin-scroll');
    try { history.pushState({ rkVisor: 1 }, ''); enHistoria = true; } catch (err) { enHistoria = false; }
    window.addEventListener('popstate', alAtras);
    visor.showModal();
    mostrar(inicio);
    if (cerrarBtn) cerrarBtn.focus();
  }

  /* ------------------------------------------------------------ barra fija (ficha y Mi lista)
     Visible mientras el botón principal no está en pantalla, antes de llegar a él y después de
     pasarlo, para que la acción quede siempre al alcance del pulgar (DISENO.md, sección 5). */
  var barra = d.querySelector('[data-barra]');
  var principal = d.getElementById('pedir');
  if (barra && principal && 'IntersectionObserver' in window) {
    var botonBarra = barra.querySelector('a');
    new IntersectionObserver(function (entradas) {
      var e = entradas[entradas.length - 1];
      var mostrar = !e.isIntersecting;
      barra.classList.toggle('barra--visible', mostrar);
      if (botonBarra) botonBarra.tabIndex = mostrar ? 0 : -1;
    }).observe(principal);
  }

  /* ------------------------------------------------------------ Cómo comprar: índice */
  var indice = d.querySelector('[data-indice]');
  if (indice && 'IntersectionObserver' in window && window.matchMedia) {
    var enlaces = indice.querySelectorAll('a[href^="#"]');
    var ancho = window.matchMedia('(min-width:1024px)');
    var visibles = {};
    var observador = null;
    var limpiar = function () { enlaces.forEach(function (a) { a.removeAttribute('aria-current'); }); };
    var encender = function () {
      if (observador) return;
      visibles = {};
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) { visibles[en.target.id] = en.isIntersecting; });
        var actual = null;
        enlaces.forEach(function (a) {
          var id = a.getAttribute('href').slice(1);
          if (!actual && visibles[id]) actual = a;
        });
        if (!actual) return;
        enlaces.forEach(function (a) {
          if (a === actual) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      }, { rootMargin: '-15% 0px -55% 0px' });
      enlaces.forEach(function (a) {
        var s = d.getElementById(a.getAttribute('href').slice(1));
        if (s) observador.observe(s);
      });
    };
    var apagar = function () {
      if (observador) { observador.disconnect(); observador = null; }
      limpiar();
    };
    var aplicarIndice = function () { if (ancho.matches) encender(); else apagar(); };
    aplicarIndice();
    if (ancho.addEventListener) ancho.addEventListener('change', aplicarIndice);
    else if (ancho.addListener) ancho.addListener(aplicarIndice);
  }

  /* ------------------------------------------------------------ catálogo: buscar y filtrar */
  function normalizar(t) {
    return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /* Sinónimos hechos a mano (investigacion/v2_navegacion-catalogo.md); igual que SINONIMOS en
     generador/plantillas.py. */
  var SINONIMOS = [
    ['pikler', 'triangulo', 'escalador'],
    ['tobogan', 'resbaladero', 'resbaladilla', 'deslizador'],
    ['librero', 'librera', 'libreria', 'repisa', 'estante', 'biblioteca'],
    ['torre', 'learning'],
    ['wobble', 'balancin', 'tabla'],
    ['piedras', 'piedritas', 'stepping', 'circuito'],
    ['giratoria', 'spinner', 'sensorial'],
    ['casita', 'carpa', 'tipi'],
    ['corral', 'encierro', 'playpen'],
    ['organizador', 'juguetero', 'gavetas'],
    ['armario', 'closet', 'ropero'],
    ['mesa', 'mesita', 'escritorio', 'pupitre'],
    ['pizarra', 'pizarron'],
    ['cocina', 'cocinita'],
    ['baranda', 'barandal'],
    ['cambiador', 'panal'],
    ['mecedor', 'mecedora', 'caballito', 'jirafa'],
    ['aro', 'basquet', 'baloncesto', 'canasta', 'futbol'],
    ['play', 'juegos']
  ];
  var VACIAS = { de: 1, del: 1, la: 1, el: 1, los: 1, las: 1, para: 1, con: 1, y: 1, en: 1, un: 1, una: 1, 'a': 1, por: 1 };
  function expandir(token) {
    var salida = [token];
    SINONIMOS.forEach(function (grupo) {
      var toca = grupo.some(function (m) {
        return m === token || (token.length >= 3 && m.indexOf(token) === 0);
      });
      if (toca) grupo.forEach(function (m) { if (salida.indexOf(m) < 0) salida.push(m); });
    });
    return salida;
  }
  /* Cada palabra buscada tiene que ser el comienzo de una palabra del producto (en cualquier texto
     de la tarjeta), o uno de sus sinónimos en el nombre, el descriptor o el tipo de producto. */
  function coincide(texto, clave, consulta) {
    var tokens = normalizar(consulta).split(' ').filter(function (t) { return t && !VACIAS[t]; });
    if (!tokens.length) return true;
    var hay = ' ' + texto + ' ', nombre = ' ' + clave + ' ';
    return tokens.every(function (t) {
      if (hay.indexOf(' ' + t) >= 0) return true;
      return expandir(t).some(function (m) { return nombre.indexOf(' ' + m) >= 0; });
    });
  }

  var filtros = d.querySelector('[data-filtros]');
  if (filtros) {
    var grilla = d.querySelector('[data-grilla]');
    var items = Array.prototype.slice.call(grilla.querySelectorAll('li[data-slug]'));
    var campo = filtros.querySelector('[data-buscar-campo]');
    var borrarB = filtros.querySelector('[data-buscar-borrar]');
    var espacios = filtros.querySelectorAll('[data-espacio]');
    var disponibles = filtros.querySelector('[data-disponibles]');
    var orden = filtros.querySelector('[data-orden]');
    var resultado = filtros.querySelector('[data-resultado]');
    var vacio = d.querySelector('[data-vacio]');
    var vacioTexto = d.querySelector('[data-vacio-texto]');
    var limpiarB = d.querySelector('[data-limpiar]');
    var salidaWa = d.querySelector('[data-salida-wa]');
    var estado = { q: '', espacio: '', disp: false, orden: '' };

    try {
      var ps = new URLSearchParams(location.search);
      estado.q = ps.get('q') || '';
      estado.espacio = ps.get('espacio') || '';
      estado.disp = ps.get('disp') === '1';
      estado.orden = ps.get('orden') || '';
    } catch (err) { /* sin URLSearchParams: todo visible */ }
    if (orden && !Array.prototype.some.call(orden.options, function (o) { return o.value === estado.orden; })) estado.orden = '';
    if (!Array.prototype.some.call(espacios, function (b) { return b.getAttribute('data-espacio') === estado.espacio; })) estado.espacio = '';

    function numero(li, attr, respaldo) { var v = li.getAttribute(attr); return v === '' || v === null ? respaldo : +v; }
    function ordenar() {
      var copia = items.slice();
      var clave = estado.orden;
      copia.sort(function (a, b) {
        var da = a.getAttribute('data-disp') === '0', db = b.getAttribute('data-disp') === '0';
        if (da !== db) return da ? 1 : -1;
        if (clave === 'nuevos') return numero(a, 'data-on', 0) - numero(b, 'data-on', 0);
        if (clave === 'precio' || clave === 'precio-desc') {
          var pa = numero(a, 'data-precio', null), pb = numero(b, 'data-precio', null);
          if (pa === null && pb === null) return numero(a, 'data-od', 0) - numero(b, 'data-od', 0);
          if (pa === null) return 1;
          if (pb === null) return -1;
          return clave === 'precio' ? pa - pb : pb - pa;
        }
        return numero(a, 'data-od', 0) - numero(b, 'data-od', 0);
      });
      copia.forEach(function (li) { grilla.appendChild(li); });
    }
    function aplicar(guardarUrl) {
      var n = 0;
      items.forEach(function (li) {
        var ok = coincide(li.getAttribute('data-buscar') || '', li.getAttribute('data-clave') || '', estado.q)
          && (!estado.espacio || (' ' + li.getAttribute('data-espacio') + ' ').indexOf(' ' + estado.espacio + ' ') >= 0)
          && (!estado.disp || li.getAttribute('data-disp') !== '0');
        li.hidden = !ok;
        if (ok) n++;
      });
      ordenar();
      var filtrando = estado.q || estado.espacio || estado.disp;
      var sinNada = estado.q ? 'Ningún producto coincide con esa búsqueda.' : 'Ningún producto coincide con esos filtros.';
      resultado.textContent = filtrando ? (n ? textoProductos(n) + (n === 1 ? ' encontrado' : ' encontrados') : sinNada) : '';
      /* Sin resultados el mensaje ya está a la vista en el bloque vacío: aquí solo se anuncia. */
      resultado.classList.toggle('sr', !filtrando || n === 0);
      /* La frase sigue en el HTML con " o escríbanos por WhatsApp." (el único enlace a WhatsApp). */
      if (vacioTexto) {
        vacioTexto.textContent = estado.q
          ? 'No encontramos «' + estado.q.trim() + '». Pruebe con otra palabra'
          : 'No hay productos con ese filtro. Quite uno';
      }
      if (limpiarB) limpiarB.textContent = estado.q && !estado.espacio && !estado.disp ? 'Borrar la búsqueda' : 'Quitar los filtros';
      if (vacio) vacio.hidden = n > 0;
      if (salidaWa) salidaWa.hidden = n === 0;
      grilla.hidden = n === 0;
      if (borrarB) borrarB.hidden = !estado.q;
      espacios.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-espacio') === estado.espacio ? 'true' : 'false'); });
      if (guardarUrl && history.replaceState) {
        try {
          var p = new URLSearchParams(location.search);
          ['q', 'espacio', 'disp', 'orden'].forEach(function (k) { p.delete(k); });
          if (estado.q) p.set('q', estado.q);
          if (estado.espacio) p.set('espacio', estado.espacio);
          if (estado.disp) p.set('disp', '1');
          if (estado.orden) p.set('orden', estado.orden);
          var qs = p.toString();
          history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        } catch (err) { /* la URL no cambia, el filtro sí */ }
      }
    }
    filtros.hidden = false;
    campo.value = estado.q;
    if (disponibles) disponibles.checked = estado.disp;
    if (orden) orden.value = estado.orden;
    var espera = null;
    campo.addEventListener('input', function () {
      estado.q = campo.value;
      clearTimeout(espera);
      espera = setTimeout(function () { aplicar(true); }, 120);
    });
    filtros.addEventListener('submit', function (ev) { ev.preventDefault(); campo.blur(); aplicar(true); });
    if (borrarB) borrarB.addEventListener('click', function () { campo.value = ''; estado.q = ''; aplicar(true); campo.focus(); });
    espacios.forEach(function (b) {
      b.addEventListener('click', function () { estado.espacio = b.getAttribute('data-espacio'); aplicar(true); });
    });
    if (disponibles) disponibles.addEventListener('change', function () { estado.disp = disponibles.checked; aplicar(true); });
    if (orden) orden.addEventListener('change', function () { estado.orden = orden.value; aplicar(true); });
    if (limpiarB) limpiarB.addEventListener('click', function () {
      estado = { q: '', espacio: '', disp: false, orden: estado.orden };
      campo.value = ''; if (disponibles) disponibles.checked = false;
      aplicar(true); campo.focus();
    });
    aplicar(false);
  }

  /* ------------------------------------------------------------ página Mi lista */
  var pagina = d.querySelector('[data-mi-lista]');
  if (pagina && hayAlmacen && window.RK_CATALOGO) {
    var cat = window.RK_CATALOGO.productos || {};
    /* ?agregar=slug:Opción,slug2 suma productos (para compartir una lista) y se limpia de la URL */
    try {
      var qs = new URLSearchParams(location.search);
      var extra = qs.get('agregar');
      if (extra) {
        extra.split(',').forEach(function (par) {
          var partes = par.split(':'), s = partes[0], v = partes.slice(1).join(':');
          if (cat[s]) agregar(s, (cat[s].o || []).indexOf(v) >= 0 ? v : '');
        });
        qs.delete('agregar');
        var resto = qs.toString();
        if (history.replaceState) history.replaceState(null, '', location.pathname + (resto ? '?' + resto : ''));
      }
    } catch (err) { /* sin cambios */ }
    var vaciaB = pagina.querySelector('[data-lista-vacia]');
    var llena = pagina.querySelector('[data-lista-llena]');
    var ul = pagina.querySelector('[data-lista-items]');
    var conteo = pagina.querySelector('[data-lista-conteo]');
    var plantilla = pagina.querySelector('[data-plantilla-item]');
    var resumen = pagina.querySelector('[data-lista-resumen]');
    var barraLista = d.querySelector('[data-barra-lista]');
    var dibujar = function () {
      var l = leerLista().filter(function (x) { return cat[x.s]; });
      vaciaB.hidden = l.length > 0;
      llena.hidden = l.length === 0;
      conteo.textContent = l.length === 1 ? '1 producto en su lista' : l.length + ' productos en su lista';
      if (resumen) resumen.textContent = textoProductos(l.length);
      if (barraLista) {
        barraLista.hidden = l.length === 0;
        var bc = barraLista.querySelector('[data-barra-conteo]');
        if (bc) bc.textContent = textoProductos(l.length);
      }
      ul.innerHTML = '';
      l.forEach(function (x) {
        var q = cat[x.s];
        var li = plantilla.content.firstElementChild.cloneNode(true);
        /* La ficha se abre en el color o diseño escogido (?color=). */
        var destino = raiz + q.r + (x.v ? '?color=' + encodeURIComponent(x.v) : '');
        li.querySelectorAll('[data-item-enlace]').forEach(function (a) { a.setAttribute('href', local(destino)); });
        li.querySelector('[data-item-nombre]').textContent = q.n;
        var foto = li.querySelector('[data-item-foto]');
        var rutaFoto = (x.v && q.of && q.of[x.v]) || q.f;
        if (rutaFoto) foto.setAttribute('src', raiz + rutaFoto); else foto.remove();
        li.querySelector('[data-item-precio]').textContent = q.p || 'Precio por confirmar';
        var ops = q.o || [];
        if (q.a) {
          /* Agotado: no se pide; queda como aviso. */
          li.querySelector('[data-item-precio]').textContent = 'Agotado';
          var avisarA = li.querySelector('[data-item-avisar]');
          if (avisarA) { avisarA.hidden = false; avisarA.setAttribute('href', local(raiz + 'avisar/' + x.s + '/')); }
        } else if (ops.length > 1) {
          var etiqueta = li.querySelector('[data-item-opcion]');
          etiqueta.hidden = false;
          etiqueta.querySelector('[data-item-leyenda]').textContent = q.dis ? 'Diseño y color' : 'Color';
          var sel = etiqueta.querySelector('select');
          ops.forEach(function (o) {
            var op = d.createElement('option');
            op.value = o; op.textContent = o;
            if (o === x.v) op.selected = true;
            sel.appendChild(op);
          });
          sel.addEventListener('change', function () {
            var lista = leerLista();
            lista.forEach(function (y) { if (y.s === x.s) y.v = sel.value; });
            guardarLista(lista);
            var nueva = (sel.value && q.of && q.of[sel.value]) || q.f;
            var f = li.querySelector('[data-item-foto]');
            if (f && nueva) f.setAttribute('src', raiz + nueva);
          });
        } else if (ops.length === 1) {
          var p = li.querySelector('[data-item-precio]');
          p.textContent = (q.p || 'Precio por confirmar') + '. Color: ' + ops[0];
        }
        var quitarB = li.querySelector('[data-item-quitar]');
        quitarB.setAttribute('aria-label', 'Quitar ' + q.n + ' de mi lista');
        quitarB.addEventListener('click', function () {
          /* El foco pasa al Quitar del producto que queda en el mismo lugar (o al anterior, si era
             el último); con la lista vacía, al botón Ver catálogo. El aviso trae Deshacer. */
          var indice = Array.prototype.indexOf.call(ul.querySelectorAll('[data-item-quitar]'), quitarB);
          var posicion = leerLista().map(function (y) { return y.s; }).indexOf(x.s);
          var copia = { s: x.s, v: x.v || '' };
          quitar(x.s);
          var botones = ul.querySelectorAll('[data-item-quitar]');
          if (botones.length) botones[Math.min(indice, botones.length - 1)].focus();
          else { var ver = vaciaB.querySelector('a'); if (ver) ver.focus(); }
          avisar('Lo quitamos de su lista.', function () {
            var lista = leerLista();
            if (!lista.some(function (y) { return y.s === copia.s; })) {
              lista.splice(Math.max(0, Math.min(posicion, lista.length)), 0, copia);
              guardarLista(lista);
              cambio();
            }
            var vuelto = ul.querySelectorAll('[data-item-quitar]')[Math.max(0, posicion)];
            if (vuelto) vuelto.focus();
          });
        });
        ul.appendChild(li);
      });
    };
    oyentes.push(dibujar);
    dibujar();
    var vaciar = pagina.querySelector('[data-vaciar]');
    var confirmar = pagina.querySelector('[data-vaciar-confirmar]');
    vaciar.addEventListener('click', function () { confirmar.hidden = false; vaciar.hidden = true; confirmar.querySelector('[data-vaciar-si]').focus(); });
    pagina.querySelector('[data-vaciar-no]').addEventListener('click', function () { confirmar.hidden = true; vaciar.hidden = false; vaciar.focus(); });
    pagina.querySelector('[data-vaciar-si]').addEventListener('click', function () {
      guardarLista([]); confirmar.hidden = true; vaciar.hidden = false; cambio();
      var b = vaciaB.querySelector('a'); if (b) b.focus();
    });
  } else if (pagina) {
    var sinDatos = pagina.querySelector('[data-lista-vacia]');
    if (sinDatos) sinDatos.hidden = false;
  }
})();
