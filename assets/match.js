/* =========================================================
   Futbol Libre — pagina de partido
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  var slug = FL.routeParam("e");
  var selected = -1;
  var current = null;

  var el = {
    crumb: document.getElementById("crumbTitle"),
    competition: document.getElementById("evCompetition"),
    title: document.getElementById("evTitle"),
    meta: document.getElementById("evMeta"),
    lifecycle: document.getElementById("lifecycle"),
    status: document.getElementById("lifecycleStatus"),
    time: document.getElementById("lifecycleTime"),
    countdown: document.getElementById("countdown"),
    liveTimer: document.getElementById("liveTimer"),
    placeholder: document.getElementById("playerPlaceholder"),
    frame: document.getElementById("playerFrame"),
    label: document.getElementById("playerLabel"),
    liveDot: document.getElementById("liveDot"),
    switcher: document.getElementById("serverSwitcher"),
    retry: document.getElementById("playerRetry"),
    summary: document.getElementById("evSummary"),
    infoMatch: document.getElementById("infoPartido"),
    infoComp: document.getElementById("infoCompeticion"),
    infoTime: document.getElementById("infoHorario")
  };

  function findEvent() {
    var found = null;
    FL.state.events.forEach(function (ev) { if (ev.slug === slug) found = ev; });
    if (found) return found;

    /* Fallback: mismo partido (equipos + fecha) aunque el hash haya cambiado */
    var base = FL.slugBase(slug);
    FL.state.events.forEach(function (ev) {
      if (!found && FL.slugBase(ev.slug) === base) found = ev;
    });
    if (found) return found;

    var cached = FL.loadCache();
    for (var i = 0; i < cached.length; i++) {
      if (cached[i].slug === slug) return cached[i];
    }
    for (var j = 0; j < cached.length; j++) {
      if (FL.slugBase(cached[j].slug) === base) return cached[j];
    }
    return null;
  }

  function notFound() {
    document.title = "Partido no disponible | Futbol libre TV";
    /*
      El partido ya no esta en el catalogo (la agenda solo publica la
      jornada en curso). Se marca noindex para que la pagina vacia no se
      indexe como si fuera contenido valido.
    */
    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", "noindex, follow");
    el.title.textContent = "Partido no disponible";
    el.meta.textContent = "";
    el.status.textContent = "Sin informacion";
    el.time.textContent = "Este partido ya no esta en la agenda en vivo. Vuelve a la agenda de Futbol libre para ver los partidos de hoy en vivo gratis.";
    el.countdown.innerHTML = "";
    el.summary.textContent = "Este partido no aparece en el catalogo actual de Futbol libre TV. Puede que se haya reprogramado o que ya haya terminado: revisa la agenda con los partidos de hoy en vivo gratis.";
    el.infoMatch.textContent = "—";
    el.infoComp.textContent = "—";
    el.infoTime.textContent = "—";
  }

  function renderSources(ev) {
    if (!el.switcher) return;
    if (!ev.sources.length) {
      el.switcher.innerHTML = '<span class="agenda-none">Sin senales disponibles todavia.</span>';
      return;
    }
    el.switcher.innerHTML = ev.sources.map(function (s) {
      return '<button class="source-pill' + (s.index === selected ? " selected" : "") + '" type="button" data-source="' + s.index + '">' +
        "Fuente " + (s.index + 1) +
        "<small>" + FL.esc(s.name + (s.idioma ? " · " + s.idioma : "")) + "</small></button>";
    }).join("");
  }

  function selectSource(index, autoplay) {
    if (!current) return;
    var src = current.sources[index];
    if (!src) return;
    selected = index;
    renderSources(current);
    el.label.textContent = "Fuente " + (index + 1) + " · " + src.name;
    el.placeholder.style.display = "none";
    el.frame.style.display = "block";
    var url = FL.signalLimpia(src, src.channel || src.name);
    if (el.frame.getAttribute("src") !== url) {
      el.frame.setAttribute("src", url);
    } else if (autoplay) {
      el.frame.src = el.frame.src;
    }
    try { history.replaceState(null, "", "#source=" + index); } catch (e) { }
  }

  /*
    Fase del evento segun la hora real de inicio:
      programado  -> aun no empieza (cuenta regresiva)
      vivo        -> ya empezo (temporizador en vivo)
      finalizado -> se acabo
  */
  function fase(ev, now) {
    var f = FL.fase(ev, now);
    return f === "live" ? "vivo" : (f === "ended" ? "finalizado" : "programado");
  }

  function etiquetaFase(f) {
    if (f === "vivo") return "En vivo";
    if (f === "finalizado") return "Finalizado";
    return "Programado";
  }

  function renderMeta(ev) {
    var zone = FL.zoneName();
    var when = FL.fmtDateTime(ev.instant);
    var estado = etiquetaFase(fase(ev, Date.now()));
    var count = ev.sources.length;
    el.meta.textContent = when + " · " + zone + " · " + estado +
      (count ? " · " + count + " senal" + (count === 1 ? "" : "es") : " · sin senales");
  }

  /* Datos estructurados del evento (schema.org/SportsEvent) */
  var jsonLd = null;

  function setJsonLd(ev) {
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.type = "application/ld+json";
      document.head.appendChild(jsonLd);
    }
    var url = location.href.split("#")[0];
    var comp = ev.competition || "Futbol";
    var data = {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      "name": ev.title,
      "description": "Informacion de " + ev.title + " por " + comp + ": fecha, horario y opciones de transmision.",
      "url": url,
      "startDate": new Date(ev.instant).toISOString(),
      "eventStatus": "https://schema.org/EventScheduled",
      "inLanguage": "es",
      "sport": "Soccer",
      "competitor": (ev.teams.length >= 2 ? ev.teams : [ev.title]).map(function (t) {
        return { "@type": "Thing", "name": t };
      }),
      "superEvent": { "@type": "Event", "name": comp },
      "isAccessibleForFree": true,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "availability": "https://schema.org/InStock" }
    };
    jsonLd.textContent = JSON.stringify(data);
  }

  function renderInfo(ev) {
    el.title.textContent = ev.title;
    el.crumb.textContent = ev.title;
    el.competition.innerHTML = ev.competition
      ? "<a href='" + FL.esc(FL.link("agenda.html")) + "'>" + FL.esc(ev.competition) + "</a>"
      : "";
    el.infoMatch.textContent = ev.title;
    el.infoComp.textContent = ev.competition || "—";
    el.infoTime.textContent = FL.fmtDateTime(ev.instant) + " (" + FL.zoneName() + ")";
    el.summary.textContent = ev.title + " se juega en " + (ev.competition || "el catalogo") +
      ". El horario es " + FL.fmtDateTime(ev.instant) + " (" + FL.zoneName() + ") y en Futbol libre TV puedes " +
      (ev.sources.length
        ? "verlo en vivo gratis con " + ev.sources.length + " senal" + (ev.sources.length === 1 ? "" : "es") + " disponible" + (ev.sources.length === 1 ? "" : "s") + "."
        : "seguir el partido en vivo gratis en cuanto se publiquen las senales.");

    /* SEO: titulo y descripcion en funcion del partido */
    var comp = ev.competition ? " · " + ev.competition : "";
    document.title = ev.title + ": ver en vivo gratis" + comp + " | Futbol libre TV";
    var desc = "Ver " + ev.title + (ev.competition ? " por " + ev.competition : "") +
      " en vivo gratis: horario en tu zona horaria, cuenta regresiva y todas las senales disponibles.";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", ev.title + (comp ? comp : "") + " | Futbol libre TV");
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", desc);
    setJsonLd(ev);
  }

  function tick() {
    if (!current || isNaN(current.instant)) return;
    var now = Date.now();
    var diff = current.instant - now;
    var f = fase(current, now);
    var parts = el.countdown.querySelectorAll("[data-part]");

    el.status.textContent = etiquetaFase(f) +
      (current.sources.length ? " · senales disponibles" : " · sin senales");
    el.lifecycle.classList.toggle("is-live", f === "vivo");
    el.liveDot.classList.toggle("on", f === "vivo");

    if (f === "programado") {
      /* Cuenta regresiva hasta el inicio */
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      if (parts.length === 4) {
        parts[0].textContent = d;
        parts[1].textContent = String(h).padStart(2, "0");
        parts[2].textContent = String(m).padStart(2, "0");
        parts[3].textContent = String(s).padStart(2, "0");
      }
      el.countdown.style.display = "";
      if (el.liveTimer) el.liveTimer.hidden = true;
      el.time.textContent = "Comienza el " + FL.fmtDateTime(current.instant) + " (" + FL.zoneName() + "). Podras verlo en vivo gratis con todas sus senales.";

    } else if (f === "vivo") {
      /* En vivo: temporizador con el tiempo ya transcurrido */
      var elapsed = Math.floor((now - current.instant) / 1000);
      var lp = el.liveTimer ? el.liveTimer.querySelectorAll("[data-live]") : [];
      if (lp.length === 3) {
        lp[0].textContent = String(Math.floor(elapsed / 3600)).padStart(2, "0");
        lp[1].textContent = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
        lp[2].textContent = String(elapsed % 60).padStart(2, "0");
      }
      el.countdown.style.display = "none";
      if (el.liveTimer) el.liveTimer.hidden = false;
      var mins = Math.floor(elapsed / 60);
      el.time.textContent = "Transmision en curso · " + mins + " min desde el inicio. Lo ves en vivo gratis en Futbol libre TV.";

    } else {
      /* Finalizado */
      el.countdown.style.display = "none";
      if (el.liveTimer) el.liveTimer.hidden = true;
      el.time.textContent = "Evento finalizado · " + FL.fmtDateTime(current.instant) + ". Revisa la agenda con los partidos de hoy en vivo gratis.";
    }

    renderMeta(current);
  }

  function render() {
    current = findEvent();
    if (!current) { notFound(); return; }
    renderInfo(current);
    renderSources(current);
    tick();
    if (selected >= 0 && current.sources[selected]) {
      selectSource(selected, false);
    }
  }

  if (el.switcher) {
    el.switcher.addEventListener("click", function (e) {
      var btn = e.target.closest(".source-pill");
      if (!btn) return;
      selectSource(parseInt(btn.getAttribute("data-source"), 10), true);
    });
  }

  if (el.retry) {
    el.retry.addEventListener("click", function () {
      var url = el.frame.getAttribute("src");
      if (!url) return;
      el.frame.src = url;
    });
  }

  FL.subscribe(function () {
    var before = current ? current.sources.length : -1;
    var found = findEvent();
    if (!found) return;
    var after = found.sources.length;
    current = found;
    if (before !== after) {
      renderInfo(current);
      renderSources(current);
      if (selected >= 0 && current.sources[selected]) selectSource(selected, false);
    }
    tick();
  });

  FL.ready().then(function () {
    render();
    var m = /#source=(\d+)/.exec(location.hash || "");
    if (m) {
      selected = parseInt(m[1], 10);
      if (current && current.sources[selected]) selectSource(selected, true);
    }
    setInterval(tick, 1000);
  });
})();
