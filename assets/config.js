/* =========================================================
   Futbol Libre — configuracion del sitio
   Cambia estos valores para adaptar el clon a tu marca.
   ========================================================= */
window.SITIO = {
  /* URL publica del sitio (GitHub Pages). Usala en dos sitios:
       1. aqui, como respaldo cuando la pagina se abre con file://
          (double clic en el HTML), donde location.origin es "null";
       2. en sitemap.xml y robots.txt, sustituyendo el dominio de ejemplo
          por el tuyo (buscar y reemplazar).
     Formato: https://usuario.github.io/repo */
  sitioUrl: "https://usuario.github.io/webfu",

  /* Fuente de datos: mismo origen que usa futbollibreya.pe */
  agendaUrl: "https://agenda18.com/agenda.json",
  imgHost: "https://img.agenda18.com",

  /* La agenda18 publica los horarios en hora de Lima (UTC-5) */
  agendaTimezone: "-05:00",

  /* Imagen para redes sociales (Open Graph / Twitter) */
  ogImage: "assets/img/og-image.png",

  /* Auto-refresco de los eventos (ms) */
  refreshMs: 60000,

  /* Duracion estimada de un evento por deporte (minutos) */
  liveMinutes: 180,

  /* Señal directa de canal (se usa cuando el canal no tiene eventos) */
  reproductor: "https://la18hd.su/vivo/canal.php?stream=",

  /*
    Proveedores cuyo reproductor incrusta un aviso anti-bloqueadores.
    Cuando una señal viene de uno de ellos se sustituye por la equivalente
    de la18hd.su, que reproduce el mismo canal sin mostrar ese aviso.
  */
  proveedorAviso: ["golperutv.xyz"],

  /* Señal equivalente (clave de la18hd.su) para esos canales */
  alternativas: {
    "Win Sports + | opc3": "winplus",
    "Win Sports + | opc2": "winplus",
    "ESPN Movil": "espn",
    "ESPN2 Movil": "espn2",
    "ESPN3 Movil": "espn3",
    "ESPN MX": "espn",
    "TNT Sports Movil": "tntsports",
    "Fox Soccer Plus": "foxsports3"
  },

  /* Catalogo base de canales. El que exista en la agenda se cuenta solo.
     "stream" es la clave de la señal directa del canal. */
  canales: [
    { nombre: "DSports", logo: "https://img.agenda18.com/uploads/dsports_bea74cb844.webp", stream: "dsports" },
    { nombre: "DSports 2", logo: "https://img.agenda18.com/uploads/dsports_2_3481b3d20c.webp", stream: "dsports2" },
    { nombre: "DSports+", logo: "https://img.agenda18.com/uploads/dsports_plus_e24f78b7c0.webp", stream: "dsportsplus" },
    { nombre: "ESPN", logo: "https://img.agenda18.com/uploads/espn_16110aaa3a.webp", stream: "espn" },
    { nombre: "ESPN2", logo: "https://img.agenda18.com/uploads/espn_2_82441267e9.webp", stream: "espn2" },
    { nombre: "ESPN3", logo: "https://img.agenda18.com/uploads/espn_3_0f4a5444d4.webp", stream: "espn3" },
    { nombre: "ESPN Premium", stream: "espnpremium" },
    { nombre: "ESPN Movil", stream: "espn" },
    { nombre: "ESPN2 Movil", stream: "espn2" },
    { nombre: "ESPN3 Movil", stream: "espn3" },
    { nombre: "ESPN MX", stream: "espn" },
    { nombre: "Fox Sports", logo: "https://img.agenda18.com/uploads/fox_sports_1_7dbc294272.webp", stream: "foxsports" },
    { nombre: "Fox Sports 2", logo: "https://img.agenda18.com/uploads/fox_sports_2_64ae4cc2b7.webp", stream: "foxsports2" },
    { nombre: "Fox Sports 3", logo: "https://img.agenda18.com/uploads/fox_sports_3_3c801c9d4c.webp", stream: "foxsports3" },
    { nombre: "Fox Sports Premium", stream: "foxsportspremium" },
    { nombre: "Fox Soccer Plus", stream: "foxsports3" },
    { nombre: "Disney+", stream: "disney" },
    { nombre: "Disney+ 2", stream: "disney2" },
    { nombre: "TNT Sports", stream: "tntsports" },
    { nombre: "TNT Sports 2", stream: "tntsports2" },
    { nombre: "TNT Sports Premium", stream: "tntsportspremium" },
    { nombre: "TNT Sports Chile" },
    { nombre: "TNT Sports Movil", stream: "tntsports" },
    { nombre: "Win Sports", stream: "winsports" },
    { nombre: "Win Sports+", stream: "winplus" },
    { nombre: "Win Sports plus (2)" },
    { nombre: "Win Sports+ 2" },
    { nombre: "Win Sports + | opc2", stream: "winplus" },
    { nombre: "Win Sports + | opc3", stream: "winplus" },
    { nombre: "Premiere" },
    { nombre: "Premiere 2" },
    { nombre: "Premiere 3" },
    { nombre: "Premiere 4" },
    { nombre: "Premiere 5" },
    { nombre: "GolPeru", stream: "golperu" },
    { nombre: "GolTV" },
    { nombre: "GOLPERU" },
    { nombre: "GOLTV" },
    { nombre: "TVC Deportes" },
    { nombre: "VTV" },
    { nombre: "VTV Plus" },
    { nombre: "Movistar Deportes" },
    { nombre: "Movistar Plus" },
    { nombre: "La 1 TVE" },
    { nombre: "LaLigaTV" },
    { nombre: "LaLigaTV BAR" },
    { nombre: "M+ LaLiga TV" },
    { nombre: "CDF" },
    { nombre: "Azteca 7" },
    { nombre: "Azteca Deportes" },
    { nombre: "TUDN" },
    { nombre: "TUDN MX" },
    { nombre: "Univision" },
    { nombre: "Universo" },
    { nombre: "Telemundo" },
    { nombre: "TyC Sports" },
    { nombre: "TyC Sports Internacional" },
    { nombre: "El Trece" },
    { nombre: "América TV" },
    { nombre: "Canal 9" },
    { nombre: "Canal 13" },
    { nombre: "TV Pública" },
    { nombre: "Telefe" },
    { nombre: "Canal 5" },
    { nombre: "Canal 11" },
    { nombre: "Canal 7" },
    { nombre: "Canal 11" },
    { nombre: "Canal 4" },
    { nombre: "Canal 8" },
    { nombre: "Canal 10" },
    { nombre: "Cable Sports" },
    { nombre: "BeIN Sports" },
    { nombre: "BeIN Sports Español" },
    { nombre: "DAZN 1", stream: "dazn1" },
    { nombre: "DAZN 2" },
    { nombre: "DAZN 3" },
    { nombre: "TUDN", stream: "tudn" },
    { nombre: "TUDN MX" },
    { nombre: "Univision", stream: "univision" },
    { nombre: "Universo" },
    { nombre: "Sky Sports" },
    { nombre: "Sky Sports Bundesliga" },
    { nombre: "Sky Sports LaLiga" },
    { nombre: "Sky Bundesliga 1" },
    { nombre: "Sky Bundesliga 2" },
    { nombre: "Sport TV 1" },
    { nombre: "Sport TV 2" },
    { nombre: "Sport TV 3" },
    { nombre: "Sportv" },
    { nombre: "Sportv 2" },
    { nombre: "Sportv 3" },
    { nombre: "Hisports" },
    { nombre: "Liga de Campeones 1" },
    { nombre: "Liga de Campeones 2" },
    { nombre: "Liga de Campeones 3" },
    { nombre: "ECDF LigaPro (eventos)" },
    { nombre: "Liga1 MAX" },
    { nombre: "TVR" },
    { nombre: "CMD" },
    { nombre: "Gol de America" }
  ],

  /* Deportes que se muestran en la agenda */
  deportes: {
    futbol: 180,
    basketball: 180,
    tennis: 240,
    formula1: 180,
    boxing: 300,
    "mma(ufc)": 300,
    wwe: 240
  }
};
