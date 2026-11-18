// Nyxen: perantara (proxy) ke API Clanker dengan cache di Vercel.
const ALLOWED = /^\/tokens(\/trending|\/ohlcv|\/0x[0-9a-fA-F]{40}\/(market|trades))?$/;

function cacheFor(path) {
  if (path.endsWith('/trades')) return 10;
  if (path.endsWith('/market')) return 15;
  if (path === '/tokens/ohlcv') return 30;
  return 20;
}

module.exports = async function handler(req, res) {
  const q = Object.assign({}, req.query || {});
  const path = String(q.path || '');
  delete q.path;
  if (!ALLOWED.test(path)) {
    res.status(400).json({ error: 'path not allowed' });
    return;
  }
  const qs = new URLSearchParams(q).toString();
  const url = 'https://www.clanker.world/api' + path + (qs ? '?' + qs : '');
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'nyxenpad.xyz' } });
    const body = await r.text();
    const ttl = cacheFor(path);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', r.ok
      ? `public, s-maxage=${ttl}, stale-while-revalidate=300`
      : 'public, s-maxage=5');
    res.status(r.status).send(body);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: 'Clanker could not be reached' });
  }
};
