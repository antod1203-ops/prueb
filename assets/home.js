/* =========================================================
   Futbol Libre — portada
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  var tabsEl = document.getElementById("dayTabs");
  var listEl = document.getElementById("agendaList");
  var titleEl = document.getElementById("homeTitle");
  var stripEl = document.getElementById("channelStrip");
  var expanded = {};
  var activeKey = "";

  FL.bindAgenda(listEl, expanded);

  function dayKeys() {
    var map = {};
    FL.state.events.forEach(function (ev) { map[FL.dayKey(ev.instant)] = true; });
    var keys = Object.keys(map);
    var today = FL.dayKey(Date.now());
    if (keys.indexOf(today) === -1) keys.push(today);
    keys.sort();
    return keys;
  }

  function eventsFor(key) {
    return FL.state.events.filter(function (ev) { return FL.dayKey(ev.instant) === key; });
  }

  function renderTabs(keys) {
    if (!tabsEl) return;
    tabsEl.innerHTML = keys.map(function (k) {
      var ts = FL.keyToDate(k);
      var count = eventsFor(k).length;
      var label = k === FL.dayKey(Date.now()) ? "Hoy" : FL.fmtDayShort(ts);
      return '<button class="day-tab' + (k === activeKey ? " active" : "") + '" type="button" data-key="' + k + '" role="tab" aria-selected="' + (k === activeKey) + '">' +
        label + "<small>" + count + " partido" + (count === 1 ? "" : "s") + "</small></button>";
    }).join("");
  }

  function render() {
    var keys = dayKeys();
    if (!activeKey || keys.indexOf(activeKey) === -1) {
      var today = FL.dayKey(Date.now());
      activeKey = keys.indexOf(today) !== -1 ? today : keys[0];
    }
    renderTabs(keys);

    var events = eventsFor(activeKey);
    if (titleEl) {
      titleEl.textContent = activeKey === FL.dayKey(Date.now())
        ? "Partidos de hoy en vivo gratis"
        : "Partidos del " + FL.fmtDayShort(FL.keyToDate(activeKey)) + " en vivo gratis";
    }
    FL.renderAgenda(listEl, events, {
      expanded: expanded,
      empty: "No hay partidos de hoy en vivo gratis programados todavia."
    });
  }

  function renderChannels() {
    if (!stripEl) return;
    var list = FL.channels().filter(function (c) { return c.senales > 0; }).slice(0, 12);
    if (!list.length) { stripEl.innerHTML = '<p class="empty">Sin senales cargadas todavia.</p>'; return; }
    stripEl.innerHTML = list.map(function (c) {
      var inner = c.logo
        ? '<img src="' + FL.esc(c.logo) + '" alt="" loading="lazy" decoding="async">'
        : '<span class="channel-logo" style="width:54px;height:28px;font-size:11px">' + FL.esc(initials(c.nombre)) + "</span>";
      return '<a class="channel-mini" href="' + FL.esc(FL.link("channel.html", { c: c.slug })) + '">' +
        inner + "<span>" + FL.esc(c.nombre) + "</span></a>";
    }).join("");
  }

  function initials(name) {
    return String(name).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }

  /* Contadores de la portada */
  function renderStats() {
    var box = document.getElementById("heroStats");
    if (!box) return;
    var eventos = FL.state.events.length;
    var canales = FL.channels();
    var conSenal = canales.filter(function (c) { return c.senales > 0; });
    var senales = conSenal.reduce(function (n, c) { return n + c.senales; }, 0);
    var set = function (k, v) {
      var el = box.querySelector('[data-stat="' + k + '"]');
      if (el) el.textContent = v;
    };
    set("eventos", eventos);
    set("canales", conSenal.length);
    set("senales", senales);
  }

  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".day-tab");
      if (!btn) return;
      activeKey = btn.getAttribute("data-key");
      render();
    });
  }

  FL.subscribe(function () {
    render();
    renderChannels();
    renderStats();
  });

  FL.ready().then(function () {
    render();
    renderChannels();
    renderStats();
  });
})();
