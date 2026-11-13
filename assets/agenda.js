/* =========================================================
   Futbol Libre — pagina de agenda
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  var tabsEl = document.getElementById("dayTabs");
  var listEl = document.getElementById("agendaList");
  var dayTitle = document.getElementById("agendaDayTitle");
  var daySub = document.getElementById("agendaDaySub");
  var searchEl = document.getElementById("agendaSearch");
  var tzEl = document.getElementById("userTimezone");
  var expanded = {};
  var activeKey = "";
  var query = "";

  FL.bindAgenda(listEl, expanded);

  if (tzEl) tzEl.textContent = FL.zoneName();

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
    var list = FL.state.events.filter(function (ev) { return FL.dayKey(ev.instant) === key; });
    if (!query) return list;
    var q = query.toLowerCase();
    return list.filter(function (ev) {
      var hay = (ev.competition + " " + ev.title + " " + ev.country + " " +
        ev.sources.map(function (s) { return s.name; }).join(" ")).toLowerCase();
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
    });
  }

  function renderTabs(keys) {
    if (!tabsEl) return;
    tabsEl.innerHTML = keys.map(function (k) {
      var count = eventsFor(k).length;
      var label = k === FL.dayKey(Date.now()) ? "Hoy" : FL.fmtDayShort(FL.keyToDate(k));
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

    if (dayTitle) dayTitle.textContent = FL.fmtDayLong(FL.keyToDate(activeKey));
    if (daySub) daySub.textContent = "Agenda Deportiva · " + FL.zoneName();

    var events = eventsFor(activeKey);
    FL.renderAgenda(listEl, events, {
      expanded: expanded,
      empty: query
        ? "No hay partidos que coincidan con la busqueda."
        : "No hay partidos de hoy en vivo gratis programados para este dia todavia."
    });

    /* Datos estructurados de los partidos del dia */
    var base = location.origin + location.pathname.replace(/[^/]*$/, "");
    FL.setJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Agenda deportiva - " + FL.fmtDayLong(FL.keyToDate(activeKey)),
      "numberOfItems": events.length,
      "itemListElement": events.slice(0, 60).map(function (ev, i) {
        return {
          "@type": "ListItem",
          "position": i + 1,
          "name": ev.title,
          "url": base + "match.html?e=" + encodeURIComponent(ev.slug)
        };
      })
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

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      query = searchEl.value.trim();
      render();
    });
    searchEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && searchEl.value) {
        searchEl.value = "";
        query = "";
        render();
      }
    });
  }

  FL.subscribe(function () { render(); });

  FL.ready().then(function () { render(); });
})();
