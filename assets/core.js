/* =========================================================
   Futbol Libre — nucleo de datos y utilidades
   - Descarga https://agenda18.com/agenda.json
   - Normaliza los eventos (competicion, equipos, senales, horarios)
   - Convierte el horario de origen (UTC-5) a la zona horaria del visitante
   - Auto-refresco y cache local
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.SITIO || {};
  var script = document.currentScript;
  var ROOT = script ? new URL("../", script.src) : new URL("./", location.href);

  var state = {
    events: [],
    sig: "",
    fetchedAt: 0,
    loading: false,
    promise: null,
    error: null
  };

  var listeners = [];
  var timer = null;
  var CACHE_KEY = "futbol-libre:agenda:v1";

  /* ---------------------------------------------------------
     Utilidades basicas
     --------------------------------------------------------- */
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function decodeEntities(s) {
    if (s == null) return "";
    var str = String(s);
    if (!/[&]/.test(str)) return str;
    var el = document.createElement("textarea");
    el.innerHTML = str;
    return el.value;
  }

  function slugify(s) {
    return String(s == null ? "" : s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* FNV-1a de 32 bits: hash estable y corto para las URLs de partido */
  function hash32(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ("00000000" + h.toString(16)).slice(-8);
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------------------------------------------------------
     Rutas
     --------------------------------------------------------- */
  var PRETTY = /\.html$/i.test(location.pathname) === false &&
    location.protocol !== "file:";

  function link(path, params) {
    params = params || {};
    var presentes = function (k) {
      return params[k] !== undefined && params[k] !== null && params[k] !== "";
    };
    var qs = Object.keys(params)
      .filter(presentes)
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&");

    if (!PRETTY) {
      return String(path) + (qs ? "?" + qs : "");
    }

    /* URLs limpias: /agenda  /channels  /match/<slug>  /channel/<slug> */
    var clean = String(path).replace(/\.html$/i, "");
    var enRuta = null;
    if (/^match$/i.test(clean) && presentes("e")) {
      enRuta = "e";
      clean = "match/" + encodeURIComponent(params.e);
    } else if (/^channel$/i.test(clean) && presentes("c")) {
      enRuta = "c";
      clean = "channel/" + encodeURIComponent(params.c);
    } else {
      clean = clean.replace(/\/$/, "");
    }

    var out = new URL(clean, ROOT).pathname;

    /* El parametro ya viaja en la ruta: no se duplica en el query */
    var resto = enRuta ? Object.keys(params)
      .filter(function (k) { return k !== enRuta && presentes(k); })
      .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); })
      .join("&") : qs;

    return out + (resto ? "?" + resto : "");
  }

  /* Lee un parametro de la ruta: ?e=slug o /match/slug */
  function routeParam(name, fallback) {
    var q = new URLSearchParams(location.search).get(name);
    if (q) return q;
    var segs = location.pathname.split("/").filter(Boolean);
    var prefixes = { e: ["match", "evento", "partido"], c: ["channel", "canal"] };
    var list = prefixes[name] || [];
    for (var i = 0; i < segs.length; i++) {
      if (list.indexOf(segs[i]) !== -1 && segs[i + 1]) {
        return decodeURIComponent(segs[i + 1].replace(/\.html$/i, ""));
      }
    }
    return fallback || "";
  }

  /* ---------------------------------------------------------
     Hora: la agenda18 publica en UTC-5, el visitante ve su hora
     --------------------------------------------------------- */
  function tzOffsetMinutes(tz) {
    var m = /([+-])(\d{2}):?(\d{2})/.exec(tz || "");
    if (!m) return 0;
    var sign = m[1] === "-" ? -1 : 1;
    return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
  }

  function sourceInstant(dateStr, timeStr) {
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
    if (!d) return NaN;
    var t = /^(\d{2}):(\d{2})(?::(\d{2}))?/.exec(timeStr || "");
    var h = t ? parseInt(t[1], 10) : 0;
    var mi = t ? parseInt(t[2], 10) : 0;
    var s = t && t[3] ? parseInt(t[3], 10) : 0;
    return Date.UTC(+d[1], +d[2] - 1, +d[3], h, mi, s) - tzOffsetMinutes(CFG.agendaTimezone) * 60000;
  }

  function fmtTime(ms) {
    if (isNaN(ms)) return "--:--";
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function dayKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function keyToDate(key) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
    if (!p) return NaN;
    return new Date(+p[1], +p[2] - 1, +p[3], 12, 0, 0).getTime();
  }

  function fmtDayLong(ms) {
    var s = new Date(ms).toLocaleDateString("es", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    s = s.replace(/^([^,]+),\s*/, "$1 ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtDayShort(ms) {
    return new Date(ms).toLocaleDateString("es", { day: "numeric", month: "short" });
  }

  function fmtDateTime(ms) {
    if (isNaN(ms)) return "Sin fecha";
    var d = new Date(ms);
    return d.toLocaleDateString("es", { year: "numeric", month: "2-digit", day: "2-digit" }) +
      " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function zoneName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "hora local"; }
    catch (e) { return "hora local"; }
  }

  /* ---------------------------------------------------------
     Normalizacion de eventos
     --------------------------------------------------------- */
  function imgUrl(path) {
    if (!path) return null;
    if (/^https?:/i.test(path)) return path;
    var host = String(CFG.imgHost || "").replace(/\/+$/, "");
    return host + (path.charAt(0) === "/" ? "" : "/") + path;
  }

  function channelName(raw) {
    var name = decodeEntities(raw || "").trim();
    return name || "Fuente";
  }

  function buildSlug(ev) {
    var base;
    if (ev.teams.length >= 2) {
      base = slugify(ev.teams[0]) + "-vs-" + slugify(ev.teams[1]);
    } else {
      base = slugify(ev.title);
    }
    if (!base) base = "evento";
    /* La semilla NO usa el id: agenda18 republica los eventos con id nuevo
       cuando actualiza la jornada y ese id no debe cambiar la URL. */
    var seed = [ev.date, ev.hour, ev.competition, ev.title].join("|");
    return base + "-" + ev.date + "-" + hash32(seed);
  }

  /* Prefijo de la URL sin el hash final: equipos + fecha */
  function slugBase(slug) {
    return String(slug || "").replace(/-[0-9a-f]{8}$/, "");
  }

  function normalize(raw) {
    var a = (raw && raw.attributes) || {};
    var desc = decodeEntities(a.diary_description || "").trim();
    var parts = desc.split(/:\s+/);
    var competition = parts.length > 1 ? parts.shift().trim() : "";
    var title = (parts.join(": ").trim() || desc);
    var teams = title.split(/\s+(?:vs\.?|contra)\s+/i).map(function (t) { return t.trim(); }).filter(Boolean);

    var date = a.date_diary || "";
    var hour = a.diary_hour || "";
    var instant = sourceInstant(date, hour);

    var countryData = (((a.country || {}).data || {}).attributes) || {};
    var imageData = ((countryData.image || {}).data || {}).attributes || {};
    var flag = imgUrl(imageData.url || null);

    var sources = [];
    var embeds = (a.embeds && a.embeds.data) || [];
    for (var i = 0; i < embeds.length; i++) {
      var em = embeds[i];
      var at = em && em.attributes;
      if (!at || !at.embed_iframe) continue;
      sources.push({
        index: sources.length,
        id: em.id,
        name: channelName(at.embed_name),
        idioma: at.idioma || "",
        path: at.embed_iframe,
        channel: channelName(at.embed_name)
      });
    }

    var ev = {
      id: raw && raw.id,
      competition: competition,
      title: title,
      teams: teams,
      date: date,
      hour: hour,
      instant: instant,
      sport: String(a.deportes || "").toLowerCase(),
      destacado: a.destacado === true,
      country: countryData.name || "",
      flag: flag,
      sources: sources
    };
    ev.slug = buildSlug(ev);
    return ev;
  }

  function byTime(a, b) {
    if (a.instant !== b.instant) return (a.instant || 0) - (b.instant || 0);
    return String(a.competition).localeCompare(String(b.competition));
  }

  function slim(ev) {
    return [
      ev.id, ev.instant, ev.title,
      ev.sources.map(function (s) { return s.name + "|" + s.path; }).join(",")
    ].join("~");
  }

  /* ---------------------------------------------------------
     Descarga y auto-refresco
     --------------------------------------------------------- */
  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: state.fetchedAt,
        events: state.events.map(function (ev) {
          return {
            id: ev.id, competition: ev.competition, title: ev.title, teams: ev.teams,
            date: ev.date, hour: ev.hour, instant: ev.instant, sport: ev.sport,
            destacado: ev.destacado, country: ev.country, flag: ev.flag,
            slug: ev.slug,
            sources: ev.sources.map(function (s) {
              return { index: s.index, id: s.id, name: s.name, idioma: s.idioma, path: s.path, channel: s.channel };
            })
          };
        })
      }));
    } catch (e) { /* modo privado: se ignora */ }
  }

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data.events) ? data.events : [];
    } catch (e) { return []; }
  }

  function emit(changed) {
    listeners.forEach(function (fn) {
      try { fn(state.events, changed); } catch (e) { console.error(e); }
    });
  }

  function fetchAgenda() {
    if (state.loading && state.promise) return state.promise;
    if (!CFG.agendaUrl) return Promise.reject(new Error("Falta agendaUrl en la configuracion"));

    state.loading = true;
    var url = CFG.agendaUrl + (CFG.agendaUrl.indexOf("?") !== -1 ? "&" : "?") + "_=" + Date.now();
    state.promise = fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        var raw = json && Array.isArray(json.data) ? json.data : [];
        var events = raw.map(normalize).filter(function (ev) { return !isNaN(ev.instant); }).sort(byTime);
        var sig = JSON.stringify(events.map(slim));
        var changed = sig !== state.sig;
        state.events = events;
        state.sig = sig;
        state.fetchedAt = Date.now();
        state.error = null;
        saveCache();
        emit(changed);
        return events;
      })
      .catch(function (err) {
        state.error = err;
        emit(false);
        throw err;
      })
      .then(function (v) { state.loading = false; state.promise = null; return v; },
            function (e) { state.loading = false; state.promise = null; throw e; });

    return state.promise;
  }

  function startAutoRefresh() {
    if (timer) return;
    var ms = Number(CFG.refreshMs) || 60000;
    timer = setInterval(function () {
      if (document.hidden) return;
      fetchAgenda().catch(function () { /* se conserva la vista anterior */ });
    }, ms);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) fetchAgenda().catch(function () { });
    });
  }

  /* ---------------------------------------------------------
     Estado del evento
     --------------------------------------------------------- */
  function duration(ev) {
    var d = (CFG.deportes || {})[ev.sport];
    return Number(d) || Number(CFG.liveMinutes) || 180;
  }

  /*
    Fase real del evento (no marca "en vivo" antes de tiempo):
      upcoming -> todavia no empieza
      live     -> ya empezo
      ended    -> se acabo
  */
  function fase(ev, now) {
    now = now || Date.now();
    if (isNaN(ev.instant)) return "upcoming";
    if (ev.instant > now) return "upcoming";
    if (now - ev.instant <= duration(ev) * 60000) return "live";
    return "ended";
  }

  /* ---------------------------------------------------------
     Canales
     --------------------------------------------------------- */
  function channelSlug(name) { return slugify(name); }

  function channels() {
    var map = {};
    (CFG.canales || []).forEach(function (c) {
      var key = channelSlug(c.nombre);
      map[key] = {
        slug: key, nombre: c.nombre, logo: c.logo || null,
        stream: c.stream || null, senales: 0, eventos: 0, enAgenda: false
      };
    });
    state.events.forEach(function (ev) {
      var seen = {};
      ev.sources.forEach(function (s) {
        var key = channelSlug(s.channel);
        if (!map[key]) {
          map[key] = { slug: key, nombre: s.channel, logo: null, stream: null, senales: 0, eventos: 0, enAgenda: false };
        }
        map[key].senales++;
        if (!seen[key]) { map[key].eventos++; seen[key] = true; }
        map[key].enAgenda = true;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, "es"); });
  }

  function channelBySlug(slug) {
    var key = channelSlug(slug);
    var found = null;
    channels().forEach(function (c) { if (c.slug === key) found = c; });
    return found;
  }

  function eventsByChannel(slug) {
    var key = channelSlug(slug);
    return state.events.filter(function (ev) {
      return ev.sources.some(function (s) { return channelSlug(s.channel) === key; });
    });
  }

  /* ---------------------------------------------------------
     Reproductor
     La agenda18 entrega rutas relativas (/embed/eventos.html?r=<base64>)
     pensadas para el sitio que consume el JSON. Aqui se decodifica el
     base64 y se carga la senal DIRECTAMENTE en el iframe del reproductor,
     igual que hace el sitio de referencia: asi el reproductor del proveedor
     (Clappr) recibe el doble clic y pone el video en pantalla completa.
     --------------------------------------------------------- */
  function decodeBase64(b64) {
    var s = String(b64 || "");
    try { s = decodeURIComponent(s.replace(/ /g, "+")); } catch (e) { }
    s += "=".repeat((4 - (s.length % 4)) % 4);
    try { return atob(s); } catch (e) { return null; }
  }

  function streamUrl(source) {
    if (!source) return "";
    var path = source.path || "";
    if (/^https?:/i.test(path)) return path;
    var m = /[?&]r=([^&]*)/.exec(path);
    if (m) {
      var url = decodeBase64(m[1]);
      if (url && /^https?:/i.test(url)) return url;
      if (url && url.charAt(0) === "/") {
        try { return new URL(url, CFG.agendaUrl).href; } catch (e) { }
      }
    }
    return "";
  }

  function directStreamUrl(stream) {
    if (!stream || !CFG.reproductor) return "";
    return CFG.reproductor + stream;
  }

  /* ---------- Senales sin avisos anti-bloqueadores ---------- */
  function esProveedorConAviso(url) {
    var lista = CFG.proveedorAviso || [];
    var host = (String(url || "").match(/^https?:\/\/([^/]+)/) || [])[1] || "";
    for (var i = 0; i < lista.length; i++) {
      if (host && host.indexOf(lista[i]) !== -1) return true;
    }
    return false;
  }

  /*
    Devuelve la URL de la senal evitando los proveedores que incrustan avisos
    anti-bloqueadores: si la señal viene de uno de ellos, se usa la clave
    equivalente de la18hd.su configurada en `alternativas`.
  */
  function signalLimpia(source, nombreCanal) {
    var url = streamUrl(source);
    if (url && !esProveedorConAviso(url)) return url;

    var alt = (CFG.alternativas || {})[nombreCanal];
    if (alt && CFG.reproductor) return directStreamUrl(alt);

    return url;
  }

  /*
    Señal de un canal:
      1) la que publica la agenda para ese canal (si tiene eventos hoy)
      2) la señal directa del catalogo (canales sin eventos)
    Devuelve { url, origen: "evento"|"directo", label } o null.
  */
  function channelPlayback(ch) {
    if (!ch) return null;

    var key = ch.slug;
    var evs = eventsByChannel(key);
    for (var i = 0; i < evs.length; i++) {
      var srcs = evs[i].sources.filter(function (s) { return channelSlug(s.channel) === key; });
      if (srcs.length) {
        return {
          url: signalLimpia(srcs[0], srcs[0].channel || ch.nombre),
          origen: "evento",
          label: srcs[0].name
        };
      }
    }

    if (ch.stream && CFG.reproductor) {
      var alt = (CFG.alternativas || {})[ch.nombre];
      return {
        url: directStreamUrl(alt || ch.stream),
        origen: "directo",
        label: ch.nombre
      };
    }

    return null;
  }

  /* ---------------------------------------------------------
     Render compartido de la agenda
     --------------------------------------------------------- */
  function sourceButtons(ev) {
    if (!ev.sources.length) {
      return '<span class="agenda-none">Sin senales disponibles todavia. Vuelve mas tarde para ver este partido en vivo gratis.</span>';
    }
    return ev.sources.map(function (s) {
      return '<a class="agenda-source" href="' + esc(link("match.html", { e: ev.slug }) + "#source=" + s.index) + '" data-source="' + s.index + '">' +
        "<span>Fuente " + (s.index + 1) + "</span>" +
        "<small>" + esc(s.name + (s.idioma ? " · " + s.idioma : "")) + "</small>" +
        "</a>";
    }).join("") +
      '<a class="agenda-open" href="' + esc(link("match.html", { e: ev.slug })) + '">Ver partido en vivo gratis</a>';
  }

  function eventRow(ev, now) {
    var st = fase(ev, now);
    var flag = ev.flag
      ? '<img class="agenda-flag" src="' + esc(ev.flag) + '" alt="' + esc(ev.country || ev.competition || "") + '" width="28" height="22" loading="lazy" decoding="async">'
      : '<span class="agenda-flag placeholder" aria-hidden="true">&#127760;</span>';
    var live = st === "live" ? '<span class="agenda-badge is-live">En vivo</span>' :
      st === "ended" ? '<span class="agenda-badge is-ended">Finalizado</span>' : "";
    var star = ev.destacado
      ? '<span class="agenda-star" title="Destacado" aria-label="Destacado">&#9733;</span>' : "";
    return '' +
      '<div class="agenda-event" data-slug="' + esc(ev.slug) + '" data-status="' + st + '">' +
      '<button class="agenda-eventbtn" type="button" aria-expanded="false" aria-controls="src-' + esc(ev.slug) + '">' +
      '<span class="agenda-time">' + esc(fmtTime(ev.instant)) + "</span>" +
      flag +
      '<span class="agenda-text"><strong>' +
      star +
      (ev.competition ? '<span class="agenda-competition">' + esc(ev.competition) + ":</span> " : "") +
      esc(ev.title) + "</strong>" +
      (live ? " " + live : "") +
      "</span>" +
      '<span class="agenda-count" title="Senales disponibles">' + ev.sources.length + "</span>" +
      '<span class="agenda-arrow" aria-hidden="true">&#9660;</span>' +
      "</button>" +
      '<div class="agenda-sources" id="src-' + esc(ev.slug) + '"><div class="agenda-sources-inner">' +
      sourceButtons(ev) +
      "</div></div>" +
      "</div>";
  }

  function renderAgenda(host, events, opts) {
    if (!host) return;
    opts = opts || {};
    var now = opts.now || Date.now();
    var expanded = opts.expanded || {};
    if (!events.length) {
      host.innerHTML = '<p class="empty">' + esc(opts.empty || "No hay partidos de hoy en vivo gratis programados en este momento.") + "</p>";
      return;
    }
    host.innerHTML = '<div class="agenda-list">' + events.map(function (ev) {
      return eventRow(ev, now);
    }).join("") + "</div>";
    Object.keys(expanded).forEach(function (slug) {
      if (!expanded[slug]) return;
      var rows = host.querySelectorAll(".agenda-event");
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute("data-slug") === slug) { openRow(rows[i], true); break; }
      }
    });
  }

  function openRow(row, open) {
    if (!row) return;
    var btn = row.querySelector(".agenda-eventbtn");
    row.classList.toggle("open", !!open);
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  /* Gestiona el desplegar / plegar de cada evento */
  function bindAgenda(host, expanded) {
    if (!host) return;
    host.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".agenda-eventbtn");
      if (!btn) return;
      var row = btn.closest(".agenda-event");
      if (!row) return;
      var open = !row.classList.contains("open");
      openRow(row, open);
      var slug = row.getAttribute("data-slug");
      if (slug && expanded) expanded[slug] = open;
    });
  }

  /* ---------------------------------------------------------
     Pantalla completa
     --------------------------------------------------------- */
  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function toggleFullscreen(panel) {
    var el = panel || document.querySelector(".player-panel");
    if (!el) return false;

    if (fullscreenElement()) {
      var salir = document.exitFullscreen || document.webkitExitFullscreen ||
        document.mozCancelFullScreen || document.msExitFullscreen;
      if (salir) salir.call(document);
      return false;
    }

    var pedir = el.requestFullscreen || el.webkitRequestFullscreen ||
      el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!pedir) return false;
    try {
      var res = pedir.call(el);
      if (res && typeof res.catch === "function") res.catch(function () { });
    } catch (e) { return false; }
    return true;
  }

  /* ---------------------------------------------------------
     API publica
     --------------------------------------------------------- */
  function setJsonLd(data) {
    var tag = document.getElementById("ld-dinamico");
    if (!tag) {
      tag = document.createElement("script");
      tag.type = "application/ld+json";
      tag.id = "ld-dinamico";
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(data);
  }

  window.FL = {
    CFG: CFG,
    state: state,
    $$: $$,
    esc: esc,
    slugBase: slugBase,
    link: link,
    routeParam: routeParam,
    pretty: PRETTY,
    fmtDateTime: fmtDateTime,
    fmtDayLong: fmtDayLong,
    fmtDayShort: fmtDayShort,
    dayKey: dayKey,
    keyToDate: keyToDate,
    zoneName: zoneName,
    fase: fase,
    channels: channels,
    channelBySlug: channelBySlug,
    eventsByChannel: eventsByChannel,
    signalLimpia: signalLimpia,
    channelPlayback: channelPlayback,
    renderAgenda: renderAgenda,
    bindAgenda: bindAgenda,
    loadCache: loadCache,
    setJsonLd: setJsonLd,
    toggleFullscreen: toggleFullscreen,
    subscribe: function (fn) {      listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },
    ready: function () {
      return fetchAgenda().catch(function () {
        var cached = loadCache();
        if (cached.length) {
          state.events = cached;
          emit(true);
        }
        return state.events;
      }).then(function () {
        startAutoRefresh();
        return state.events;
      });
    }
  };
})();
