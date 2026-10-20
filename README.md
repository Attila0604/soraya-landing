# soraya-landing

Statische Seiten fuer Google neu erzeugen (nach jeder Text-Aenderung in `index.html` oder in `inhalte/zeichen/`):

    node tools/seiten.mjs

Erzeugt `en.html`, `hu.html`, `it.html`, die Sternzeichen-Seiten (`sternzeichen/`, `en/zodiac/`, `hu/csillagjegyek/`,
`it/segni-zodiacali/` + Uebersichten), `zeichen.css` und `sitemap.xml`. Diese Dateien nicht von Hand aendern.
