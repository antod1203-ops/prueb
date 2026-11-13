/* =========================================================
   Futbol Libre — interfaz comun (todas las paginas)
   - SEO en tiempo de ejecucion (canonical y og:url absolutos)
   - Indicador de auto-actualizacion
   - Boton "volver arriba" y sombra del header
   ========================================================= */
(function () {
  "use strict";

  var FL = window.FL;
  if (!FL) return;

  /* ---------- SEO: canonical y og:url absolutos ---------- */
  (function seo() {
    /*
      Base del sitio:
        - En http(s) se deriva de la propia pagina (location.origin).
        - Con file:// (abrir el HTML haciendo doble clic) location.origin es
          "null" y new URL() revienta, asi que se usa sitioUrl de la
          configuracion como respaldo.
    */
    var cfgUrl = (FL.CFG && FL.CFG.sitioUrl) || "";
    var origin = location.origin;
    var base;
    if (origin && origin !== "null") {
      base = origin + location.pathname.replace(/[^/]*$/, "");
    } else {
      base = cfgUrl.replace(/\/+$/, "") + "/";
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", origin && origin !== "null"
        ? location.href.split("#")[0]
        : base + location.pathname.split("/").pop());
    }

    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute("content", canonical ? canonical.getAttribute("href") : location.href.split("#")[0]);
    }

    var img = (FL.CFG && FL.CFG.ogImage) || "assets/img/og-image.png";
    var absImg = img;
    try { absImg = new URL(img, base).href; } catch (e) { absImg = img; }
    var ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.setAttribute("content", absImg);
    var twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.setAttribute("content", absImg);
  })();

  /* ---------- Año en el pie de pagina ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Indicador de actualizacion ---------- */
  var pill = document.getElementById("updatePill");
  var text = document.getElementById("updateText");

  function refreshText() {
    if (!pill || !text) return;
    var ts = FL.state.fetchedAt;
    if (FL.state.loading) {
      pill.classList.add("is-loading");
      pill.classList.remove("is-error");
      text.textContent = "Actualizando…";
      return;
    }
    pill.classList.remove("is-loading");
    if (FL.state.error) {
      pill.classList.add("is-error");
      text.textContent = "Sin conexion · reintentando";
      return;
    }
    if (!ts) { text.textContent = "Cargando agenda…"; return; }
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    text.textContent = s < 60
      ? "Actualizado hace " + s + " s"
      : "Actualizado hace " + Math.floor(s / 60) + " min";
  }

  if (pill) {
    setInterval(refreshText, 1000);
    FL.subscribe(function () { refreshText(); });
    refreshText();
  }

  /* ---------- Pantalla completa del reproductor ----------
     El reproductor del proveedor (Clappr) ya pone el video en pantalla
     completa con doble clic. Este manejador es la red de seguridad para
     las zonas del marco que no cubre la senal y para los proveedores
     que no gestionan el doble clic. */
  document.addEventListener("dblclick", function (e) {
    var panel = e.target.closest && e.target.closest(".player-panel");
    if (!panel) return;
    if (e.target.closest && e.target.closest("button, a, input, select, textarea")) return;
    FL.toggleFullscreen(panel);
  });

  /* ---------- Volver arriba + sombra del header ---------- */
  var btn = document.getElementById("back-to-top");
  var header = document.getElementById("cabecera");

  if (btn) {
    var sync = function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      var nearBottom = (y + window.innerHeight) >= h - 160;
      btn.classList.toggle("show", y > 420 || nearBottom);
      if (header) header.classList.toggle("is-scrolled", y > 8);
    };
    btn.addEventListener("click", function () {
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }
      catch (e) { window.scrollTo(0, 0); }
    });
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }

  /* ---------- Enlace activo ---------- */
  var here = location.pathname.split("/").pop().replace(/\.html$/i, "") || "index";
  FL.$$(".site-nav a").forEach(function (a) {
    var target = (a.getAttribute("href") || "").split("/").pop().replace(/\.html$/i, "").split("?")[0];
    if (target && (target === here || (here === "match" && target === "agenda") || (here === "channel" && target === "channels"))) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- URLs limpias (si el servidor soporta reescrituras) ---------- */
  if (FL.pretty) {
    FL.$$("a[href]").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || /^(https?:|#|mailto:|tel:)/i.test(href)) return;
      /* Los enlaces con parametros ya traen su forma definitiva:
         reescribirlos aqui perderia el query string. */
      if (href.indexOf("?") !== -1) return;
      var file = href.split("/").pop().replace(/\.html$/i, "");
      if (!file) return;
      a.setAttribute("href", FL.link(file + ".html"));
    });
  }
})();
