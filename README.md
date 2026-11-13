# Futbol Libre TV

Sitio estatico (HTML + CSS + JavaScript, sin build y sin backend) con agenda
deportiva en vivo, directorio de canales y reproductor. Los datos salen del
**mismo origen que usa `futbollibreya.pe`**: `https://agenda18.com/agenda.json`
y `https://img.agenda18.com`.

| Pagina | Archivo |
| --- | --- |
| Portada | `index.html` |
| Agenda por dias | `agenda.html` |
| Directorio de canales | `channels.html` |
| Detalle de partido | `match.html?e=<slug>` |
| Detalle de canal | `channel.html?c=<slug>` |

---

## Publicar en GitHub Pages

1. Crea el repositorio (puede ser privado con el plan gratuito de GitHub Pages
   para repositorios de organizaciones, o publico para cuentas personales).
2. Sube **todos los archivos de esta carpeta** a la rama `main` (o `gh-pages`).
3. En el repositorio: **Settings → Pages → Source: Deploy from a branch** →
   rama `main` / carpeta `/ (root)`.
4. Tu sitio queda en `https://<usuario>.github.io/<repositorio>/`.
5. Edita `assets/config.js` → `sitioUrl` con esa URL y actualiza el dominio en
   `sitemap.xml` y `robots.txt` (buscar y reemplazar
   `https://usuario.github.io/webfu` por tu URL):

   ```
   assets/config.js   sitioUrl: "https://usuario.github.io/webfu"
   sitemap.xml        <loc>https://usuario.github.io/webfu/...</loc>
   robots.txt         Sitemap: https://usuario.github.io/webfu/sitemap.xml
   ```

   Los tres archivos deben apuntar al mismo dominio.

6. En Google Search Console → *Sitemaps* → `https://<usuario>.github.io/<repo>/sitemap.xml`.

El archivo `.nojekyll` (vacio) evita que GitHub procese el sitio con Jekyll y
sirva los archivos tal cual.

> **Rutas limpias en GitHub Pages:** GitHub no admite reglas de reescritura, asi
> que las URLs reales son `agenda.html`, `match.html?e=...` y `channel.html?c=...`.
> El `404.html` detecta las rutas limpias (`/agenda`, `/match/<slug>`,
> `/channel/<slug>`) y las redirige a su pagina real, de modo que ningun enlace
> se rompe.

---

## Probar en local

El sitio es estatico: sirve con cualquier servidor de archivos. Sin instalar
nada:

| Opcion | Como |
| --- | --- |
| **Doble clic** | Abre `index.html` directamente. Funciona completo: la agenda se carga por HTTPS y todas las paginas renderizan. |
| **Live Server (VS Code)** | Clic derecho sobre `index.html` → *Open with Live Server*. Recarga sin cache y URLs limpias. |
| **Node** | `npx serve .` |

Si ya tienes Python instalado: `py -m http.server 8123`.

> En Firefox y Safari el origen de un archivo local es `null`, por eso el
> canonical y la imagen OG usan `sitioUrl` de `assets/config.js` como respaldo
> cuando no hay servidor.

---

## Funciones

- **Agenda por dias** con pestanas por fecha, buscador por equipo/torneo/canal y
  desplegable de senales en cada evento.
- **Zona horaria del visitante**: la agenda18 publica en hora de Lima (`-05:00`);
  la web convierte cada evento a la hora local del dispositivo y agrupa por dia local.
- **Actualizacion automatica** cada 60 s (y al volver a la pestaña), sin perder los
  eventos que el usuario dejo abiertos. El indicador de la cabecera indica de
  cuanto es la ultima lectura.
- **Pagina de partido** con reproductor embebido, selector de senal, cuenta
  regresiva y estado (programado / en vivo / finalizado). Al empezar el evento la
  cuenta atras se sustituye por un temporizador "en vivo" con el tiempo ya
  transcurrido.
- **Pantalla completa**: doble clic sobre el video (lo gestiona el reproductor del
  proveedor) o sobre las zonas libres del marco, que pone el reproductor a
  pantalla completa.
- **Canales que se reproducen aunque no tengan eventos**: cada canal tiene
  pagina con reproductor; si no hay eventos se usa la senal directa del canal.
- **Directorio de canales** con buscador, contador de senales y distintivo
  "ver en vivo".
- **Cache local** (`localStorage`) para que un partido siga disponible aunque ya
  no este en el catalogo del dia.
- **SEO**: canonical, Open Graph, Twitter Card, datos estructurados
  (`SportsEvent`, `FAQPage`, `Organization`, `WebSite`, `BreadcrumbList`),
  `robots.txt`, `sitemap.xml` con las paginas fijas y de canal, y `404.html`
  con redireccion inteligente. Las paginas de partido que ya no estan en el
  catalogo responden `noindex` para no indexar paginas vacias.
- **Accesibilidad y responsive**: navegacion por teclado, `skip-link`, foco
  visible, modo oscuro automatico, `prefers-reduced-motion` y diseno adaptado a
  movil, tablet y escritorio.

---

## Estructura

```
webfu/
├── index.html              Portada
├── agenda.html             Agenda completa por dias
├── channels.html           Directorio de canales
├── match.html              Detalle de partido   (?e=<slug>)
├── channel.html            Detalle de canal     (?c=<slug>)
├── 404.html                Error 404 + redireccion de rutas limpias
├── assets/
│   ├── config.js           Configuracion (URLs, zona horaria, catalogo de canales)
│   ├── core.js             Datos: descarga, normalizacion, utilidades, auto-refresco
│   ├── ui.js               SEO en ejecucion, indicador, volver arriba, menu activo
│   ├── styles.css          Estilos (paleta verde + modo oscuro)
│   ├── home.js  agenda.js  channels.js  match.js  channel.js
│   └── img/                favicon, iconos, imagen para redes sociales
├── site.webmanifest        Manifiesto PWA
├── robots.txt              Permitir rastreo + referencia al sitemap
├── sitemap.xml             Mapa del sitio (paginas fijas y de canal)
└── .nojekyll               GitHub Pages sirve los archivos tal cual
```

> El proyecto no usa build ni herramientas de linea de comandos: todo se
> edita a mano y se sube tal cual a GitHub Pages.

---

## Configuracion (`assets/config.js`)

```js
window.SITIO = {
  sitioUrl: "https://usuario.github.io/webfu",   // <-- pon tu URL aqui
  agendaUrl: "https://agenda18.com/agenda.json", // fuente de eventos
  imgHost: "https://img.agenda18.com",            // escudos y logos
  agendaTimezone: "-05:00",                       // zona horaria del catalogo
  refreshMs: 60000,                               // auto-refresco
  liveMinutes: 180,                               // duracion estimada de un evento
  reproductor: "https://la18hd.su/vivo/canal.php?stream=",  // señal directa de canal
  ogImage: "assets/img/og-image.png",             // imagen para redes sociales
  canales: [ { nombre: "ESPN", logo: "...", stream: "espn" }, ... ]
};
```

El catalogo de canales es una base: los canales que aparecen en la agenda
(Disney+, ESPN, FOX Sports…) se anaden solos y se cuentan sus senales. El campo
`stream` es la clave de la **senal directa** que se usa cuando ese canal no
tiene eventos programados.

---

## Detalles tecnicos

### Como se extraen los eventos

`agenda.json` devuelve `data[].attributes` con:

| Campo | Uso |
| --- | --- |
| `diary_description` | `"Competicion: Equipo A vs Equipo B"` → se separa la competicion |
| `date_diary` + `diary_hour` | Fecha y hora en hora de Lima → se convierte a UTC |
| `embeds.data[].embed_name` | Nombre del canal / senal |
| `embeds.data[].embed_iframe` | `/embed/eventos.html?r=<base64>` |
| `embeds.data[].idioma` | Idioma de la senal |
| `country.data.attributes.image` | Escudo (torneo o pais) |
| `destacado` | Evento destacado |

El instante se calcula como `Date.UTC(...) - offset` y a partir de ahi se muestra
con `toLocaleTimeString`, de modo que cada visitante ve su hora.

### Reproductor

La agenda18 entrega rutas relativas (`/embed/eventos.html?r=...`) pensadas para el
sitio que consume el JSON. Aqui se decodifica ese base64 y la senal se carga
**directamente** en el iframe del reproductor, igual que hace el sitio de
referencia:

```
/embed/eventos.html?r=aHR0cHM6Ly9sYTE4aGQuc3Uvdml2by9jYW5hbC5waHA/c3RyZWFtPWRpc25leTI=
  -> https://la18hd.su/vivo/canal.php?stream=disney2
```

El iframe va con `allow="autoplay; fullscreen; ..."`, `allowfullscreen` y
`playsinline`, que es lo que permite al reproductor del proveedor (Clappr)
poner el video en pantalla completa con doble clic, sin ningun boton extra
fuera del marco. El marco tiene ademas `aspect-ratio: 16/9` y el doble clic
sobre las zonas libres alterna la pantalla completa del reproductor.

### Reproduccion de un canal

La pagina de canal (`channel.html?c=espn`) resuelve la senal en este orden:

1. **Evento**: la primera senal que la agenda publica para ese canal hoy.
2. **Directa**: la clave `stream` del catalogo contra `reproductor`, que tambien
   pasa por el reproductor embebible.
3. Si no hay ninguna, el reproductor se oculta y se avisa de que no hay senal.

### Señales sin avisos anti-bloqueadores

Algunos proveedores incrustan un aviso emergente ("no uses AdBlock") dentro de su
reproductor. Como el aviso se genera en la pagina del proveedor, no se puede
quitar desde nuestro HTML: la solucion es **no cargar esa pagina**.

En `assets/config.js` se declara que proveedores tienen ese aviso y cual es la
señal equivalente en `la18hd.su`:

```js
proveedorAviso: ["golperutv.xyz"],
alternativas: {
  "Win Sports + | opc3": "winplus",
  "ESPN2 Movil": "espn2",
  ...
}
```

Cuando una senal viene de uno de esos proveedores, `FL.signalLimpia()` la
sustituye por la equivalente de `la18hd.su` (mismo canal, mismo reproductor
Clappr, sin avisos).

### URL de partido

`match.html?e=italia-vs-francia-2026-11-12-da336902`

* equipo 1 + `vs` + equipo 2 + fecha + hash de 8 caracteres (FNV-1a sobre
  fecha + hora + competicion + titulo).
* El hash **no usa el id** del evento: agenda18 republica la jornada con ids
  nuevos y ese id no debe cambiar la URL. Ademas la pagina busca por prefijo
  (`equipos + fecha`), asi que un enlace antiguo sigue funcionando aunque
  cambie el hash o el evento se republique.
* La agenda18 solo publica el dia en curso: un partido de otro dia solo se
  encuentra si sigue en la cache local del navegador.

### SEO

- `canonical` y `og:url` absolutos calculados en tiempo de ejecucion, de modo
  que funcionan en cualquier dominio sin tocar el codigo.
- Datos estructurados en JSON-LD: `Organization`, `WebSite` (con `SearchAction`),
  `FAQPage`, `BreadcrumbList`, `CollectionPage` y `SportsEvent` (este ultimo se
  inyecta con el partido real).
- `sitemap.xml` y `robots.txt` se actualizan a mano: el sitemap contiene las
  paginas fijas y las de canal (URLs estables, derivadas del catalogo de
  `config.js`); las paginas de partido cambian cada jornada, asi que Google las
  descubre enlazando desde la agenda y no se listan en el sitemap.
- Contenido en `es`, `lang` correcto, jerarquia de encabezados y `alt` en las
  imagenes.
- Texto optimizado para las busquedas mas demandadas del sector, repartido de
  forma natural entre titulos, encabezados, textos y preguntas frecuentes:

  | Keyword | Donde aparece |
  | --- | --- |
  | ver futbol en vivo gratis | portada, agenda, canales, partido, 404 |
  | partidos de hoy en vivo gratis | portada, agenda, canales, partido, 404 |
  | futbol libre / tv / online / en vivo / hoy / hd | portada y resto de paginas |
  | pelota libre, pelota libre tv, libre futbol | portada (FAQ y pie de pagina) |
  | copa libertadores, copa sudamericana, champions league | portada, agenda, canales |
  | ver espn en vivo gratis, tyc sports en vivo | portada, agenda, canales, partido |
  | tarjeta roja, roja directa | portada (bloque de sanciones) y FAQ |
  | pirlo tv | portada (FAQ comparativa) |

### Mantenimiento

Todo el mantenimiento se hace editando archivos, sin scripts:

| Que | Como |
| --- | --- |
| Cambiar el dominio publicado | Sustituir `https://usuario.github.io/webfu` en `assets/config.js`, `sitemap.xml` y `robots.txt` |
| Anadir un canal al directorio | Editar el array `canales` de `assets/config.js` y anadir su `channel.html?c=<slug>` al `sitemap.xml` |
| Cambiar textos o diseno | Editar el `.html` o `assets/styles.css` y subir |
| Cambiar los iconos o la imagen OG | Editar los PNG de `assets/img/` (1200×630 para la imagen OG) |
| Revisar que el HTML este bien | Abrir cada pagina y comprobar el title, la meta description y que el JSON-LD sea valido |

> Los archivos `.html` se guardan en UTF-8. Si los editas con PowerShell, usa
> `Set-Content -Encoding UTF8` y revisa que los acentos y la elipsis se vean
> bien: si aparece elipsis como tres caracteres sueltos, el archivo se ha
> guardado con la codificacion equivocada.

### Limites conocidos

* `agenda.json` solo trae la jornada en curso: no hay historico ni dias futuros.
* Los horarios de `liveMinutes` son estimaciones por deporte (180 min por defecto).
* Las senales las sirven terceros y pueden no funcionar en todos los paises.
