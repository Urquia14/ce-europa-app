// Vercel Serverless Function: /api/preferente?url=<url-jugador-lapreferente>
// Fetches a player page on lapreferente.com server-side (no CORS) and returns
// the "Trayectoria como Jugador / Historial Deportivo" table parsed as JSON.

import * as cheerio from 'cheerio';

const REQ_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7',
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = (req.query?.url || '').toString().trim();
  // Accept only la preferente URLs (defensive)
  if (!/^https?:\/\/(www\.)?lapreferente\.com\//i.test(url)) {
    return res
      .status(400)
      .json({ error: "URL no vàlida. Ha de ser de lapreferente.com." });
  }

  try {
    const r = await fetch(url, { headers: REQ_HEADERS, redirect: 'follow' });
    if (!r.ok) {
      return res
        .status(502)
        .json({ error: `La Preferente ha respost ${r.status} ${r.statusText}` });
    }
    const html = await r.text();
    const data = parsePreferente(html, url);
    return res.status(200).json(data);
  } catch (e) {
    return res
      .status(500)
      .json({ error: (e && e.message) || 'Error desconegut' });
  }
}

function txt($, el) {
  return $(el).text().replace(/\s+/g, ' ').trim();
}

function parsePreferente(html, sourceUrl) {
  const $ = cheerio.load(html);
  const out = {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    name: null,
    image: null,
    trajectoria: [],
    totals: null,
  };

  // --- player name (best-effort) ---
  out.name =
    txt($, $('h1').first()) ||
    txt($, $('h2').first()) ||
    (($('title').first().text() || '').split(/[—|·\-]/)[0] || '').trim() ||
    null;

  // --- player image (best-effort) ---
  const candidateImg = $('img')
    .filter((_, el) => {
      const src = ($(el).attr('src') || '').toLowerCase();
      const alt = ($(el).attr('alt') || '').toLowerCase();
      return (
        /jugador|player|foto|perfil/.test(src) ||
        /jugador|player|foto|perfil/.test(alt)
      );
    })
    .first();
  if (candidateImg.length) {
    let src = candidateImg.attr('src') || '';
    if (src.startsWith('/')) src = 'https://www.lapreferente.com' + src;
    out.image = src || null;
  }

  // --- find the trayectoria table by inspecting all tables' headers ---
  // Score each table on how many of these keywords appear in its first row.
  const KEYWORDS = ['TEMPORADA', 'EQUIPO', 'MIN', 'GOL', 'PJ'];
  let bestTable = null;
  let bestScore = 0;
  let bestHeaders = [];

  $('table').each((_, table) => {
    const cells = $(table)
      .find('tr')
      .first()
      .find('th, td')
      .map((__, c) => txt($, c).toUpperCase())
      .get();
    if (!cells.length) return;
    const score = KEYWORDS.reduce(
      (s, k) => s + (cells.some((h) => h === k || h.includes(k)) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      bestTable = table;
      bestHeaders = cells;
    }
  });

  if (!bestTable || bestScore < 2) {
    // Couldn't find a recognizable table — return what we have.
    return out;
  }

  // Map header names -> column indices (some may be missing on certain pages)
  const COLS = {
    temporada: ['TEMPORADA'],
    pos: ['POS.', 'POS'],
    equipo: ['EQUIPO'],
    rol: ['ROL'],
    pc: ['PC'],
    pj: ['PJ'],
    pt: ['PT'],
    min: ['MIN'],
    gol: ['GOL'],
    ta: ['TA'],
    tr: ['TR'],
    g: ['G'],
    e: ['E'],
    p: ['P'],
  };
  const idx = {};
  for (const [key, aliases] of Object.entries(COLS)) {
    idx[key] = bestHeaders.findIndex((h) => aliases.includes(h));
  }

  // Walk the data rows (skip the header)
  $(bestTable)
    .find('tr')
    .slice(1)
    .each((_, row) => {
      const cells = $(row)
        .find('td, th')
        .map((__, c) => txt($, c))
        .get();
      if (!cells.length) return;
      const obj = {};
      for (const key of Object.keys(COLS)) {
        const j = idx[key];
        obj[key] = j !== -1 && j < cells.length ? cells[j] : '';
      }
      const joined = cells.join(' ').toUpperCase();
      if (/\bTOTAL(ES|S)?\b/.test(joined) && !obj.temporada && !obj.equipo) {
        out.totals = obj;
      } else if (obj.temporada || obj.equipo) {
        out.trajectoria.push(obj);
      } else if (/\bTOTAL/.test(joined)) {
        out.totals = obj;
      }
    });

  return out;
}
