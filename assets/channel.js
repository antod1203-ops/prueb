/* =========================================================
   Futbol Libre — pagina de canal
   El canal se reproduce aunque no tenga eventos programados.
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  var slug = FL.routeParam("c");
  var tabsEl = document.getElementById("dayTabs");
  var listEl = document.getElementById("agendaList");
  var nameEl = document.getElementById("channelName");
  var metaEl = document.getElementById("channelMeta");
  var crumbEl = document.getElementById("crumbTitle");
  var dayTitle = document.getElementById("agendaDayTitle");
  var daySub = document.getElementById("agendaDaySub");
  var expanded = {};
  var activeKey = "";
  var playerOn = false;

  var pl = {
    panel: document.getElementById("channelPlayer"),
    frame: document.getElementById("playerFrame"),
    placeholder: document.getElementById("playerPlaceholder"),
    label: document.getElementById("playerLabel"),
    dot: document.getElementById("liveDot"),
    note: document.getElementById("playerNote"),
    retry: document.getElementById("playerRetry")
  };

  FL.bindAgenda(listEl, expanded);

  function channel() {
    return FL.channelBySlug(slug);
  }

  function events() {
    return FL.eventsByChannel(slug);
  }

  function dayKeys() {
    var map = {};
    events().forEach(function (ev) { map[FL.dayKey(ev.instant)] = true; });
    var keys = Object.keys(map);
    var today = FL.dayKey(Date.now());
    if (keys.indexOf(today) === -1) keys.push(today);
    keys.sort();
    return keys;
  }

  function eventsFor(key) {
    return events().filter(function (ev) { return FL.dayKey(ev.instant) === key; });
  }

  /* ---------- Reproductor del canal ---------- */
  function playChannel(ch) {
    if (!pl.frame || !ch) return;
    var pb = FL.channelPlayback(ch);

    if (!pb) {
      pl.panel.hidden = true;
      return;
    }

    pl.panel.hidden = false;
    pl.label.textContent = ch.nombre + " en vivo gratis";
    pl.note.innerHTML = pb.origen === "directo"
      ? '<span class="agenda-none">Senal directa del canal (sin partidos hoy)</span>'
      : '<span class="agenda-none">Senal del canal en la agenda de hoy</span>';

    if (playerOn) return;
    playerOn = true;

    pl.placeholder.style.display = "none";
    pl.frame.style.display = "block";
    pl.frame.setAttribute("src", pb.url);
    pl.dot.classList.add("on");
  }

  if (pl.retry) {
    pl.retry.addEventListener("click", function () {
      var src = pl.frame.getAttribute("src");
      if (!src) return;
      pl.frame.src = src;
    });
  }

  function render() {
    var ch = channel();
    if (!ch) {
      document.title = "Canal no encontrado | Futbol libre TV";
      /* Sin canal no hay contenido: noindex para no indexar paginas vacias */
      var robots = document.querySelector('meta[name="robots"]');
      if (robots) robots.setAttribute("content", "noindex, follow");
      nameEl.textContent = "Canal no encontrado";
      metaEl.textContent = "El canal solicitado no existe en el directorio.";
      if (pl.panel) pl.panel.hidden = true;
      return;
    }
    nameEl.textContent = ch.nombre;
    crumbEl.textContent = ch.nombre;
    document.title = ch.nombre + " en vivo gratis | Futbol libre TV";
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Ver " + ch.nombre + " en vivo gratis desde Futbol libre TV: reproductor del canal y los partidos de hoy en vivo gratis, con horarios en tu zona horaria.");
    }
    var ogT = document.querySelector('meta[property="og:title"]');
    if (ogT) ogT.setAttribute("content", ch.nombre + " en vivo gratis | Futbol libre TV");
    metaEl.textContent = ch.senales > 0
      ? ch.senales + " senal" + (ch.senales === 1 ? "" : "es") + " disponible" + (ch.senales === 1 ? "" : "s") +
        " · " + ch.eventos + " partido" + (ch.eventos === 1 ? "" : "s") + " en la agenda de hoy. Ver " + ch.nombre + " en vivo gratis."
      : "Este canal todavia no tiene senales en la agenda de hoy, pero puedes abrir su reproductor en vivo gratis.";

    playChannel(ch);

    var keys = dayKeys();
    if (!activeKey || keys.indexOf(activeKey) === -1) {
      var today = FL.dayKey(Date.now());
      activeKey = keys.indexOf(today) !== -1 ? today : keys[0];
    }

    if (tabsEl) {
      tabsEl.innerHTML = keys.map(function (k) {
        var count = eventsFor(k).length;
        var label = k === FL.dayKey(Date.now()) ? "Hoy" : FL.fmtDayShort(FL.keyToDate(k));
        return '<button class="day-tab' + (k === activeKey ? " active" : "") + '" type="button" data-key="' + k + '" role="tab" aria-selected="' + (k === activeKey) + '">' +
          label + "<small>" + count + " partido" + (count === 1 ? "" : "s") + "</small></button>";
      }).join("");
    }

    if (dayTitle) dayTitle.textContent = FL.fmtDayLong(FL.keyToDate(activeKey));
    if (daySub) daySub.textContent = ch.nombre + " · " + FL.zoneName();

    FL.renderAgenda(listEl, eventsFor(activeKey), {
      expanded: expanded,
      empty: "Este canal no tiene partidos programados para este dia, pero su senal sigue disponible arriba para ver en vivo gratis."
    });
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".day-tab");
      if (!btn) return;
      activeKey = btn.getAttribute("data-key");
      render();
    });
  }

  FL.subscribe(function () { render(); });

  FL.ready().then(function () { render(); });
})();
