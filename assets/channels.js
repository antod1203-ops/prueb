/* =========================================================
   Futbol Libre — directorio de canales
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  var gridEl = document.getElementById("channelGrid");
  var searchEl = document.getElementById("channelSearch");
  var onlyActiveEl = document.getElementById("onlyActive");
  var query = "";

  function initials(name) {
    return String(name).split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
  }

  function render() {
    if (!gridEl) return;
    var list = FL.channels().sort(function (a, b) {
      if ((b.senales > 0) !== (a.senales > 0)) return (b.senales > 0) ? 1 : -1;
      return a.nombre.localeCompare(b.nombre, "es");
    });
    if (onlyActiveEl && onlyActiveEl.checked) {
      list = list.filter(function (c) { return c.senales > 0; });
    }
    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function (c) { return c.nombre.toLowerCase().indexOf(q) !== -1; });
    }
    if (!list.length) {
      gridEl.innerHTML = '<p class="empty">No hay canales que coincidan con la busqueda.</p>';
      return;
    }
    gridEl.innerHTML = list.map(function (c) {
      var logo = c.logo
        ? '<img src="' + FL.esc(c.logo) + '" alt="' + FL.esc(c.nombre) + '" loading="lazy" decoding="async">'
        : FL.esc(initials(c.nombre));
      var detail = c.senales > 0
        ? c.senales + " senal" + (c.senales === 1 ? "" : "es") + " · " + c.eventos + " partido" + (c.eventos === 1 ? "" : "s")
        : "Sin senales en la agenda de hoy";
      var live = FL.channelPlayback(c)
        ? '<p class="channel-live">Ver en vivo gratis</p>' : "";
      return '<a class="channel-card' + (c.senales ? "" : " is-empty") + '" href="' + FL.esc(FL.link("channel.html", { c: c.slug })) + '">' +
        '<div class="channel-logo">' + logo + "</div>" +
        "<h3>" + FL.esc(c.nombre) + "</h3>" +
        "<p>" + FL.esc(detail) + "</p>" + live + "</a>";
    }).join("");

    /* Datos estructurados del directorio */
    FL.setJsonLd({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Canales deportivos",
      "numberOfItems": list.length,
      "itemListElement": list.slice(0, 60).map(function (c, i) {
        return {
          "@type": "ListItem",
          "position": i + 1,
          "name": c.nombre,
          "url": location.origin + location.pathname.replace(/[^/]*$/, "") + "channel.html?c=" + c.slug
        };
      })
    });
  }

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      query = searchEl.value.trim();
      render();
    });
  }

  if (onlyActiveEl) {
    onlyActiveEl.addEventListener("change", render);
  }

  FL.subscribe(function () { render(); });

  FL.ready().then(function () { render(); });
})();
