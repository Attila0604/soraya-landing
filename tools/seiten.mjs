#!/usr/bin/env node
// Soraya Landingpage: statische Seiten fuer Google erzeugen (ohne npm-Pakete, Node 22).
//
//   node tools/seiten.mjs
//
// Erzeugt bei jedem Lauf alles neu:
//   - en.html, hu.html, it.html     fertig uebersetzte Startseite (Texte aus dem L-Objekt in index.html)
//   - index.html                    nur die markierten Teile: Sternzeichen-Karten, #zeichenSeiten, #ldjson
//   - sternzeichen.html, en/zodiac.html, hu/csillagjegyek.html, it/segni-zodiacali.html   (Uebersicht)
//   - sternzeichen/<slug>.html, en/zodiac/<slug>.html, ...                               (je Sternzeichen)
//   - sitemap.xml
// Inhalte der Sternzeichen-Seiten: inhalte/zeichen/<sprache>/<slug>.json (fehlende Dateien werden
// uebersprungen, es wird nur auf vorhandene Seiten verlinkt).
// Deutsche Texte stehen in index.html, Uebersetzungen im L-Objekt dort: Texte NUR dort aendern, dann neu erzeugen.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://www.sorayaluxuryastroguide.com";
const APP = "https://app.sorayaluxuryastroguide.com/";
const PLAY = "https://play.google.com/store/apps/details?id=com.sorayaluxuryastroguide.app.twa";
const ENGINE = "https://astro-engine-production-7b18.up.railway.app";
const OG_BILD = BASE + "/og-bild.jpg";
const ERSTMALS = "2026-10-20";
const HEUTE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Vienna" }).format(new Date());

const LANGS = ["de", "en", "hu", "it"];
const LOC = { de: "de_DE", en: "en_GB", hu: "hu_HU", it: "it_IT" };
const INTL = { de: "de-DE", en: "en-GB", hu: "hu-HU", it: "it-IT" };
const HOME = { de: "/", en: "/en", hu: "/hu", it: "/it" };
const HUB = { de: "/sternzeichen", en: "/en/zodiac", hu: "/hu/csillagjegyek", it: "/it/segni-zodiacali" };

const KEYS = ["Ari", "Tau", "Gem", "Can", "Leo", "Vir", "Lib", "Sco", "Sag", "Cap", "Aqu", "Pis"];
const GLYPH = "♈♉♊♋♌♍♎♏♐♑♒♓";
const SLUG = {
  de: ["widder", "stier", "zwillinge", "krebs", "loewe", "jungfrau", "waage", "skorpion", "schuetze", "steinbock", "wassermann", "fische"],
  en: ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"],
  hu: ["kos", "bika", "ikrek", "rak", "oroszlan", "szuz", "merleg", "skorpio", "nyilas", "bak", "vizonto", "halak"],
  it: ["ariete", "toro", "gemelli", "cancro", "leone", "vergine", "bilancia", "scorpione", "sagittario", "capricorno", "acquario", "pesci"],
};
const NAMEN = {
  de: ["Widder", "Stier", "Zwillinge", "Krebs", "Löwe", "Jungfrau", "Waage", "Skorpion", "Schütze", "Steinbock", "Wassermann", "Fische"],
  en: ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"],
  hu: ["Kos", "Bika", "Ikrek", "Rák", "Oroszlán", "Szűz", "Mérleg", "Skorpió", "Nyilas", "Bak", "Vízöntő", "Halak"],
  it: ["Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine", "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"],
};
// [Monat, Tag] Beginn und Ende
const DATEN = [[3, 21, 4, 19], [4, 20, 5, 20], [5, 21, 6, 20], [6, 21, 7, 22], [7, 23, 8, 22], [8, 23, 9, 22],
  [9, 23, 10, 22], [10, 23, 11, 21], [11, 22, 12, 21], [12, 22, 1, 19], [1, 20, 2, 18], [2, 19, 3, 20]];
// Element = Position im Tierkreis modulo 4
const ELEMENTE = {
  de: ["Feuer", "Erde", "Luft", "Wasser"], en: ["Fire", "Earth", "Air", "Water"],
  hu: ["Tűz", "Föld", "Levegő", "Víz"], it: ["Fuoco", "Terra", "Aria", "Acqua"],
};
const PFLICHT = ["key", "slug", "name", "zeitraum", "element", "modalitaet", "herrscher", "seo_title", "meta_description",
  "h1", "intro", "abschnitte", "staerken", "schwaechen", "passt_gut", "passt_weniger", "passung_text", "faq", "cta"];

// Texte der Sternzeichen-Seiten, die es auf der Startseite (noch) nicht gibt
const UI = {
  de: {
    zeichen: "Sternzeichen", pfad: "Seitenpfad", zeitraum: "Zeitraum", element: "Element", modalitaet: "Modalität",
    herrscher: "Herrscher", symbol: "Symbol", heute: "Horoskop heute", heuteTitel: "Tageshoroskop: {name}",
    fallback: "Das heutige Horoskop lässt sich gerade nicht laden. Versuch es gleich noch einmal – oder öffne Soraya für dein persönliches Tageshoroskop.",
    ohneJs: "Dein Tageshoroskop für heute findest du in Soraya – gratis.",
    swTitel: "Stärken & Schwächen", staerken: "Stärken", schwaechen: "Schwächen",
    passungTitel: "Wer passt zu dir?", passtGut: "Passt gut", passtWeniger: "Eher herausfordernd",
    faqTitel: "Häufige Fragen", ctaTitel: "Dein persönliches Horoskop – gratis", weitere: "Die anderen Sternzeichen",
    hubTitle: "Die 12 Sternzeichen: Daten, Eigenschaften & Horoskop | Soraya",
    hubDesc: "Alle 12 Sternzeichen auf einen Blick: Daten, Elemente, Eigenschaften, Liebe und Tageshoroskop. Finde dein Zeichen und entdecke dein Horoskop gratis.",
    hubH1: "Die 12 Sternzeichen",
    hubIntro: "Vom feurigen Widder bis zu den verträumten Fischen: Jedes Sternzeichen erzählt seine eigene Geschichte. Wähle dein Zeichen und entdecke Charakter, Liebe, Stärken und dein Horoskop für heute.",
    hubElemente: "Die vier Elemente",
    hubElementText: ["Begeisterung, Mut und Tatkraft.", "Beständigkeit, Sinnlichkeit und Bodenhaftung.", "Neugier, Austausch und Leichtigkeit.", "Gefühl, Intuition und Tiefe."],
    hubMond: "Mehr als dein Sonnenzeichen: Finde gratis heraus, wo dein Mond steht ›",
    hubCta: "Dein Sonnenzeichen ist erst der Anfang. Dein Geburtshoroskop mit Mond, Aszendent und Planeten zeigt, was dich wirklich ausmacht – gratis in Soraya.",
  },
  en: {
    zeichen: "Zodiac signs", pfad: "Breadcrumb", zeitraum: "Dates", element: "Element", modalitaet: "Modality",
    herrscher: "Ruling planet", symbol: "Symbol", heute: "Horoscope today", heuteTitel: "Daily horoscope: {name}",
    fallback: "Today's horoscope can't be loaded right now. Try again in a moment – or open Soraya for your personal daily horoscope.",
    ohneJs: "Find your horoscope for today in Soraya – free.",
    swTitel: "Strengths & weaknesses", staerken: "Strengths", schwaechen: "Weaknesses",
    passungTitel: "Who's your match?", passtGut: "Great match", passtWeniger: "More challenging",
    faqTitel: "Frequently asked questions", ctaTitel: "Your personal horoscope – free", weitere: "The other zodiac signs",
    hubTitle: "The 12 Zodiac Signs: Dates, Traits & Horoscope | Soraya",
    hubDesc: "All 12 zodiac signs at a glance: dates, elements, personality, love and today's horoscope. Find your sign and discover your free horoscope with Soraya.",
    hubH1: "The 12 zodiac signs",
    hubIntro: "From fiery Aries to dreamy Pisces, every sign tells its own story. Choose yours to explore personality, love, strengths and your horoscope for today.",
    hubElemente: "The four elements",
    hubElementText: ["Enthusiasm, courage and drive.", "Stability, sensuality and a grounded mind.", "Curiosity, connection and lightness.", "Feeling, intuition and depth."],
    hubMond: "There's more to you than your Sun sign: find out free where your Moon is ›",
    hubCta: "Your Sun sign is just the beginning. Your birth chart with Moon, ascendant and planets shows what truly makes you you – free in Soraya.",
  },
  hu: {
    zeichen: "Csillagjegyek", pfad: "Navigációs útvonal", zeitraum: "Időszak", element: "Elem", modalitaet: "Minőség",
    herrscher: "Uralkodó bolygó", symbol: "Jel", heute: "Mai horoszkóp", heuteTitel: "Napi horoszkóp: {name}",
    fallback: "A mai horoszkóp most nem tölthető be. Próbáld újra egy kicsit később – vagy nyisd meg a Sorayát a személyes napi horoszkópodért.",
    ohneJs: "A mai horoszkópodat a Sorayában találod – ingyen.",
    swTitel: "Erősségek és gyenge pontok", staerken: "Erősségek", schwaechen: "Gyenge pontok",
    passungTitel: "Ki illik hozzád?", passtGut: "Jól illik hozzád", passtWeniger: "Több kihívással jár",
    faqTitel: "Gyakori kérdések", ctaTitel: "Személyes horoszkópod – ingyen", weitere: "A többi csillagjegy",
    hubTitle: "A 12 csillagjegy: dátumok, tulajdonságok, horoszkóp | Soraya",
    hubDesc: "Mind a 12 csillagjegy egy helyen: dátumok, elemek, tulajdonságok, szerelem és napi horoszkóp. Keresd meg a jegyedet, és fedezd fel ingyen a horoszkópodat.",
    hubH1: "A 12 csillagjegy",
    hubIntro: "A tüzes Kostól az álmodozó Halakig minden csillagjegy a saját történetét meséli. Válaszd ki a jegyedet, és ismerd meg a jellemedet, a szerelmi oldaladat, az erősségeidet és a mai horoszkópodat.",
    hubElemente: "A négy elem",
    hubElementText: ["Lelkesedés, bátorság és tettrekészség.", "Kitartás, érzékiség és józan gondolkodás.", "Kíváncsiság, kapcsolódás és könnyedség.", "Érzelem, intuíció és mélység."],
    hubMond: "Több vagy, mint a napjegyed: nézd meg ingyen, hol áll a Holdad ›",
    hubCta: "A napjegyed csak a kezdet. A születési horoszkópod a Holddal, az aszcendenssel és a bolygókkal megmutatja, mi tesz igazán téged azzá, aki vagy – ingyen a Sorayában.",
  },
  it: {
    zeichen: "Segni zodiacali", pfad: "Percorso", zeitraum: "Periodo", element: "Elemento", modalitaet: "Modalità",
    herrscher: "Pianeta dominante", symbol: "Simbolo", heute: "Oroscopo di oggi", heuteTitel: "Oroscopo di oggi: {name}",
    fallback: "Al momento non riusciamo a caricare l'oroscopo di oggi. Riprova tra poco – oppure apri Soraya per il tuo oroscopo personale del giorno.",
    ohneJs: "Trovi il tuo oroscopo di oggi in Soraya – gratis.",
    swTitel: "Punti di forza e debolezze", staerken: "Punti di forza", schwaechen: "Punti deboli",
    passungTitel: "Chi è più affine a te?", passtGut: "Grande affinità", passtWeniger: "Più impegnativo",
    faqTitel: "Domande frequenti", ctaTitel: "Il tuo oroscopo personale – gratis", weitere: "Gli altri segni zodiacali",
    hubTitle: "I 12 segni zodiacali: date, carattere e oroscopo | Soraya",
    hubDesc: "Tutti i 12 segni zodiacali in breve: date, elementi, carattere, amore e oroscopo di oggi. Trova il tuo segno e scopri gratis il tuo oroscopo con Soraya.",
    hubH1: "I 12 segni zodiacali",
    hubIntro: "Dall'Ariete pieno di fuoco ai sognanti Pesci, ogni segno racconta una storia tutta sua. Scegli il tuo e scopri carattere, amore, punti di forza e l'oroscopo di oggi.",
    hubElemente: "I quattro elementi",
    hubElementText: ["Entusiasmo, coraggio ed energia.", "Stabilità, sensualità e concretezza.", "Curiosità, dialogo e leggerezza.", "Emozione, intuito e profondità."],
    hubMond: "Sei molto più del tuo segno solare: scopri gratis dove si trova la tua Luna ›",
    hubCta: "Il tuo segno solare è solo l'inizio. Il tuo tema natale con Luna, ascendente e pianeti mostra che cosa ti rende davvero unico – gratis in Soraya.",
  },
};

// ---------------------------------------------------------------------------
// Hilfen
// ---------------------------------------------------------------------------
const warnungen = [];
function warn(t) { warnungen.push(t); }
const lies = (p) => readFileSync(join(ROOT, p), "utf8");
function schreib(p, inhalt) {
  const ziel = join(ROOT, p);
  mkdirSync(dirname(ziel), { recursive: true });
  if (existsSync(ziel) && readFileSync(ziel, "utf8") === inhalt) return false;
  writeFileSync(ziel, inhalt);
  return true;
}
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const dekodiere = (t) => String(t).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e.toLowerCase()] ?? m));
const nurText = (h) => dekodiere(String(h).replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
const glyph = (i) => GLYPH[i] + "︎";
const url = (pfad) => BASE + pfad;
const ldJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c");
const kurzDatum = (l, m, d) => new Intl.DateTimeFormat(INTL[l], { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2001, m - 1, d)));
// jedes Datum bleibt zusammen, umbrochen wird hoechstens nach dem Strich
const zeitraumKurz = (l, i) => [kurzDatum(l, DATEN[i][0], DATEN[i][1]), kurzDatum(l, DATEN[i][2], DATEN[i][3])]
  .map((t) => t.replace(/\s/g, " ")).join(" – ");
// als HTML: jedes Datum in einem eigenen <span> (nowrap), umbrochen wird nur nach dem Strich
const zeitraumHtml = (l, i) => zeitraumKurz(l, i).split(/\s–\s/).map((t, n, a) => `<span>${esc(t)}${n < a.length - 1 ? "\u00a0–" : ""}</span>`).join(" ");
const zeichenPfad = (l, i) => HUB[l] + "/" + SLUG[l][i];
const datei = (pfad) => (pfad === "/" ? "index.html" : pfad.slice(1) + ".html");

// App-Link mit Sprache (und Link-Kennung) - wie das Script der Startseite
function appUrl(l, q) {
  const u = new URL(APP);
  if (q) u.searchParams.set("q", q);
  u.searchParams.set("lang", l);
  return u.toString();
}
const playUrl = (l) => PLAY + "&amp;hl=" + l; // nur fuer HTML-Attribute

// Element mit Attribut finden und seinen Inhalt ersetzen (wie el.innerHTML = ...), Verschachtelung beachten
function innenErsetzen(html, startTagRe, neu) {
  let out = "", pos = 0, m;
  const re = new RegExp(startTagRe.source, "g");
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase(), inhaltStart = m.index + m[0].length;
    const tiefe = new RegExp("<(/?)" + tag + "\\b[^>]*>", "gi");
    tiefe.lastIndex = inhaltStart;
    let d = 1, e, ende = -1;
    while ((e = tiefe.exec(html))) {
      if (e[1]) { if (--d === 0) { ende = e.index; break; } } else if (!/\/>$/.test(e[0])) d++;
    }
    if (ende < 0) throw new Error("Kein Ende fuer <" + tag + "> bei " + m.index);
    const ersatz = neu(m, html.slice(inhaltStart, ende));
    out += html.slice(pos, inhaltStart) + (ersatz ?? html.slice(inhaltStart, ende));
    pos = ende;
    re.lastIndex = ende;
  }
  return out + html.slice(pos);
}
// alle Start-Tags <a ...> bearbeiten
const tagsBearbeiten = (html, name, fn) => html.replace(new RegExp("<" + name + "\\b[^>]*>", "g"), (t) => fn(t));
const attr = (tag, a) => { const m = tag.match(new RegExp("\\s" + a + '="([^"]*)"')); return m ? m[1] : null; };
const setzeAttr = (tag, a, v) => new RegExp("\\s" + a + '="[^"]*"').test(tag)
  ? tag.replace(new RegExp("(\\s" + a + '=")[^"]*(")'), (_, x, y) => x + v + y)
  : tag.replace(/\s*(\/?)>$/, " " + a + '="' + v + '"$1>');

// ---------------------------------------------------------------------------
// Startseite lesen: deutsche Texte (data-t) und Uebersetzungen (L)
// ---------------------------------------------------------------------------
let index = lies("index.html");
const lStart = index.indexOf("var L = {"), lEnde = index.indexOf("\n    };\n    var LANGS", lStart);
if (lStart < 0 || lEnde < 0) throw new Error("L-Objekt in index.html nicht gefunden");
const L = new Function("return " + index.slice(lStart + 8, lEnde + 6))();
const DE = {};
innenErsetzen(index, /<([a-zA-Z0-9]+)\b[^>]*?\sdata-t="([^"]+)"[^>]*>/, (m, innen) => { if (!(m[2] in DE)) DE[m[2]] = innen; return null; });
for (const m of index.matchAll(/<[a-zA-Z][^>]*\sdata-t-aria="([^"]+)"[^>]*>/g)) if (!(m[1] in DE)) DE[m[1]] = attr(m[0], "aria-label");
DE.title = nurText(index.match(/<title>([\s\S]*?)<\/title>/)[1]);
DE["meta.desc"] = dekodiere(attr(index.match(/<meta name="description"[^>]*>/)[0], "content"));
DE["og.desc"] = dekodiere(attr(index.match(/<meta property="og:description"[^>]*>/)[0], "content"));
for (const k of ["js.laedt", "js.fehler", "js.nochmal", "js.heute", "js.tipp", "js.limit"]) {
  const m = index.match(new RegExp('tr\\("' + k.replace(".", "\\.") + '", "([^"]+)"\\)'));
  if (m && !(k in DE)) DE[k] = m[1];
}
DE["js.heute"] ??= "Heute"; DE["js.tipp"] ??= "Tipp";
function tx(l, k) {
  const v = l === "de" ? DE[k] : (L[l] && L[l][k]) || null;
  if (v) return v;
  warn(`Text "${k}" fehlt fuer ${l} – deutscher Text verwendet`);
  return DE[k] ?? "";
}

// ---------------------------------------------------------------------------
// Inhalte der Sternzeichen
// ---------------------------------------------------------------------------
const INHALT = {};
for (const l of LANGS) {
  INHALT[l] = KEYS.map((k, i) => {
    const p = `inhalte/zeichen/${l}/${SLUG[l][i]}.json`;
    if (!existsSync(join(ROOT, p))) { warn(`fehlt: ${p} (Seite wird nicht erzeugt)`); return null; }
    let d;
    try { d = JSON.parse(lies(p)); } catch (e) { warn(`ungueltiges JSON: ${p}: ${e.message}`); return null; }
    const fehlt = PFLICHT.filter((f) => d[f] == null || d[f] === "" || (Array.isArray(d[f]) && !d[f].length));
    if (fehlt.length) { warn(`${p}: Felder fehlen (${fehlt.join(", ")}) – uebersprungen`); return null; }
    if (d.key !== k) warn(`${p}: key ist "${d.key}", erwartet "${k}"`);
    if (d.slug !== SLUG[l][i]) warn(`${p}: slug ist "${d.slug}", erwartet "${SLUG[l][i]}"`);
    if (d.abschnitte.length !== 5) warn(`${p}: ${d.abschnitte.length} statt 5 Abschnitte`);
    if (d.seo_title.length > 65) warn(`${p}: seo_title hat ${d.seo_title.length} Zeichen`);
    for (const x of [...d.passt_gut, ...d.passt_weniger]) if (!KEYS.includes(x)) warn(`${p}: unbekanntes Zeichen ${x}`);
    return d;
  });
}
const hat = (l, i) => !!INHALT[l][i];
const hubDa = (l) => INHALT[l].some(Boolean);

// ---------------------------------------------------------------------------
// gemeinsame Bausteine
// ---------------------------------------------------------------------------
function zeichenKarten(l, ohne = -1) {
  return KEYS.map((k, i) => {
    if (i === ohne) return "";
    const innen = `<span class="zk-sym" aria-hidden="true">${glyph(i)}</span><b>${esc(NAMEN[l][i])}</b><small>${zeitraumHtml(l, i)}</small>`;
    return hat(l, i) ? `<a class="zk" href="${zeichenPfad(l, i)}">${innen}</a>` : `<span class="zk">${innen}</span>`;
  }).join("");
}
const ZEICHEN_DATEN = Object.fromEntries(LANGS.map((l) => [l, {
  hub: hubDa(l) ? HUB[l] : null,
  z: Object.fromEntries(KEYS.map((k, i) => [k, [hat(l, i) ? zeichenPfad(l, i) : null, zeitraumKurz(l, i)]])),
}]));

function hreflang(versionen) {
  const z = LANGS.filter((l) => versionen[l]).map((l) => `<link rel="alternate" hreflang="${l}" href="${url(versionen[l])}" />`);
  if (versionen.de) z.push(`<link rel="alternate" hreflang="x-default" href="${url(versionen.de)}" />`);
  return z.join("\n");
}

// Sternenhimmel als kleines SVG (immer gleich, damit die Seiten beim Neu-Erzeugen gleich bleiben)
const STERNE = (() => {
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let c = "";
  for (let i = 0; i < 58; i++) {
    const gold = r() < 0.16;
    c += `<circle cx='${Math.round(r() * 560)}' cy='${Math.round(r() * 560)}' r='${(0.35 + r() * (gold ? 1.1 : 0.8)).toFixed(1)}' fill='${gold ? "#e6cf9c" : "#c3b7da"}' opacity='${(0.25 + r() * 0.6).toFixed(2)}'/>`;
  }
  return "data:image/svg+xml," + `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='560'>${c}</svg>`.replace(/[<>#]/g, encodeURIComponent);
})();

const CSS = `
  @font-face{font-family:"SorayaZeichen";src:url("/fonts/soraya-zeichen.woff2") format("woff2");font-display:block;unicode-range:U+2648-2653,U+263D-263F,U+2640,U+2642-2647,U+260A,U+26B7-26B8}
  @font-face{font-family:"Cinzel";font-weight:500 700;font-display:swap;src:url("/fonts/cinzel-ext.woff2") format("woff2");unicode-range:U+0100-017F}
  @font-face{font-family:"Cinzel";font-weight:500 700;font-display:swap;src:url("/fonts/cinzel.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
  @font-face{font-family:"Cormorant Garamond";font-weight:500 600;font-display:swap;src:url("/fonts/cormorant-ext.woff2") format("woff2");unicode-range:U+0100-017F}
  @font-face{font-family:"Cormorant Garamond";font-weight:500 600;font-display:swap;src:url("/fonts/cormorant.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
  @font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:500;font-display:swap;src:url("/fonts/cormorant-kursiv-ext.woff2") format("woff2");unicode-range:U+0100-017F}
  @font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:500;font-display:swap;src:url("/fonts/cormorant-kursiv.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
  @font-face{font-family:"Inter";font-weight:400 600;font-display:swap;src:url("/fonts/inter-ext.woff2") format("woff2");unicode-range:U+0100-017F}
  @font-face{font-family:"Inter";font-weight:400 600;font-display:swap;src:url("/fonts/inter.woff2") format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2212,U+FEFF,U+FFFD}
  :root{--void:#0b0713;--void-2:#140b22;--gold:#c9a86a;--gold-soft:#e6cf9c;--gold-deep:#a9863f;--gold-dim:rgba(201,168,106,.42);
    --mist:#c3b7da;--mist-dim:#8a7ea6;--mist-faint:#837799;--ink:#f4eedd;--ok-red:#f0c4bc;
    --panel:rgba(26,17,44,.44);--panel-2:rgba(32,21,54,.62);--line:rgba(201,168,106,.20);--line-soft:rgba(195,183,218,.12);--line-violet:rgba(168,107,255,.18);
    --display:"SorayaZeichen","Cormorant Garamond",Georgia,serif;--wordmark:"Cinzel",serif;--ui:"SorayaZeichen","Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--r-pill:999px}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;font-family:var(--ui);color:var(--mist);background:var(--void);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
  body::before{content:"";position:fixed;inset:0;z-index:-2;background:radial-gradient(1200px 700px at 78% -8%,rgba(120,74,190,.22),transparent 60%),radial-gradient(900px 600px at 8% 12%,rgba(201,168,106,.08),transparent 60%),linear-gradient(180deg,#0e0a22 0%,#0a0618 52%,#060410 100%)}
  body::after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.7;background:url("${STERNE}") 0 0/560px 560px;
    -webkit-mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.55) 60%,rgba(0,0,0,.3));mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.55) 60%,rgba(0,0,0,.3))}
  a{color:var(--gold-soft);text-decoration:none}
  img{max-width:100%;display:block}
  [hidden]{display:none!important}
  h1,h2,h3,summary{text-wrap:balance;overflow-wrap:break-word;hyphens:auto} p,li{text-wrap:pretty}
  :focus-visible{outline:2px solid var(--gold-soft);outline-offset:3px;border-radius:10px}
  .wrap{max-width:1120px;margin:0 auto;padding:0 clamp(18px,5vw,40px)}
  .lese{max-width:760px;margin:0 auto}
  .eyebrow{font-family:var(--wordmark);font-weight:500;font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:12px;margin:0 0 14px}
  .eyebrow.linien::before,.eyebrow.linien::after{content:"";width:26px;height:1px;background:linear-gradient(90deg,transparent,var(--gold-dim))}
  .eyebrow.linien::after{transform:scaleX(-1)}
  /* Kopfzeile */
  .nav{display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:1200px;margin:0 auto;padding:18px clamp(18px,5vw,40px)}
  .mark{display:flex;align-items:center;gap:11px}
  .mark .name{font-family:var(--wordmark);font-weight:600;font-size:15px;letter-spacing:.34em;color:var(--gold-soft)}
  .nav-rechts{display:flex;align-items:center;gap:14px}
  .to-app{display:inline-block;font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--mist-dim);border:1px solid var(--line);padding:9px 18px;border-radius:var(--r-pill);transition:.25s}
  .to-app:hover{color:var(--gold-soft);border-color:var(--gold-dim);background:var(--panel)}
  .langs{display:flex;gap:4px}
  .langs a{font-size:11.5px;font-weight:600;letter-spacing:.08em;color:var(--mist-dim);padding:6px 9px;border-radius:var(--r-pill);border:1px solid transparent;transition:.2s}
  .langs a:hover{color:var(--gold-soft)}
  .langs a.active{color:var(--gold-soft);border-color:var(--gold-dim);background:var(--panel)}
  .langs a:focus-visible,.to-app:focus-visible{border-radius:var(--r-pill)}
  .nav .to-app.nur-android{display:none}
  .is-android .nav .to-app.nur-andere{display:none}
  @media (min-width:561px){.is-android .nav .to-app.nur-android{display:inline-block}}
  @media (max-width:560px){.nav .to-app{display:none!important}.mark .name{font-size:13px;letter-spacing:.3em}.mark img{width:22px;height:auto}}
  /* Seitenpfad */
  .krumen ol{list-style:none;display:flex;flex-wrap:wrap;gap:4px 8px;padding:0;margin:4px 0 0;font-size:12.5px;color:var(--mist-dim)}
  .krumen li+li::before{content:"›";margin-right:8px;color:var(--mist-faint)}
  .krumen a{color:var(--mist-dim)} .krumen a:hover{color:var(--gold-soft)}
  .krumen [aria-current]{color:var(--mist)}
  /* Kopf */
  .z-kopf{text-align:center;padding:clamp(26px,6vw,60px) 0 clamp(26px,4vw,40px)}
  .z-glyph{position:relative;width:104px;height:104px;margin:0 auto 22px;display:grid;place-items:center;border-radius:50%;border:1px solid var(--gold-dim);
    background:radial-gradient(circle,rgba(201,168,106,.2),transparent 70%);font-family:"SorayaZeichen",serif;font-size:52px;line-height:1;color:var(--gold-soft);
    text-shadow:0 0 24px rgba(201,168,106,.55);box-shadow:0 0 60px -12px rgba(201,168,106,.45)}
  .z-glyph::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:1px dashed rgba(201,168,106,.25)}
  h1{font:600 clamp(38px,7.4vw,66px)/1.04 var(--display);margin:0 0 18px;background:linear-gradient(180deg,#f4e6c4 0%,var(--gold-soft) 46%,var(--gold-deep) 100%);
    -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:var(--gold-soft)}
  .intro{font:italic 500 clamp(19px,2.4vw,23px)/1.45 "Cormorant Garamond",Georgia,serif;color:var(--mist);max-width:40ch;margin:0 auto}
  /* Steckbrief */
  .fakten{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;max-width:900px;margin:0 auto;padding:0}
  .fakt{border:1px solid var(--line);border-radius:16px;padding:14px 10px 13px;text-align:center;background:radial-gradient(120% 80% at 50% 0%,rgba(201,168,106,.09),transparent 62%),rgba(20,13,34,.55)}
  .fakt dt{font:500 9.5px/1.3 var(--wordmark);letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
  .fakt dd{margin:0;font:600 18px/1.25 var(--display);color:var(--ink)}
  .fakt dd small{display:block;font:400 12px/1.35 var(--ui);color:var(--mist-dim);margin-top:2px}
  .fakt .sym{font-family:"SorayaZeichen",serif;font-size:24px;line-height:1;color:var(--gold-soft)}
  @media (max-width:720px){.fakten{grid-template-columns:repeat(2,minmax(0,1fr))}.fakt:first-child{grid-column:1/-1}}
  /* Karten */
  .karte{position:relative;border:1px solid var(--line);border-radius:20px;padding:clamp(22px,4vw,32px);
    background:radial-gradient(120% 90% at 50% 0%,rgba(120,74,190,.16),transparent 60%),var(--panel-2)}
  .karte::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(230,207,156,.55),transparent)}
  .horo-karte{margin-top:clamp(28px,5vw,44px)}
  .horo-karte h2{font:600 clamp(26px,3.6vw,32px)/1.15 var(--display);color:var(--ink);margin:0 0 14px}
  .horo{min-height:76px}
  .horo .horo-datum{display:block;font:500 10.5px/1.3 var(--wordmark);letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin:0 0 8px}
  .horo h3{font:600 23px/1.25 var(--display);color:var(--ink);margin:0 0 8px}
  .horo p{margin:0 0 12px}
  .horo .tipp{border-left:2px solid var(--gold);padding-left:12px;color:var(--gold-soft);font-size:15px}
  .laedt{color:var(--mist-dim);font-size:14px;display:flex;gap:10px;align-items:flex-start;margin:0}
  .laedt::before{content:"";flex:none;margin-top:4px;width:14px;height:14px;border-radius:50%;border:2px solid var(--gold-dim);border-top-color:var(--gold-soft);animation:dreh 1s linear infinite}
  @keyframes dreh{to{transform:rotate(360deg)}}
  .fehler{color:var(--ok-red);font-size:14.5px;margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px}
  .fehler.limit{color:var(--mist)}
  .nochmal{background:transparent;border:1px solid rgba(240,196,188,.45);color:var(--ok-red);border-radius:var(--r-pill);padding:7px 14px;font:500 13px var(--ui);cursor:pointer}
  .pille-link{display:flex;justify-content:center;align-items:center;text-align:center;margin-top:16px;padding:12px 18px;font-size:14px;font-weight:500;line-height:1.4;
    border:1px solid var(--gold-dim);border-radius:var(--r-pill);background:rgba(201,168,106,.07);transition:.25s}
  .pille-link:hover{border-color:var(--gold-soft);background:rgba(201,168,106,.13)}
  .pille-link:focus-visible{border-radius:var(--r-pill)}
  /* Text */
  .text h2,.block-titel{font:600 clamp(27px,3.8vw,36px)/1.15 var(--display);color:var(--ink);margin:clamp(44px,6vw,60px) 0 16px}
  .text h2::before,.block-titel::before{content:"";display:block;width:40px;height:1px;margin:0 0 16px;background:linear-gradient(90deg,var(--gold),transparent)}
  .text p{margin:0 0 16px;font-size:16.5px;line-height:1.78}
  /* Staerken & Schwaechen */
  .sw{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .sw h3{font:500 11px/1.3 var(--wordmark);letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin:0 0 14px}
  .sw ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
  .sw li{padding:6px 14px;border-radius:var(--r-pill);font-size:14.5px;line-height:1.35;border:1px solid var(--gold-dim);color:var(--gold-soft);background:rgba(201,168,106,.06)}
  .sw .minus li{border-color:var(--line-soft);color:var(--mist);background:rgba(195,183,218,.04)}
  @media (max-width:640px){.sw{grid-template-columns:1fr}}
  /* Passung */
  .passung p{margin:0 0 18px;font-size:16.5px;line-height:1.78}
  .pass-reihe{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}
  .pass-reihe>span{flex:0 0 100%;font:500 10.5px/1.3 var(--wordmark);letter-spacing:.24em;text-transform:uppercase;color:var(--gold);margin-bottom:2px}
  .pass{display:inline-flex;align-items:center;gap:8px;padding:8px 16px 8px 12px;border-radius:var(--r-pill);border:1px solid var(--gold-dim);color:var(--ink);background:rgba(201,168,106,.06);font-size:15px;transition:.2s}
  .pass i{font-style:normal;font-family:"SorayaZeichen",serif;color:var(--gold-soft);font-size:17px;line-height:1}
  a.pass:hover{border-color:var(--gold-soft);background:rgba(201,168,106,.12)}
  .pass.weniger{border-color:var(--line-soft);background:rgba(195,183,218,.04)}
  a.pass:focus-visible{border-radius:var(--r-pill)}
  /* FAQ */
  .faq details{border-bottom:1px solid var(--line-soft);padding:16px 0}
  .faq summary{cursor:pointer;font:600 21px/1.3 var(--display);color:var(--ink);list-style:none;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;transition:color .2s}
  .faq summary::-webkit-details-marker{display:none}
  .faq summary::after{content:"+";color:var(--gold-soft);font-family:var(--ui);font-weight:400}
  .faq details[open] summary::after{content:"–"}
  .faq summary:hover{color:var(--gold-soft)}
  .faq p{margin:10px 0 0;color:var(--mist-dim)}
  /* Aufruf */
  .cta{text-align:center;border:1px solid var(--line);border-radius:28px;padding:clamp(40px,7vw,64px) clamp(20px,5vw,56px);margin:clamp(48px,7vw,72px) 0 0;
    background:radial-gradient(120% 130% at 50% 0%,rgba(120,74,190,.2),transparent 60%),linear-gradient(160deg,var(--panel-2),var(--panel));overflow:hidden}
  .cta img{margin:0 auto 14px;height:auto;filter:drop-shadow(0 0 18px rgba(201,168,106,.35))}
  .cta h2{font:600 clamp(28px,4.6vw,42px)/1.12 var(--display);margin:0 0 14px;color:var(--ink)}
  .cta p{color:var(--mist-dim);max-width:46ch;margin:0 auto 28px;text-wrap:balance}
  .stores{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .store-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:12px;min-height:58px;padding:13px 24px 13px 20px;border-radius:14px;
    background:linear-gradient(180deg,rgba(30,20,48,.9),rgba(16,10,30,.9));border:1px solid var(--gold-dim);color:var(--mist);transition:.28s;box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.04)}
  .store-btn:hover{transform:translateY(-2px);border-color:var(--gold-soft);color:var(--gold-soft)}
  .store-btn svg{width:24px;height:24px;flex:none;color:var(--gold-soft)}
  .store-btn .st-txt{display:flex;flex-direction:column;line-height:1.15;text-align:left}
  .store-btn .st-small{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--mist-dim)}
  .store-btn .st-big{font-family:var(--display);font-weight:600;font-size:18px;color:var(--gold-soft)}
  .store-btn:focus-visible{border-radius:14px}
  .store-btn .fuer-desk{display:none} html.is-desktop .store-btn .fuer-desk{display:inline} html.is-desktop .store-btn .fuer-ios{display:none}
  html.is-ios .store-btn:not(.ios-btn){display:none} html.is-android .ios-btn{display:none}
  html.is-android .store-btn:not(.ios-btn),html.is-ios .store-btn.ios-btn,html.is-desktop .store-btn.ios-btn{background:linear-gradient(180deg,#ecd7a6,#c9a86a);border-color:rgba(255,240,205,.55);color:#1a1209;box-shadow:0 16px 36px -14px rgba(201,168,106,.65),inset 0 1px 0 rgba(255,255,255,.35)}
  html.is-android .store-btn:not(.ios-btn) :is(svg,.st-big),html.is-ios .store-btn.ios-btn :is(svg,.st-big),html.is-desktop .store-btn.ios-btn :is(svg,.st-big){color:#1a1209}
  html.is-android .store-btn:not(.ios-btn) .st-small,html.is-ios .store-btn.ios-btn .st-small,html.is-desktop .store-btn.ios-btn .st-small{color:rgba(26,18,9,.7)}
  .ios-hint{display:none;max-width:34ch;margin:16px auto 0;font-size:13.5px;line-height:1.55;color:var(--mist-dim)} .ios-hint b{color:var(--gold-soft);font-weight:600}
  html.is-ios .ios-hint{display:block}
  .alt-link{display:none;margin:14px auto 0;font-size:13px;color:var(--mist-dim)}
  .alt-link a{color:var(--gold-soft);text-decoration:underline;text-decoration-color:var(--gold-dim);text-underline-offset:4px;padding:12px 0}
  html.is-android .alt-link.fuer-android,html.is-ios .alt-link.fuer-ios{display:block}
  .vertrauen{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;padding:0;margin:26px auto 0;font-size:12.5px;color:var(--mist-dim)}
  .vertrauen li{display:inline-flex;align-items:center;gap:6px} .vertrauen li::before{content:"✓";color:var(--gold-soft);font-weight:600}
  /* Sternzeichen-Karten */
  .zk-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
  .zk{display:flex;flex-direction:column;align-items:center;gap:3px;padding:18px 6px 15px;text-align:center;color:var(--mist);border:1px solid var(--line-violet);border-top-color:var(--line);
    border-radius:16px;background:radial-gradient(120% 80% at 50% 0%,rgba(201,168,106,.08),transparent 62%),var(--panel);transition:border-color .25s,transform .25s,box-shadow .25s}
  a.zk:hover{border-color:var(--gold-dim);transform:translateY(-2px);box-shadow:0 14px 30px -20px rgba(201,168,106,.6)}
  a.zk:focus-visible{border-radius:16px}
  .zk-sym{font-family:"SorayaZeichen",serif;font-size:27px;line-height:1.15;color:var(--gold-soft);text-shadow:0 0 16px rgba(201,168,106,.4)}
  .zk b{font:600 19px/1.2 var(--display);color:var(--ink);max-width:100%;overflow-wrap:anywhere}
  .zk small{font-size:11.5px;line-height:1.3;color:var(--mist-dim)}
  .zk small span{white-space:nowrap}
  .zk em{font-style:normal;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-top:4px}
  span.zk{opacity:.55}
  @media (max-width:900px){.zk-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media (max-width:560px){.zk-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.zk{padding:14px 4px 12px}.zk b{font-size:17px}.zk small{font-size:11px}}
  .elemente{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .elemente .karte{padding:22px 20px}
  .elemente h3{font:600 23px/1.2 var(--display);color:var(--ink);margin:0 0 4px}
  .elemente p{margin:0 0 12px;font-size:14.5px;color:var(--mist-dim)}
  .elemente .pass{padding:5px 12px 5px 9px;font-size:13.5px;margin:0 4px 6px 0}
  @media (max-width:900px){.elemente{grid-template-columns:1fr 1fr}}
  @media (max-width:520px){.elemente{grid-template-columns:1fr}}
  .hub-mond{display:table;margin:22px auto 0}
  main{padding-bottom:clamp(56px,8vw,90px)}
  /* Fusszeile */
  footer{border-top:1px solid var(--line-soft);padding:52px 0 44px;background:linear-gradient(180deg,transparent,rgba(201,168,106,.03))}
  footer .foot{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:28px 40px;align-items:start}
  footer .name{display:flex;align-items:center;gap:10px;font-family:var(--wordmark);font-weight:600;letter-spacing:.32em;color:var(--gold-soft);font-size:14px}
  footer .name img{width:22px;height:auto}
  footer .f-marke p{margin:10px 0 0;font:italic 500 17px/1.4 "Cormorant Garamond",Georgia,serif;color:var(--mist-dim);max-width:26ch}
  footer h3{font:500 10.5px/1.3 var(--wordmark);letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin:0 0 12px}
  footer .f-links{display:flex;flex-direction:column;gap:2px}
  footer .f-links a,footer .f-recht a{display:inline-block;padding:5px 0;color:var(--mist-dim);font-size:14px;transition:color .2s;width:max-content}
  footer .f-links a:hover,footer .f-recht a:hover{color:var(--gold-soft)}
  footer .langs{margin-left:-9px;margin-bottom:14px}
  footer .f-recht{display:flex;gap:0 20px;flex-wrap:wrap}
  footer .f-unten{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px 20px;border-top:1px solid var(--line-soft);padding-top:20px;margin-top:6px}
  footer .copy{color:var(--mist-dim);font-size:12px}
  footer .powered{display:inline-flex;align-items:center;gap:7px;font:500 11px var(--wordmark);letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
  footer .powered strong{font-weight:700;color:var(--gold-soft)}
  footer .powered svg{width:15px;height:15px;color:var(--gold-soft);filter:drop-shadow(0 0 5px rgba(201,168,106,.55))}
  footer .f-links a.nur-android{display:none} .is-android footer .f-links a.nur-android{display:inline-block} .is-android footer .f-links a.nur-andere{display:none}
  @media (max-width:720px){footer .foot{grid-template-columns:1fr 1fr}footer .f-marke{grid-column:1/-1}}
  /* feste Leiste am Handy */
  .sticky-cta{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;display:none;transform:translateY(160%);visibility:hidden;transition:transform .35s ease,visibility 0s linear .35s}
  .sticky-cta.zeigen{transform:none;visibility:visible;transition:transform .35s ease,visibility 0s}
  .sticky-cta a{display:flex;justify-content:center;align-items:center;gap:8px;background:linear-gradient(180deg,#e6cf9c,#c9a86a);color:#1a1209;font:600 15px var(--ui);border-radius:var(--r-pill);padding:15px;box-shadow:0 12px 34px -10px rgba(0,0,0,.7)}
  .sticky-cta .nur-android{display:none} .is-android .sticky-cta .nur-android{display:flex} .is-android .sticky-cta .nur-andere{display:none}
  @media (max-width:820px){.sticky-cta{display:block}footer{padding-bottom:calc(100px + env(safe-area-inset-bottom,0px))}}
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
  @media print{body::before,body::after,.nav,.sticky-cta,.stores,.horo-karte,footer .langs{display:none!important}html,body{background:#fff!important;color:#2a2235!important}
    h1{-webkit-text-fill-color:#8a6a2c;background:none}.text h2,.faq summary,.cta h2{color:#2a2235!important}.faq details>p{display:block}}
`.replace(/\n\s+/g, "\n").replace(/\s*([{};,>])\s*/g, "$1").replace(/;}/g, "}").trim() + "\n";
// gemeinsame Gestaltung aller Sternzeichen-Seiten (eine Datei, wird vom Browser zwischengespeichert)
const CSS_DATEI = "/zeichen.css";
const CSS_VERSION = (() => { let h = 0; for (const ch of CSS) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h.toString(36); })();

const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.7 2.3 13.6 12l-9.9 9.7c-.3-.3-.5-.8-.5-1.4V3.7c0-.6.2-1.1.5-1.4z"/><path opacity=".78" d="M3.7 2.3c.4-.4 1.1-.5 1.8-.1L17 8.8 13.6 12z"/><path opacity=".58" d="M3.7 21.7 13.6 12l3.4 3.2-11.5 6.6c-.7.4-1.4.3-1.8-.1z"/><path opacity=".88" d="m17 8.8 3.5 2c1.1.6 1.1 1.8 0 2.4l-3.5 2-3.4-3.2z"/></svg>`;
const WEB_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>`;
const STERN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M12 2.5l2.4 6.6L21 11.5l-6.6 2.4L12 20.5l-2.4-6.6L3 11.5l6.6-2.4z"/><circle cx="18.5" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r=".8" fill="currentColor" stroke="none"/></svg>`;

const KOPF_SCRIPT = `<script>
  (function(){var h=document.documentElement,ua=navigator.userAgent||"";h.classList.add("js");
    var ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
    h.classList.add(ios?"is-ios":/Android/i.test(ua)?"is-android":"is-desktop");})();
</script>`;

function kopf(l, o) {
  const alt = LANGS.filter((x) => x !== l).map((x) => `<meta property="og:locale:alternate" content="${LOC[x]}" />`).join("\n");
  return `<!DOCTYPE html>
<html lang="${l}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}" />
<meta name="theme-color" content="#0b0713" />
<meta name="color-scheme" content="dark" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${url(o.pfad)}" />
${hreflang(o.versionen)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:type" content="${o.ogTyp || "website"}" />
<meta property="og:site_name" content="Soraya" />
<meta property="og:url" content="${url(o.pfad)}" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.desc)}" />
<meta property="og:locale" content="${LOC[l]}" />
${alt}
<meta property="og:image" content="${OG_BILD}" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Soraya – Luxury Astro Guide" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(o.title)}" />
<meta name="twitter:description" content="${esc(o.desc)}" />
<meta name="twitter:image" content="${OG_BILD}" />
<script type="application/ld+json">${ldJson(o.ld)}</script>
${KOPF_SCRIPT}
<link rel="preload" href="/fonts/soraya-zeichen.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/cormorant.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${CSS_DATEI}?v=${CSS_VERSION}" />
</head>
<body>
`;
}

function sprachLinks(l, ziele) {
  return `<nav class="langs" aria-label="Sprache · Language · Nyelv · Lingua">` + LANGS.map((x) =>
    `<a href="${ziele[x]}" data-lang="${x}" lang="${x}"${x === l ? ' class="active" aria-current="true"' : ""}>${x.toUpperCase()}</a>`).join("") + `</nav>`;
}

function navLeiste(l, ziele, app) {
  return `<div class="nav">
  <a class="mark" href="${HOME[l]}" aria-label="Soraya"><img src="/brand/zeichen.svg" alt="" width="26" height="25"><span class="name">SORAYA</span></a>
  <div class="nav-rechts">
    ${sprachLinks(l, ziele)}
    <a class="to-app nur-andere" href="${app}">${tx(l, "sticky")}</a>
    <a class="to-app nur-android" href="${playUrl(l)}">${tx(l, "sticky")}</a>
  </div>
</div>`;
}

function krumen(l, teile) {
  const items = teile.map(([name, pfad], i) => {
    const letzt = i === teile.length - 1;
    return letzt ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${pfad}">${esc(name)}</a></li>`;
  }).join("");
  return `<nav class="krumen" aria-label="${esc(UI[l].pfad)}"><ol>${items}</ol></nav>`;
}
function krumenLd(teile) {
  return { "@type": "BreadcrumbList", itemListElement: teile.map(([name, pfad], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(pfad) })) };
}

function aufruf(l, text, app) {
  return `<section class="cta" id="download" aria-labelledby="ctaTitel">
  <img src="/brand/zeichen.svg" alt="" width="64" height="61" loading="lazy">
  <h2 id="ctaTitel">${esc(UI[l].ctaTitel)}</h2>
  <p>${esc(text)}</p>
  <div class="stores">
    <a class="store-btn" href="${playUrl(l)}" aria-label="${esc(tx(l, "store.play.aria"))}">${PLAY_SVG}<span class="st-txt"><span class="st-small">${tx(l, "store.play.small")}</span><span class="st-big">Google Play</span></span></a>
    <a class="store-btn ios-btn" href="${app}" aria-label="${esc(tx(l, "store.ios.aria"))}">${WEB_SVG}<span class="st-txt"><span class="st-small"><span class="fuer-ios">${tx(l, "store.ios.small")}</span><span class="fuer-desk">${tx(l, "store.web.small")}</span></span><span class="st-big">${tx(l, "store.ios.big")}</span></span></a>
  </div>
  <p class="ios-hint">${tx(l, "ios.hint")}</p>
  <p class="alt-link fuer-android">${tx(l, "alt.ios")}</p>
  <p class="alt-link fuer-ios">${tx(l, "alt.android")}</p>
  <ul class="vertrauen"><li>${tx(l, "trust.1")}</li><li>${tx(l, "w.2h")}</li><li>${tx(l, "trust.3")}</li></ul>
</section>`;
}

function fuss(l, ziele, app) {
  const home = HOME[l] === "/" ? "/" : HOME[l];
  const anker = (a) => (home === "/" ? "/#" : home + "#") + a;
  const recht = (x) => APP + x + (l === "de" ? "" : "-" + l);
  return `<div class="sticky-cta" id="stickyCta" aria-hidden="true">
  <a class="nur-andere" href="${app}">${tx(l, "sticky")}</a>
  <a class="nur-android" href="${playUrl(l)}">${tx(l, "sticky")}</a>
</div>
<footer>
  <div class="wrap foot">
    <div class="f-marke">
      <a class="name" href="${home}"><img src="/brand/zeichen.svg" alt="" width="22" height="21" loading="lazy">SORAYA</a>
      <p>${tx(l, "hero.sub")}</p>
    </div>
    <div>
      <h3>${tx(l, "foot.entdecken")}</h3>
      <div class="f-links">
        <a href="${anker("probieren")}">${tx(l, "foot.try")}</a>
        <a href="${anker("features")}">${tx(l, "foot.feat")}</a>
        ${hubDa(l) ? `<a href="${HUB[l]}">${tx(l, "foot.zeichen")}</a>` : ""}
        <a href="${anker("faq")}">${tx(l, "foot.faq")}</a>
        <a class="nur-andere" href="${app}">${tx(l, "foot.app")}</a>
        <a class="nur-android" href="${playUrl(l)}">${tx(l, "foot.app")}</a>
      </div>
    </div>
    <div>
      <h3>${tx(l, "foot.lang")}</h3>
      ${sprachLinks(l, ziele)}
      <div class="f-recht">
        <a href="${recht("impressum")}" data-legal="impressum">${tx(l, "foot.imprint")}</a>
        <a href="${recht("datenschutz")}" data-legal="datenschutz">${tx(l, "foot.privacy")}</a>
        <a href="${recht("nutzungsbedingungen")}" data-legal="nutzungsbedingungen">${tx(l, "foot.terms")}</a>
      </div>
    </div>
    <div class="f-unten">
      <span class="copy">© 2026 Soraya · Luxury Astro Guide</span>
      <span class="powered">${STERN_SVG}Powered by <strong>Attila</strong></span>
    </div>
  </div>
</footer>
`;
}

// kleines Script: Besuch zaehlen (wie die Startseite mit ?q=), Sprachwahl, Tageshoroskop, Handy-Leiste
const SEITEN_JS = `(function(C){
  var q = ""; try { q = (new URLSearchParams(location.search).get("q") || "").trim().toLowerCase(); } catch (e) {}
  if (!/^[a-z0-9-]{2,32}$/.test(q)) q = C.q;
  function zaehle(kind){ try { fetch(C.engine + "/public/event", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({kind: kind, q: q}), keepalive: true}).catch(function(){}); } catch (e) {} }
  var schon = false; try { schon = sessionStorage.getItem("soraya_besuch_" + q) === "1"; sessionStorage.setItem("soraya_besuch_" + q, "1"); } catch (e) {}
  if (!schon) zaehle("besuch");
  document.querySelectorAll('a[href^="https://app.sorayaluxuryastroguide.com/"]:not([data-legal])').forEach(function(a){
    try { var u = new URL(a.href); u.searchParams.set("q", q); u.searchParams.set("qs", "1"); a.href = u.toString(); } catch (e) {}
  });
  document.querySelectorAll('a[href*="play.google.com"]').forEach(function(a){ a.addEventListener("click", function(){ zaehle("store_klick"); }); });
  document.querySelectorAll(".langs a").forEach(function(a){
    var ziel = a.getAttribute("data-lang");
    try { var u = new URL(a.getAttribute("href"), location.href); new URLSearchParams(location.search).forEach(function(v, k){ if (k !== "lang") u.searchParams.set(k, v); }); a.href = u.pathname + u.search; } catch (e) {}
    a.addEventListener("click", function(){ try { localStorage.setItem("soraya_lang", ziel); } catch (e) {} });
  });
  function esc(t){ return String(t == null ? "" : t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  var box = document.getElementById("horo");
  function laden(){
    if (!box || !window.fetch) return;
    box.innerHTML = '<p class="laedt"><span>' + esc(C.t.laedt) + "</span></p>";
    var ctl = window.AbortController ? new AbortController() : null, aus = setTimeout(function(){ if (ctl) ctl.abort(); }, 15000);
    fetch(C.engine + "/public/sign-horoscope?sign=" + C.sign + "&lang=" + C.lang, ctl ? {signal: ctl.signal} : {}).then(function(r){ if (r.status === 429) { var le = new Error("limit"); le.limit = true; throw le; } return r.json(); }).then(function(res){
      clearTimeout(aus);
      var h = res && res.ok && res.data; if (!h || !h.text) throw new Error("leer");
      var tag = ""; try { tag = new Intl.DateTimeFormat(C.locale, {weekday: "long", day: "numeric", month: "long"}).format(new Date()); } catch (e) {}
      box.innerHTML = '<span class="horo-datum">' + esc(C.t.heute) + (tag ? " · " + esc(tag) : "") + "</span>" + (h.stimmung ? "<h3>" + esc(h.stimmung) + "</h3>" : "") +
        "<p>" + esc(h.text) + "</p>" + (h.tipp ? '<p class="tipp"><b>' + esc(C.t.tipp) + ":</b> " + esc(h.tipp) + "</p>" : "");
    }).catch(function(e){
      clearTimeout(aus);
      // Tageslimit: freundlicher Hinweis, kein "Nochmal" (morgen geht es weiter)
      if (e && e.limit) { box.innerHTML = '<p class="fehler limit" role="status"><span>' + esc(C.t.limit) + "</span></p>"; return; }
      box.innerHTML = '<p class="fehler" role="alert"><span>' + esc(C.t.fehler) + '</span><button type="button" class="nochmal">' + esc(C.t.nochmal) + "</button></p>";
      box.querySelector(".nochmal").onclick = laden;
    });
  }
  if (C.sign) laden();
  var leiste = document.getElementById("stickyCta"), aus2 = [document.getElementById("download"), document.querySelector("footer")], sicht = {}, oben = true;
  if (leiste && "IntersectionObserver" in window) {
    function setze(){ var an = !oben && !sicht[0] && !sicht[1]; leiste.classList.toggle("zeigen", an); leiste.setAttribute("aria-hidden", an ? "false" : "true"); }
    aus2.forEach(function(el, i){ if (el) new IntersectionObserver(function(es){ sicht[i] = es[0].isIntersecting; setze(); }).observe(el); });
    window.addEventListener("scroll", function(){ var o = window.scrollY < 420; if (o !== oben) { oben = o; setze(); } }, {passive: true});
  }
})`;

function seitenScript(l, cfg) {
  const C = {
    lang: l, locale: INTL[l], engine: ENGINE, q: cfg.q, sign: cfg.sign || "",
    t: { laedt: nurText(tx(l, "js.laedt")), heute: nurText(tx(l, "js.heute")), tipp: nurText(tx(l, "js.tipp")), fehler: UI[l].fallback, nochmal: nurText(tx(l, "js.nochmal")), limit: nurText(tx(l, "js.limit")) },
  };
  return `<script>${SEITEN_JS}(${ldJson(C)});</script>\n</body>\n</html>\n`;
}

const orgLd = { "@type": "Organization", "@id": BASE + "/#org", name: "Soraya – Luxury Astro Guide", url: BASE + "/", logo: BASE + "/apple-touch-icon.png" };

// ---------------------------------------------------------------------------
// Sternzeichen-Seite
// ---------------------------------------------------------------------------
function zeichenSeite(l, i) {
  const d = INHALT[l][i], u = UI[l], pfad = zeichenPfad(l, i), q = "seo-" + SLUG[l][i], app = appUrl(l, q);
  const versionen = Object.fromEntries(LANGS.filter((x) => hat(x, i)).map((x) => [x, zeichenPfad(x, i)]));
  const ziele = Object.fromEntries(LANGS.map((x) => [x, hat(x, i) ? zeichenPfad(x, i) : hubDa(x) ? HUB[x] : HOME[x]]));
  const teile = [["Soraya", HOME[l]], [u.zeichen, HUB[l]], [d.name, pfad]];
  const absatz = (t) => String(t).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("\n");
  const passLink = (k, cls) => {
    const j = KEYS.indexOf(k); if (j < 0) return "";
    const innen = `<i aria-hidden="true">${glyph(j)}</i>${esc(NAMEN[l][j])}`;
    return hat(l, j) ? `<a class="pass ${cls}" href="${zeichenPfad(l, j)}">${innen}</a>` : `<span class="pass ${cls}">${innen}</span>`;
  };
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", "@id": url(pfad) + "#artikel", headline: d.h1, description: d.meta_description, inLanguage: l, url: url(pfad),
      mainEntityOfPage: { "@type": "WebPage", "@id": url(pfad), name: d.seo_title, inLanguage: l, isPartOf: { "@id": BASE + "/#website" } },
      image: OG_BILD, datePublished: ERSTMALS, dateModified: HEUTE, about: { "@type": "Thing", name: d.name },
      author: { "@id": BASE + "/#org" }, publisher: { "@id": BASE + "/#org" } },
    orgLd,
    krumenLd(teile),
    { "@type": "FAQPage", inLanguage: l, url: url(pfad), mainEntity: d.faq.map((f) => ({ "@type": "Question", name: f.frage, acceptedAnswer: { "@type": "Answer", text: f.antwort } })) },
  ] };
  const html = kopf(l, { title: d.seo_title, desc: d.meta_description, pfad, versionen, ogTyp: "article", ld }) +
`${navLeiste(l, ziele, app)}
<main class="wrap">
${krumen(l, teile)}
<header class="z-kopf">
  <div class="z-glyph" aria-hidden="true">${glyph(i)}</div>
  <span class="eyebrow linien">${esc(d.zeitraum)}</span>
  <h1>${esc(d.h1)}</h1>
  <p class="intro">${esc(d.intro)}</p>
</header>
<dl class="fakten">
  <div class="fakt"><dt>${esc(u.zeitraum)}</dt><dd>${esc(d.zeitraum)}</dd></div>
  <div class="fakt"><dt>${esc(u.element)}</dt><dd>${esc(d.element)}</dd></div>
  <div class="fakt"><dt>${esc(u.modalitaet)}</dt><dd>${esc(d.modalitaet)}</dd></div>
  <div class="fakt"><dt>${esc(u.herrscher)}</dt><dd>${esc(d.herrscher)}</dd></div>
  <div class="fakt"><dt>${esc(u.symbol)}</dt><dd><span class="sym" aria-hidden="true">${glyph(i)}</span><small>${esc(d.name)}</small></dd></div>
</dl>
<div class="lese">
<section class="karte horo-karte" id="heute" aria-labelledby="heuteTitel">
  <span class="eyebrow">${esc(u.heute)}</span>
  <h2 id="heuteTitel">${esc(u.heuteTitel.replace("{name}", d.name))}</h2>
  <div class="horo" id="horo" aria-live="polite"><p class="laedt"><span>${tx(l, "js.laedt")}</span></p></div>
  <noscript><style>#horo{display:none}</style><p>${esc(u.ohneJs)}</p></noscript>
  <a class="pille-link" href="${app}">${tx(l, "th.weiter")}</a>
</section>
<article class="text">
${d.abschnitte.map((a) => `<section id="${esc(a.id)}">\n<h2>${esc(a.titel)}</h2>\n${absatz(a.text)}\n</section>`).join("\n")}
</article>
<section aria-labelledby="swTitel">
  <h2 class="block-titel" id="swTitel">${esc(u.swTitel)}</h2>
  <div class="sw">
    <div class="karte"><h3>${esc(u.staerken)}</h3><ul>${d.staerken.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
    <div class="karte minus"><h3>${esc(u.schwaechen)}</h3><ul>${d.schwaechen.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>
  </div>
</section>
<section class="passung" aria-labelledby="passTitel">
  <h2 class="block-titel" id="passTitel">${esc(u.passungTitel)}</h2>
  ${absatz(d.passung_text)}
  <div class="pass-reihe"><span>${esc(u.passtGut)}</span>${d.passt_gut.map((k) => passLink(k, "gut")).join("")}</div>
  <div class="pass-reihe"><span>${esc(u.passtWeniger)}</span>${d.passt_weniger.map((k) => passLink(k, "weniger")).join("")}</div>
</section>
${aufruf(l, d.cta, app)}
<section class="faq" aria-labelledby="faqTitel">
  <h2 class="block-titel" id="faqTitel">${esc(u.faqTitel)}</h2>
  ${d.faq.map((f) => `<details><summary>${esc(f.frage)}</summary><p>${esc(f.antwort)}</p></details>`).join("\n  ")}
</section>
</div>
<section aria-labelledby="weitereTitel">
  <h2 class="block-titel" id="weitereTitel">${esc(u.weitere)}</h2>
  <div class="zk-grid">${zeichenKarten(l, i)}</div>
  ${hubDa(l) ? `<a class="pille-link hub-mond" href="${HUB[l]}">${tx(l, "zk.alle")}</a>` : ""}
</section>
</main>
${fuss(l, ziele, app)}${seitenScript(l, { q, sign: KEYS[i] })}`;
  return appLinksSetzen(html, l, q);
}

// ---------------------------------------------------------------------------
// Uebersicht (Hub)
// ---------------------------------------------------------------------------
function hubSeite(l) {
  const u = UI[l], pfad = HUB[l], q = "seo-zeichen", app = appUrl(l, q);
  const versionen = Object.fromEntries(LANGS.filter(hubDa).map((x) => [x, HUB[x]]));
  const ziele = Object.fromEntries(LANGS.map((x) => [x, hubDa(x) ? HUB[x] : HOME[x]]));
  const teile = [["Soraya", HOME[l]], [u.zeichen, pfad]];
  const karten = KEYS.map((k, i) => {
    const innen = `<span class="zk-sym" aria-hidden="true">${glyph(i)}</span><b>${esc(NAMEN[l][i])}</b><small>${zeitraumHtml(l, i)}</small><em>${esc(ELEMENTE[l][i % 4])}</em>`;
    return hat(l, i) ? `<a class="zk" href="${zeichenPfad(l, i)}">${innen}</a>` : `<span class="zk">${innen}</span>`;
  }).join("");
  const elemente = ELEMENTE[l].map((e, n) => `<div class="karte"><h3>${esc(e)}</h3><p>${esc(u.hubElementText[n])}</p>${[n, n + 4, n + 8].map((j) => {
    const innen = `<i aria-hidden="true">${glyph(j)}</i>${esc(NAMEN[l][j])}`;
    return hat(l, j) ? `<a class="pass" href="${zeichenPfad(l, j)}">${innen}</a>` : `<span class="pass">${innen}</span>`;
  }).join("")}</div>`).join("\n");
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": url(pfad), url: url(pfad), name: u.hubTitle, description: u.hubDesc, inLanguage: l, isPartOf: { "@id": BASE + "/#website" },
      mainEntity: { "@type": "ItemList", itemListElement: KEYS.map((k, i) => (hat(l, i) ? { "@type": "ListItem", position: i + 1, name: NAMEN[l][i], url: url(zeichenPfad(l, i)) } : null)).filter(Boolean) } },
    orgLd,
    krumenLd(teile),
  ] };
  const mondZiel = (HOME[l] === "/" ? "/" : HOME[l]) + "#probieren";
  const html = kopf(l, { title: u.hubTitle, desc: u.hubDesc, pfad, versionen, ld }) +
`${navLeiste(l, ziele, app)}
<main class="wrap">
${krumen(l, teile)}
<header class="z-kopf">
  <span class="eyebrow linien">${tx(l, "zk.eyebrow")}</span>
  <h1>${esc(u.hubH1)}</h1>
  <p class="intro">${esc(u.hubIntro)}</p>
</header>
<div class="zk-grid">${karten}</div>
<a class="pille-link hub-mond" href="${mondZiel}">${esc(u.hubMond)}</a>
<section aria-labelledby="elTitel">
  <h2 class="block-titel" id="elTitel">${esc(u.hubElemente)}</h2>
  <div class="elemente">
${elemente}
  </div>
</section>
<div class="lese">${aufruf(l, u.hubCta, app)}</div>
</main>
${fuss(l, ziele, app)}${seitenScript(l, { q })}`;
  return appLinksSetzen(html, l, q);
}

// alle App-Links (auch in uebernommenen Texten) mit Sprache und Link-Kennung
function appLinksSetzen(html, l, q) {
  return tagsBearbeiten(html, "a", (t) => {
    const h = attr(t, "href");
    if (h && h.startsWith(PLAY) && !/[?&](amp;)?hl=/.test(h)) return setzeAttr(t, "href", playUrl(l));
    if (!h || !h.startsWith(APP) || /\sdata-legal=/.test(t)) return t;
    const u = new URL(dekodiere(h));
    if (q) u.searchParams.set("q", q);
    u.searchParams.set("lang", l);
    return setzeAttr(t, "href", esc(u.toString()));
  });
}

// ---------------------------------------------------------------------------
// Startseite: Sternzeichen-Bereich, strukturierte Daten, Sprachfassungen
// ---------------------------------------------------------------------------
function zeichenBereich(html, l) {
  if (!html.includes("<!-- ZEICHEN:START -->")) throw new Error("Markierung <!-- ZEICHEN:START --> fehlt in index.html");
  html = html.replace(/<!-- ZEICHEN:START -->[\s\S]*?<!-- ZEICHEN:END -->/, () => "<!-- ZEICHEN:START -->" + zeichenKarten(l) + "<!-- ZEICHEN:END -->");
  html = html.replace(/(<script type="application\/json" id="zeichenSeiten">)[\s\S]*?(<\/script>)/, (_, a, b) => a + ldJson(ZEICHEN_DATEN) + b);
  return tagsBearbeiten(html, "a", (t) => {
    if (!/\sdata-zk-hub\b/.test(t)) return t;
    t = setzeAttr(t, "href", HUB[l]).replace(/\s+hidden(?=[\s>])/, "");
    return hubDa(l) ? t : t.replace(/>$/, " hidden>");
  });
}

function strukturDaten(html, l, kanon) {
  const m = html.match(/(<script type="application\/ld\+json" id="ldjson">)([\s\S]*?)(<\/script>)/);
  if (!m) throw new Error("#ldjson fehlt in index.html");
  const data = JSON.parse(m[2]);
  const desc = dekodiere(attr(html.match(/<meta name="description"[^>]*>/)[0], "content"));
  const faqTeil = html.slice(html.indexOf('<div class="faq'), html.indexOf("</section>", html.indexOf('<div class="faq')));
  const faq = [...faqTeil.matchAll(/<details>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/details>/g)]
    .map((f) => ({ "@type": "Question", name: nurText(f[1]), acceptedAnswer: { "@type": "Answer", text: nurText(f[2]) } }));
  for (const n of data["@graph"]) {
    if (n["@type"] === "WebSite") n.inLanguage = l;
    if (n["@type"] === "SoftwareApplication") n.description = desc;
  }
  data["@graph"] = data["@graph"].filter((n) => n["@type"] !== "FAQPage");
  if (faq.length) data["@graph"].push({ "@type": "FAQPage", inLanguage: l, url: kanon, mainEntity: faq });
  const json = "\n" + JSON.stringify(data, null, 1).replace(/</g, "\\u003c") + "\n";
  return html.replace(m[0], () => m[1] + json + m[3]);
}

function sprachMarke(html, l) {
  return tagsBearbeiten(html, "a", (t) => {
    const x = attr(t, "data-lang");
    if (!x) return t;
    t = t.replace(/\s+class="active"/, "").replace(/\s+aria-current="true"/, "");
    return x === l ? t.replace(/>$/, ' class="active" aria-current="true">') : t;
  });
}

function startseite(src, l) {
  const T = L[l];
  let h = src;
  // 1) Texte (wie das Script: innerHTML aus L, aria-label aus data-t-aria)
  h = innenErsetzen(h, /<([a-zA-Z0-9]+)\b[^>]*?\sdata-t="([^"]+)"[^>]*>/, (m) => {
    const v = T[m[2]];
    if (!v) warn(`Startseite ${l}: Uebersetzung fehlt fuer "${m[2]}"`);
    return v || null;
  });
  h = h.replace(/<[a-zA-Z][^>]*\sdata-t-aria="([^"]+)"[^>]*>/g, (t, k) => (T[k] ? setzeAttr(t, "aria-label", esc(T[k])) : t));
  h = h.replace(/(<b data-mock-sign="([A-Za-z]{3})">)[^<]*(<\/b>)/g, (_, a, k, b) => a + esc(NAMEN[l][KEYS.indexOf(k)] ?? k) + b);
  // 2) Kopf: Sprache, Titel, Beschreibung, Vorschau, kanonische Adresse
  h = h.replace(/<html lang="de">/, `<html lang="${l}" data-lang-fest="${l}">`);
  h = h.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(T.title)}</title>`);
  const meta = (re, v) => { h = h.replace(re, (t) => setzeAttr(t, "content", esc(v))); };
  meta(/<meta name="description"[^>]*>/, T["meta.desc"]);
  meta(/<meta property="og:title"[^>]*>/, T.title);
  meta(/<meta name="twitter:title"[^>]*>/, T.title);
  meta(/<meta property="og:description"[^>]*>/, T["og.desc"]);
  meta(/<meta name="twitter:description"[^>]*>/, T["og.desc"]);
  meta(/<meta property="og:locale"[^>]*>/, LOC[l]);
  const rest = LANGS.filter((x) => x !== l);
  let n = 0;
  h = h.replace(/<meta property="og:locale:alternate"[^>]*>/g, (t) => setzeAttr(t, "content", LOC[rest[n++]] || ""));
  const kanon = url(HOME[l]);
  h = h.replace(/<link rel="canonical"[^>]*>/, (t) => setzeAttr(t, "href", kanon));
  meta(/<meta property="og:url"[^>]*>/, kanon);
  // 3) Links: Play Store in der Sprache, App mit ?lang=, Rechtstexte in der passenden Fassung
  h = tagsBearbeiten(h, "a", (t) => {
    const href = attr(t, "href"); if (!href) return t;
    const legal = attr(t, "data-legal");
    if (legal) return setzeAttr(t, "href", APP + legal + "-" + l);
    if (href.includes("play.google.com")) return setzeAttr(t, "href", href.split(/&(?:amp;)?hl=/)[0] + "&amp;hl=" + l);
    if (href.startsWith(APP)) { const u = new URL(dekodiere(href)); u.searchParams.set("lang", l); return setzeAttr(t, "href", esc(u.toString())); }
    return t;
  });
  // 4) Dateien absolut (die Seite liegt unter /en usw.)
  h = h.replace(/(\s(?:src|href|data-poster)=")(?=(?:fonts|brand)\/|favicon|apple-touch-icon|soraya-app\.mp4|soraya-poster\.jpg|og-bild)/g, "$1/")
    .replace(/url\("fonts\//g, 'url("/fonts/');
  h = sprachMarke(h, l);
  h = zeichenBereich(h, l);
  h = strukturDaten(h, l, kanon);
  return h;
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------
function sitemap(gruppen) {
  const z = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'];
  for (const v of gruppen) {
    const alt = LANGS.filter((l) => v[l]).map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(v[l])}"/>`);
    if (v.de) alt.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${url(v.de)}"/>`);
    for (const l of LANGS) if (v[l]) z.push("  <url>", `    <loc>${url(v[l])}</loc>`, `    <lastmod>${HEUTE}</lastmod>`, ...alt, "  </url>");
  }
  z.push("</urlset>", "");
  return z.join("\n");
}

// ---------------------------------------------------------------------------
// Los
// ---------------------------------------------------------------------------
const geschrieben = [], erwartet = new Set();
function ausgabe(pfadDatei, inhalt) { erwartet.add(pfadDatei); if (schreib(pfadDatei, inhalt)) geschrieben.push(pfadDatei); }

ausgabe(CSS_DATEI.slice(1), "/* erzeugt von tools/seiten.mjs – nicht von Hand aendern */\n" + CSS);
index = strukturDaten(sprachMarke(zeichenBereich(index, "de"), "de"), "de", BASE + "/");
ausgabe("index.html", index);
for (const l of ["en", "hu", "it"]) ausgabe(`${l}.html`, startseite(index, l));

const gruppen = [{ ...HOME }];
let anzahl = 0;
const hubs = {};
for (const l of LANGS) if (hubDa(l)) { ausgabe(datei(HUB[l]), hubSeite(l)); hubs[l] = HUB[l]; }
if (Object.keys(hubs).length) gruppen.push(hubs);
KEYS.forEach((k, i) => {
  const v = {};
  for (const l of LANGS) if (hat(l, i)) { ausgabe(datei(zeichenPfad(l, i)), zeichenSeite(l, i)); v[l] = zeichenPfad(l, i); anzahl++; }
  if (Object.keys(v).length) gruppen.push(v);
});
ausgabe("sitemap.xml", sitemap(gruppen));

// alte erzeugte Seiten entfernen, deren Inhalt es nicht mehr gibt (nur in den Sternzeichen-Ordnern)
for (const l of LANGS) {
  const ordner = HUB[l].slice(1), hub = ordner + ".html";
  if (!erwartet.has(hub) && existsSync(join(ROOT, hub))) { rmSync(join(ROOT, hub)); geschrieben.push(hub + " (entfernt)"); }
  if (!existsSync(join(ROOT, ordner))) continue;
  for (const f of readdirSync(join(ROOT, ordner))) {
    const p = ordner + "/" + f;
    if (f.endsWith(".html") && !erwartet.has(p)) { rmSync(join(ROOT, p)); geschrieben.push(p + " (entfernt)"); }
  }
}

for (const w of [...new Set(warnungen)]) console.warn("Warnung:", w);
console.log(`Fertig: ${anzahl} Sternzeichen-Seiten, ${Object.keys(hubs).length} Uebersichten, 4 Startseiten. Geaendert: ${geschrieben.length} Datei(en).`);
