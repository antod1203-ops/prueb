(function () {
  'use strict';

  const CONFIG = Object.freeze({
    agendaUrl: 'https://agenda18.com/agenda.json',
    imgHost: 'https://img.agenda18.com',
    imgFallback: 'assets/img/sin-imagen.svg',
    localAssetPaths: [],

    liveMinutes: 180,
    liveEarlyMinutes: 2,
    sourceTimezone: '-06:00',
    displayTimezone: 'America/Lima',

    refreshMs: 60000,

    reproductorBase: 'https://la18hd.su/vivo/canal.php?stream=',

    playerPage: 'reproductor.html',
    channelPage: 'canal.html',
    prettyUrls: false,

    allowedSports: ['futbol', 'basketball', 'tennis', 'formula1', 'boxing', 'mma(ufc)', 'wwe'],

    durations: {
      'futbol': 180, 'basketball': 180, 'tennis': 240,
      'formula1': 180, 'boxing': 300, 'mma(ufc)': 300, 'wwe': 240
    },

    channels: {
      'directv-sports': {
        name: 'DSports', stream: 'dsports',
        logo: 'https://img.agenda18.com/uploads/dsports_bea74cb844.webp'
      },
      'directv-sports-2': {
        name: 'DSports 2', stream: 'dsports2',
        logo: 'https://img.agenda18.com/uploads/dsports_2_3481b3d20c.webp'
      },
      'directv-sports-plus': {
        name: 'DSports+', stream: 'dsportsplus',
        logo: 'https://img.agenda18.com/uploads/dsports_plus_e24f78b7c0.webp'
      },
      'espn-1': {
        name: 'ESPN', stream: 'espn',
        logo: 'https://img.agenda18.com/uploads/espn_16110aaa3a.webp'
      },
      'espn-2': {
        name: 'ESPN 2', stream: 'espn2',
        logo: 'https://img.agenda18.com/uploads/espn_2_82441267e9.webp'
      },
      'espn-3': {
        name: 'ESPN 3', stream: 'espn3',
        logo: 'https://img.agenda18.com/uploads/espn_3_0f4a5444d4.webp'
      },
      'fox-sports-1': {
        name: 'Fox Sports', stream: 'foxsports',
        logo: 'https://img.agenda18.com/uploads/fox_sports_1_7dbc294272.webp'
      },
      'fox-sports-2': {
        name: 'Fox Sports 2', stream: 'foxsports2',
        logo: 'https://img.agenda18.com/uploads/fox_sports_2_64ae4cc2b7.webp'
      },
      'fox-sports-3': {
        name: 'Fox Sports 3', stream: 'foxsports3',
        logo: 'https://img.agenda18.com/uploads/fox_sports_3_3c801c9d4c.webp'
      }
    }
  });

  const Util = {
    $: (sel, root) => (root || document).querySelector(sel),
    $$: (sel, root) => Array.from((root || document).querySelectorAll(sel)),

    el(tag, attrs, children) {
      const node = document.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (key) {
          const value = attrs[key];
          if (value === null || value === undefined || value === false) return;
          if (key === 'class') node.className = value;
          else if (key === 'text') node.textContent = value;
          else if (key.slice(0, 2) === 'on' && typeof value === 'function') {
            node.addEventListener(key.slice(2).toLowerCase(), value);
          } else if (value === true) node.setAttribute(key, '');
          else node.setAttribute(key, value);
        });
      }
      if (children !== undefined && children !== null) {
        [].concat(children).forEach(function (child) {
          if (child === null || child === undefined || child === false) return;
          node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
        });
      }
      return node;
    },

    svg(viewBox, pathData, extra) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', viewBox);
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      if (extra) Object.keys(extra).forEach(function (k) { svg.setAttribute(k, extra[k]); });
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
      return svg;
    },

    normalize(value) {
      return String(value === null || value === undefined ? '' : value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    },

    decodeEntities(value) {
      const area = document.createElement('textarea');
      area.innerHTML = String(value === null || value === undefined ? '' : value);
      return area.value;
    },

    toDate(dateStr, timeStr, offset) {
      if (!dateStr || !timeStr) return new Date(NaN);
      const time = String(timeStr).trim();
      const iso = time.length === 5 ? time + ':00' : time;
      return new Date(dateStr + 'T' + iso + offset);
    },

    formatTime(date, timeZone) {
      if (isNaN(date.getTime())) return '--:--';
      try {
        const parts = new Intl.DateTimeFormat('es-PE', {
          timeZone: timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
        }).formatToParts(date);
        const hour = (parts.find(function (p) { return p.type === 'hour'; }) || {}).value || '--';
        const minute = (parts.find(function (p) { return p.type === 'minute'; }) || {}).value || '--';
        return hour + ':' + minute;
      } catch (err) {
        return date.toISOString().slice(11, 16);
      }
    },

    formatDateLong(date, timeZone) {
      try {
        const text = new Intl.DateTimeFormat('es-PE', {
          timeZone: timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).format(date);
        return text.charAt(0).toUpperCase() + text.slice(1);
      } catch (err) {
        return '';
      }
    },

    assetUrl(path) {
      if (!path) return CONFIG.imgFallback;
      const value = String(path);
      if (/^(https?:)?\/\//i.test(value)) return value;
      if (value.charAt(0) === '/' && CONFIG.localAssetPaths.indexOf(value) === -1) {
        return CONFIG.imgHost.replace(/\/+$/, '') + value;
      }
      return value;
    },

    decodeEmbedParam(raw) {
      if (!raw) return '';
      let b64 = String(raw).replace(/\s/g, '+').replace(/-/g, '+').replace(/_/g, '/');
      b64 += new Array((4 - (b64.length % 4)) % 4 + 1).join('=');
      try {
        const url = atob(b64);
        return /^https?:\/\//i.test(url) ? url : '';
      } catch (err) {
        return '';
      }
    },

    resolveEmbed(raw) {
      if (!raw) return '';
      const value = String(raw);
      if (/^https?:\/\//i.test(value)) return value;
      const match = value.match(/[?&]r=([^&]+)/);
      if (match) return CONFIG.playerPage + '?r=' + encodeURIComponent(match[1]);
      return value;
    },

    debounce(fn, wait) {
      let timer = null;
      return function () {
        const args = arguments;
        const ctx = this;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
      };
    }
  };

  const Seo = {
    setMeta(attr, key, value) {
      if (!value) return;
      let node = document.head.querySelector('meta[' + attr + '="' + key + '"]');
      if (!node) {
        node = document.createElement('meta');
        node.setAttribute(attr, key);
        document.head.appendChild(node);
      }
      node.setAttribute('content', value);
    },

    setCanonical(path) {
      const url = new URL(path || '/', window.location.origin).href;
      let link = document.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', url);
      Seo.setMeta('property', 'og:url', url);
      return url;
    },

    absolutizeImages() {
      ['og:image', 'twitter:image'].forEach(function (key) {
        const attr = key.indexOf('og:') === 0 ? 'property' : 'name';
        const node = document.head.querySelector('meta[' + attr + '="' + key + '"]');
        if (!node) return;
        const value = node.getAttribute('content');
        if (value && !/^https?:\/\//i.test(value)) {
          node.setAttribute('content', new URL(value, window.location.origin).href);
        }
      });
    },

    apply(data) {
      if (!data) return;
      if (data.title) {
        document.title = data.title;
        Seo.setMeta('property', 'og:title', data.title);
        Seo.setMeta('name', 'twitter:title', data.title);
      }
      if (data.description) {
        Seo.setMeta('name', 'description', data.description);
        Seo.setMeta('property', 'og:description', data.description);
        Seo.setMeta('name', 'twitter:description', data.description);
      }
      if (data.canonical) Seo.setCanonical(data.canonical);
      if (data.jsonLd) {
        const existing = document.head.querySelector('script[data-seo-jsonld]');
        if (existing) existing.remove();
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', '');
        script.textContent = JSON.stringify(data.jsonLd);
        document.head.appendChild(script);
      }
    }
  };

  const Menu = {
    modal: null,
    toggle: null,
    closeBtn: null,
    lastFocus: null,

    init() {
      this.modal = Util.$('#menu-modal');
      this.toggle = Util.$('#menu-toggle');
      if (!this.modal || !this.toggle) return;

      this.closeBtn = Util.$('#menu-close');
      this.toggle.setAttribute('aria-expanded', 'false');
      this.toggle.setAttribute('aria-controls', 'menu-modal');

      const self = this;
      this.toggle.addEventListener('click', function () { self.open(); });
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', function () { self.close(); });
      }
      this.modal.addEventListener('click', function (event) {
        if (event.target === self.modal) self.close();
      });
      document.addEventListener('keydown', function (event) {
        if (!self.modal.classList.contains('is-open')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          self.close();
        } else if (event.key === 'Tab') {
          self.trapFocus(event);
        }
      });
      Util.$$('a', this.modal).forEach(function (link) {
        link.addEventListener('click', function () { self.close(); });
      });
    },

    open() {
      this.lastFocus = document.activeElement;
      this.modal.classList.add('is-open');
      this.toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (this.closeBtn) this.closeBtn.focus();
    },

    close() {
      if (!this.modal.classList.contains('is-open')) return;
      this.modal.classList.remove('is-open');
      this.toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      const target = (this.lastFocus && this.lastFocus !== document.body && this.lastFocus.focus)
        ? this.lastFocus
        : this.toggle;
      if (target.focus) target.focus();
    },

    trapFocus(event) {
      const focusables = Util.$$('a[href], button:not([disabled])', this.modal)
        .filter(function (node) { return node.offsetParent !== null; });
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const Player = {
    frame: null,
    box: null,
    button: null,
    timer: null,
    PLAYER_TIMEOUT: 4000,

    init() {
      if (this.frame) return;
      this.frame = Util.$('#embedIframe');
      if (!this.frame) return;

      this.box = this.frame.closest('.player__frame');
      this.button = Util.$('#btnIframe');

      const self = this;
      this.frame.addEventListener('load', function () {
        if (self.frame.getAttribute('src')) self.ready();
      });
      if (this.button) {
        this.button.addEventListener('click', function () { self.reload(); });
      }

      const raw = new URLSearchParams(window.location.search).get('r');
      const decoded = raw ? Util.decodeEmbedParam(raw) : '';
      const source = this.frame.getAttribute('data-src') || decoded;

      if (source) this.setSource(source);
      else this.ready();
    },

    setSource(url) {
      if (!url) return;
      if (this.box) this.box.classList.add('is-loading');
      this.frame.setAttribute('data-src', url);
      this.frame.setAttribute('src', url);
      this.startFallback();
    },

    reload() {
      const url = this.frame.getAttribute('data-src');
      if (!url) return;
      if (this.box) this.box.classList.add('is-loading');
      this.frame.setAttribute('src', url);
      this.startFallback();
    },

    ready() {
      clearTimeout(this.timer);
      if (this.box) this.box.classList.remove('is-loading');
    },

    startFallback() {
      const self = this;
      clearTimeout(this.timer);
      this.timer = setTimeout(function () { self.ready(); }, this.PLAYER_TIMEOUT);
    }
  };

  const Agenda = {
    list: null,
    title: null,
    search: null,
    status: null,
    signature: null,
    pending: null,
    timer: null,
    scrollRestored: false,

    init() {
      this.list = Util.$('#agenda-list');
      if (!this.list) return;

      this.title = Util.$('#agenda-title');
      this.search = Util.$('#agenda-search');
      this.status = Util.$('#agenda-status');

      const self = this;

      if (this.search) {
        const applyFilter = Util.debounce(function () { self.filter(); }, 120);
        this.search.addEventListener('input', applyFilter);
        this.search.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && self.search.value) {
            self.search.value = '';
            self.filter();
          }
        });
      }

      this.list.addEventListener('click', function (event) { self.onClick(event); });
      this.list.addEventListener('keydown', function (event) { self.onKeydown(event); });

      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
      window.addEventListener('pagehide', function () {
        try {
          window.sessionStorage.setItem('agendaScrollY', String(window.scrollY));
        } catch (err) {}
      });

      this.load();
      this.timer = setInterval(function () { self.load(); }, CONFIG.refreshMs);

      document.addEventListener('visibilitychange', function () {
        clearInterval(self.timer);
        if (!document.hidden) {
          self.load();
          self.timer = setInterval(function () { self.load(); }, CONFIG.refreshMs);
        }
      });
    },

    load() {
      if (!window.fetch) { this.fail(); return; }
      const self = this;
      fetch(CONFIG.agendaUrl, {
        cache: 'no-cache',
        headers: { accept: 'application/json' }
      })
        .then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.json();
        })
        .then(function (json) { self.render(json && json.data ? json.data : []); })
        .catch(function () { self.fail(); });
    },

    fail() {
      if (this.list.querySelector('.agenda-item')) return;
      this.list.replaceChildren(
        Util.el('li', { class: 'agenda-msg', text: 'No se pudo cargar la agenda. Reintentando en un momento…' })
      );
      this.announce('No se pudo cargar la agenda.');
    },

    announce(message) {
      if (this.status) this.status.textContent = message;
    },

    render(events) {
      const now = Date.now();
      const visible = events.filter(function (event) {
        if (!event || !event.attributes || !event.attributes.diary_hour) return false;
        const sport = String(event.attributes.deportes || '').toLowerCase();
        return !sport || CONFIG.allowedSports.indexOf(sport) !== -1;
      });

      const rows = visible.map(function (event) { return this.buildRow(event, now); }, this);
      rows.sort(function (a, b) {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return (a.sortKey + ' ' + a.country).localeCompare(b.sortKey + ' ' + b.country);
      });

      const signature = rows.map(function (row) {
        return row.eventId + ':' + row.state + ':' + row.embeds.length;
      }).join('|');

      if (signature === this.signature) return;
      this.signature = signature;

      if (this.list.querySelector('.agenda-submenu.is-open')) {
        this.pending = rows;
        return;
      }
      this.paint(rows);
    },

    paint(rows) {
      if (this.title) {
        this.title.textContent = 'Agenda — ' + Util.formatDateLong(new Date(), CONFIG.displayTimezone);
      }

      const fragment = document.createDocumentFragment();
      rows.forEach(function (row) { fragment.appendChild(row.node); });
      this.list.replaceChildren(fragment);

      this.hydrateImages(this.list);
      this.filter();
      this.announce(rows.length + (rows.length === 1 ? ' partido programado.' : ' partidos programados.'));

      if (!this.scrollRestored) {
        this.scrollRestored = true;
        let saved = null;
        try { saved = window.sessionStorage.getItem('agendaScrollY'); } catch (err) { saved = null; }
        if (saved !== null) {
          requestAnimationFrame(function () { window.scrollTo(0, parseInt(saved, 10) || 0); });
        }
      }
    },

    buildRow(event, now) {
      const attrs = event.attributes || {};
      const start = Util.toDate(attrs.date_diary, attrs.diary_hour, CONFIG.sourceTimezone);
      const valid = !isNaN(start.getTime());
      const minutes = valid ? (now - start.getTime()) / 60000 : 0;
      const duration = this.durationFor(attrs.deportes);
      const featured = attrs.destacado === true && (!valid || minutes <= duration);

      let state = 'next';
      if (valid && minutes >= -CONFIG.liveEarlyMinutes && minutes <= duration) state = 'live';
      else if (valid && minutes > duration) state = 'ended';

      const eventId = String(event.id);
      const submenuId = 'agenda-sub-' + eventId;
      const toggleId = 'agenda-tg-' + eventId;

      const time = Util.el('time', {
        class: 'agenda-time',
        datetime: valid ? start.toISOString() : '',
        text: Util.formatTime(start, CONFIG.displayTimezone)
      });

      const flag = Util.el('img', {
        class: 'agenda-flag',
        alt: '',
        width: '24',
        height: '24',
        loading: 'lazy',
        decoding: 'async',
        'data-img': this.flagPath(attrs)
      });

      const info = Util.el('span', { class: 'agenda-info' }, [
        time,
        flag,
        featured ? Util.el('span', {
          class: 'agenda-star',
          title: 'Destacado',
          'aria-label': 'Partido destacado'
        }, '★') : null,
        Util.el('span', {
          class: 'agenda-title',
          text: Util.decodeEntities(attrs.diary_description || '').trim()
        })
      ]);

      const tagLabel = state === 'live' ? 'En vivo' : state === 'ended' ? 'Finalizado' : 'Próximo';
      const tag = Util.el('span', { class: 'tag tag--' + state, text: tagLabel });

      const chevron = Util.svg('0 0 24 24', 'm6 9 6 6 6-6', {
        width: '16', height: '16', class: 'agenda-chevron'
      });

      const toggle = Util.el('button', {
        type: 'button',
        class: 'agenda-toggle',
        id: toggleId,
        'aria-expanded': 'false',
        'aria-controls': submenuId
      }, Util.el('span', { class: 'agenda-row' }, [info, tag, chevron]));

      const embeds = this.embedList(attrs);
      const submenu = Util.el('ul', {
        class: 'agenda-submenu',
        id: submenuId,
        'aria-labelledby': toggleId
      });

      if (embeds.length) {
        embeds.forEach(function (embed) {
          submenu.appendChild(Util.el('li', {}, Util.el('a', {
            class: 'submenu-item',
            href: embed.href
          }, [
            Util.el('span', { class: 'submenu-dot', 'aria-hidden': 'true' }),
            Util.el('span', { text: embed.name }),
            embed.language ? Util.el('small', { class: 'submenu-lang', text: embed.language }) : null
          ])));
        });
      } else {
        submenu.appendChild(
          Util.el('li', { class: 'agenda-msg', text: 'Sin señales disponibles todavía.' })
        );
      }

      const classes = ['agenda-item'];
      if (state === 'live') classes.push('is-live');
      if (state === 'ended') classes.push('is-ended');
      if (featured) classes.push('is-featured');

      const node = Util.el('li', {
        class: classes.join(' '),
        'data-sport': String(attrs.deportes || '').toLowerCase()
      }, [
        Util.el('h3', { class: 'agenda-item__heading' }, toggle),
        submenu
      ]);

      return {
        node: node,
        eventId: eventId,
        state: state,
        featured: featured,
        embeds: embeds,
        sortKey: (attrs.date_diary || '') + ' ' + (attrs.diary_hour || ''),
        country: this.countryName(attrs)
      };
    },

    durationFor(sport) {
      const key = String(sport || '').toLowerCase();
      return Object.prototype.hasOwnProperty.call(CONFIG.durations, key)
        ? CONFIG.durations[key]
        : CONFIG.liveMinutes;
    },

    countryName(attrs) {
      const data = attrs.country && attrs.country.data;
      const node = data && data.attributes;
      return (node && node.name) || '';
    },

    flagPath(attrs) {
      const data = attrs.country && attrs.country.data;
      const node = data && data.attributes;
      const image = node && node.image && node.image.data;
      const imageAttrs = image && image.attributes;
      if (!imageAttrs) return '';
      return imageAttrs.url || (imageAttrs.formats && imageAttrs.formats.thumbnail && imageAttrs.formats.thumbnail.url) || '';
    },

    embedList(attrs) {
      const data = attrs.embeds && attrs.embeds.data;
      if (!Array.isArray(data)) return [];
      return data
        .filter(function (embed) { return embed && embed.attributes && embed.attributes.embed_iframe; })
        .map(function (embed) {
          const a = embed.attributes;
          return {
            name: Util.decodeEntities(a.embed_name || 'Señal').trim(),
            language: a.idioma || '',
            href: Util.resolveEmbed(a.embed_iframe)
          };
        })
        .filter(function (embed) { return embed.href; });
    },

    hydrateImages(scope) {
      Util.$$('img[data-img]', scope || this.list).forEach(function (image) {
        image.addEventListener('error', function handler() {
          image.removeEventListener('error', handler);
          image.removeAttribute('data-img');
          image.src = CONFIG.imgFallback;
        });
        image.src = Util.assetUrl(image.getAttribute('data-img'));
        image.removeAttribute('data-img');
      });
    },

    filter() {
      const query = Util.normalize(this.search ? this.search.value : '');
      const words = query.split(/\s+/).filter(Boolean);
      let shown = 0;

      Util.$$('.agenda-item', this.list).forEach(function (item) {
        const haystack = Util.normalize(item.textContent + ' ' + (item.getAttribute('data-sport') || ''));
        const match = words.every(function (word) { return haystack.indexOf(word) !== -1; });
        item.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });

      const existing = this.list.querySelector('.agenda-empty');
      const total = this.list.querySelectorAll('.agenda-item').length;
      if (words.length && !shown && total) {
        let empty = existing;
        if (!empty) {
          empty = Util.el('li', { class: 'agenda-msg agenda-empty' });
          this.list.appendChild(empty);
        }
        empty.textContent = 'No hay eventos que coincidan con "' + (this.search.value || '').trim() + '".';
        this.announce('Sin resultados para la búsqueda.');
      } else if (existing) {
        existing.remove();
        this.announce(shown + (shown === 1 ? ' partido visible.' : ' partidos visibles.'));
      }
    },

    onClick(event) {
      if (event.target.closest('.submenu-item')) return;
      const toggle = event.target.closest('.agenda-toggle');
      if (!toggle) return;
      const item = toggle.closest('.agenda-item');
      const submenu = item ? item.querySelector('.agenda-submenu') : null;
      if (!submenu) return;

      const self = this;
      Util.$$('.agenda-submenu.is-open', this.list).forEach(function (open) {
        if (open !== submenu) self.closeSubmenu(open);
      });

      if (submenu.classList.contains('is-open')) {
        this.closeSubmenu(submenu);
        this.flushPending();
      } else {
        this.openSubmenu(submenu);
      }
    },

    onKeydown(event) {
      const toggle = event.target.closest('.agenda-toggle');
      if (!toggle) return;
      const items = Util.$$('.agenda-toggle', this.list);
      const index = items.indexOf(toggle);

      if (event.key === 'ArrowDown' && index > -1) {
        event.preventDefault();
        (items[index + 1] || items[0]).focus();
      } else if (event.key === 'ArrowUp' && index > -1) {
        event.preventDefault();
        (items[index - 1] || items[items.length - 1]).focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        (items[0] || toggle).focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        (items[items.length - 1] || toggle).focus();
      } else if (event.key === 'Escape') {
        const submenu = toggle.closest('.agenda-item').querySelector('.agenda-submenu');
        if (submenu && submenu.classList.contains('is-open')) {
          event.preventDefault();
          this.closeSubmenu(submenu);
          this.flushPending();
          toggle.focus();
        }
      }
    },

    openSubmenu(submenu) {
      const item = submenu.closest('.agenda-item');
      const toggle = item ? item.querySelector('.agenda-toggle') : null;
      submenu.style.height = '0px';
      submenu.classList.add('is-open');
      if (item) item.classList.add('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      submenu.style.height = submenu.scrollHeight + 'px';
      submenu.addEventListener('transitionend', function done(event) {
        if (event.propertyName !== 'height') return;
        submenu.style.height = 'auto';
        submenu.removeEventListener('transitionend', done);
      });
    },

    closeSubmenu(submenu) {
      const item = submenu.closest('.agenda-item');
      const toggle = item ? item.querySelector('.agenda-toggle') : null;
      submenu.style.height = submenu.scrollHeight + 'px';
      void submenu.offsetHeight;
      submenu.style.height = '0px';
      submenu.classList.remove('is-open');
      if (item) item.classList.remove('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    },

    flushPending() {
      if (!this.pending) return;
      const rows = this.pending;
      this.pending = null;
      this.paint(rows);
    }
  };

  const CHANNEL_CONTENT = {
    'directv-sports': {
      seoTitle: 'Fútbol Libre TV - DSports en vivo con señales en HD',
      seoDescription: 'Mira DSports en vivo: Liga 1, Libertadores y fútbol sudamericano desde el celular o el Smart TV. Señales en HD, gratis y sin registro.',
      intro: 'DSports es la casa del fútbol peruano en televisión por cable: por aquí pasan los partidos de la Liga 1 y buena parte de la Copa Libertadores y la Copa Sudamericana. En Fútbol Libre TV sigues su señal en directo desde el navegador, sin instalar nada.',
      highlights: ['Liga 1 y Liga 2 del Perú', 'Copa Libertadores y Copa Sudamericana', 'Eliminatorias de la selección peruana', 'Fútbol argentino y partidos de reserva'],
      extra: 'Cuando un club reparte su partido entre plataformas distintas, la señal del canal te deja seguirlo desde un mismo lugar y con el mismo horario de Perú.'
    },
    'directv-sports-2': {
      seoTitle: 'Fútbol Libre TV - DSports 2 en vivo con señales en HD',
      seoDescription: 'Mira DSports 2 en vivo con señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'DSports 2 es la segunda señal del canal: entra ahí el partido que se superpone con el principal, los torneos de reserva y varios eventos del calendario. Es la opción habitual cuando dois partidos importantes coinciden en la misma jornada.',
      highlights: ['Partidos simultáneos del canal principal', 'Torneos de reserva y categorías inferiores', 'Previas y análisis posteriores', 'Competencias sudamericanas'],
      extra: 'Tenla a mano: casi todos los fines de semana con dos partidos de fondo se reparten entre DSports y DSports 2.'
    },
    'directv-sports-plus': {
      seoTitle: 'Fútbol Libre TV - DSports+ en vivo con señales en HD',
      seoDescription: 'Mira DSports+ en vivo: señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'DSports+ amplía la parrilla del grupo con ficción, entretenimiento y algunos contenidos en exclusiva. Su horario cambia cada semana, así que conviene revisarlo a diario para saber qué se emite hoy.',
      highlights: ['Contenido en exclusiva del grupo', 'Ficción y entretenimiento deportivo', 'Eventos especiales de fin de semana', 'Programas de debate y resumen'],
      extra: 'Si buscas la señal del partido del día, esta es la segunda opción cuando la señal principal no responde.'
    },
    'espn-1': {
      seoTitle: 'Fútbol Libre TV - ESPN en vivo con señales en HD',
      seoDescription: 'Mira ESPN en vivo: Premier League, Champions y Conmebol desde el celular o la Smart TV. Gratis, sin registro y con varias señales.',
      intro: 'ESPN es uno de los canales deportivos más vistos de Latinoamérica y en Fútbol Libre TV sigues su señal en directo desde el celular, la computadora o el Smart TV. Mucha gente llega buscando fútbol en vivo hoy con relato en español, y ESPN suele tener el partido grande de la jornada.',
      highlights: ['Premier League y copas de Inglaterra', 'UEFA Champions League y otras competencias europeas', 'Conmebol: Copa Libertadores y Sudamericana', 'Tenis de Grand Slam, NBA y Fórmula 1'],
      extra: 'Entre partido y partido pasan programas como SportsCenter, útiles para ver resúmenes y goles si llegaste tarde. Ten presente que ESPN tiene versiones distintas para el norte y el sur de Latinoamérica: un partido anunciado para otro país puede llegar aquí por otra señal del mismo grupo.'
    },
    'espn-2': {
      seoTitle: 'Fútbol Libre TV - ESPN 2 en vivo con señales en HD',
      seoDescription: 'Mira ESPN 2 en vivo con señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'ESPN 2 cubre lo que no cabe en la pantalla principal: el segundo partido de la jornada, los torneos secundarios y buena parte del fútbol europeo. Si en la agenda ves dos señales de ESPN el mismo día, una de ellas es esta.',
      highlights: ['Segundo partido de la jornada', 'Ligas de Europa y torneos secundarios', 'Fútbol femenino y categorías menores', 'Básquetbol, hockey y deportes de motor'],
      extra: 'Cuando ESPN tiene dos encuentros a la vez, el segundo normalmente se va a ESPN 2: conviene tener la página a mano.'
    },
    'espn-3': {
      seoTitle: 'Fútbol Libre TV - ESPN 3 en vivo con señales en HD',
      seoDescription: 'Mira ESPN 3 en vivo con señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'ESPN 3 es la tercera señal del canal: aparece en jornadas con tres señales abiertas o cuando se rotan los eventos de menor audiencia. Suele ser la más tranquila para ver un partido completo sin interrupciones.',
      highlights: ['Tercera señal disponible del canal', 'Eventos con menor audiencia', 'Fútbol de banquillo y categorías menores', 'Complemento de ESPN y ESPN 2'],
      extra: 'Si el partido que buscas no está en la agenda principal, revisa esta señal antes de probar con otro canal.'
    },
    'fox-sports-1': {
      seoTitle: 'Fútbol Libre TV - Fox Sports en vivo con señales en HD',
      seoDescription: 'Mira Fox Sports en vivo: MLS, Liga MX y fútbol americano desde el celular o el Smart TV. Señales en HD, gratis y sin registro.',
      intro: 'Fox Sports es la casa del fútbol americano en Latinoamérica y también trae soccer de MLS, Liga MX y distintas copas europeas. Su señal se sigue igual de fácil: abres la página y el reproductor carga solo.',
      highlights: ['NFL y fútbol americano', 'Major League Soccer (MLS)', 'Liga MX y copas de Inglaterra', 'Automovilismo y deportes de motor'],
      extra: 'Los partidos de fútbol americano duran bastante más que un partido de fútbol, por eso el reproductor mantiene el botón de recarga a mano por si la señal se corta.'
    },
    'fox-sports-2': {
      seoTitle: 'Fútbol Libre TV - Fox Sports 2 en vivo con señales en HD',
      seoDescription: 'Mira Fox Sports 2 en vivo con señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'Fox Sports 2 es la segunda señal de la casa: recoge los eventos que se superponen con el canal principal y varias ligas de fútbol del continente. Es muy útil en fines de semana con dos partidos a la vez.',
      highlights: ['Segundo partido de la jornada', 'MLS y otras ligas de fútbol', 'Competencias de fútbol internacional', 'Previas y programas de análisis'],
      extra: 'Al igual que con ESPN, cuando dos señales del mismo grupo están activas, la segunda casi siempre está aquí.'
    },
    'fox-sports-3': {
      seoTitle: 'Fútbol Libre TV - Fox Sports 3 en vivo con señales en HD',
      seoDescription: 'Mira Fox Sports 3 en vivo con señales en HD desde el celular, la computadora o el Smart TV. Gratis, sin registro y con recarga inmediata.',
      intro: 'Fox Sports 3 es la tercera señal disponible: aparece en jornadas con varios eventos simultáneos o con rotaciones del calendario. Suele ser la alternativa más estable cuando el resto está ocupado.',
      highlights: ['Tercera señal disponible del canal', 'Eventos simultáneos de la jornada', 'Fútbol de banquillo y categorías menores', 'Complemento de Fox Sports y Fox Sports 2'],
      extra: 'Es una buena opción de respaldo: menos concurrencia y, por lo general, una imagen más fluida.'
    }
  };

  const Channels = {
    init() {
      const slug = this.currentSlug();
      const channel = CONFIG.channels[slug];
      const content = CHANNEL_CONTENT[slug];

      if (CONFIG.prettyUrls) this.prettyLinks();

      if (!channel) {
        location.replace('404.html');
        return;
      }

      const channelPath = CONFIG.prettyUrls
        ? '/en-vivo/' + slug + '/'
        : '/' + CONFIG.channelPage + '?envivo=' + slug;

      Seo.apply({
        title: content ? content.seoTitle : channel.name + ' en vivo | Fútbol Libre TV',
        description: content ? content.seoDescription : 'Sigue ' + channel.name + ' en vivo, gratis y sin registro.',
        canonical: channelPath,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: content ? content.seoTitle : channel.name + ' en vivo',
            url: new URL(channelPath, location.origin).href,
            inLanguage: 'es-PE',
            isPartOf: { '@type': 'WebSite', name: 'Fútbol Libre TV', url: location.origin + '/' }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: location.origin + '/' },
              {
                '@type': 'ListItem', position: 2, name: channel.name + ' en vivo',
                item: new URL(channelPath, location.origin).href
              }
            ]
          }
        ]
      });

      const frame = Util.$('#embedIframe');
      if (frame) {
        frame.setAttribute('title', channel.name + ' en vivo');
        frame.setAttribute('data-src', CONFIG.reproductorBase + channel.stream);
      }

      const breadcrumb = Util.$('#breadcrumb-current');
      if (breadcrumb) breadcrumb.textContent = channel.name + ' en vivo';

      const heading = Util.$('#channel-title');
      if (heading) heading.textContent = channel.name + ' en vivo';

      const body = Util.$('#channel-body');
      if (body && content) {
        const blocks = [
          Util.el('p', { text: content.intro }),
          Util.el('h2', { text: 'Qué ves en ' + channel.name }),
          Util.el('ul', {}, content.highlights.map(function (item) {
            return Util.el('li', { text: item });
          })),
          Util.el('p', { text: content.extra }),
          Util.el('h2', { text: 'Cómo verlo aquí' }),
          Util.el('p', {}, [
            Util.el('strong', { text: 'Abre esta página y el reproductor carga la señal sola.' }),
            document.createTextNode(' Si se queda en negro o se congela, recarga o cambia a otra de las opciones que aparecen en la agenda. No hace falta instalar nada ni crear una cuenta: funciona igual en el navegador del móvil que en la computadora.')
          ]),
          Util.el('h2', { text: 'Antes del partido' }),
          Util.el('p', {}, [
            document.createTextNode('Si quieres saber a qué hora juega tu equipo y qué canal lo transmite, revisa la '),
            Util.el('a', { href: '/', text: 'agenda de partidos del día' }),
            document.createTextNode(': los horarios se muestran en hora de Perú. Cuando dos señales del mismo grupo están activas, la segunda casi siempre va a la página siguiente del canal, así que conviene tenerla a mano.')
          ])
        ];
        body.replaceChildren.apply(body, blocks);
      }

      Util.$$('a[href*="canal="], a[href*="/en-vivo/"]').forEach(function (link) {
        const href = link.getAttribute('href') || '';
        if (href.indexOf(slug) !== -1) {
          link.setAttribute('aria-current', 'page');
        } else if (link.getAttribute('aria-current') === 'page') {
          link.removeAttribute('aria-current');
        }
      });
    },

    currentSlug() {
      const query = new URLSearchParams(window.location.search).get('envivo');
      if (query) return query.toLowerCase();
      const match = window.location.pathname.match(/\/en-vivo\/([^/]+)\/?/);
      return match ? match[1].toLowerCase() : '';
    },

    prettyLinks() {
      Util.$$('a[href^="canal.html?canal="]').forEach(function (link) {
        const params = new URLSearchParams((link.getAttribute('href').split('?')[1] || ''));
        const slug = params.get('canal');
        if (slug) link.setAttribute('href', '/en-vivo/' + slug + '/');
      });
    }
  };

  function boot() {
    Seo.setCanonical(window.location.pathname + window.location.search);
    Seo.absolutizeImages();

    if (Util.$('#embedIframe') && !Util.$('#channel-title')) {
      Seo.setCanonical(CONFIG.playerPage);
    }

    Menu.init();

    if (Util.$('#channel-title')) Channels.init();

    Player.init();
    Agenda.init();

    const year = Util.$('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();