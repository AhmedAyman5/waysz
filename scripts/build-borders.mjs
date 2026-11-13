/**
 * Country borders for the "Explore the world" globe (Immigration page).
 * Source: Natural Earth 5.1.1 — Admin 0 Countries, EGYPT point of view (public domain):
 *   https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries_egy.zip
 *   unzip into media-inbox/14-borders/ne10/
 * Run (mapshaper is a one-off tool, NOT a project dependency):
 *   npm i --prefix <any temp folder> mapshaper
 *   MAPSHAPER=<temp folder>/node_modules/.bin/mapshaper node scripts/build-borders.mjs
 * Writes:
 *   public/media/geo/world-egy.topo.json   simplified TopoJSON, lazy-loaded by the globe (id = ISO 3166-1 alpha-2)
 *   src/data/countries.json                the selectable countries: [id, labelLon, labelLat]
 * Rules: features are merged by ISO code (e.g. Clipperton → FR); Bir Tawil is merged into Sudan (22nd parallel);
 * areas without an ISO code (military bases, reefs) are dropped; Egypt (the origin) and Antarctica are drawn but cannot be selected.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const bin = process.env.MAPSHAPER ?? 'mapshaper';
const src = 'media-inbox/14-borders/ne10/ne_10m_admin_0_countries_egy.shp';
const tmp = join(tmpdir(), `waysz-borders-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const run = (...args) => execFileSync(bin, args, { stdio: ['ignore', 'inherit', 'inherit'] });

// 1 · fields, merge by ISO code, simplify
run(src,
  // Bir Tawil lies south of the 22nd parallel, Egypt's official border line → drawn with Sudan
  '-each', 'if (ADMIN === "Bir Tawil") ISO_A2_EH = "SD"',
  '-filter', 'ISO_A2_EH !== "-99"',
  '-each', 'id = ISO_A2_EH, lx = LABEL_X, ly = LABEL_Y, area = this.area',
  '-sort', 'area', 'descending',
  '-dissolve', 'id', 'copy-fields=lx,ly',
  '-simplify', 'weighted', process.env.DETAIL ?? '10%', 'keep-shapes',
  '-clean',
  '-o', 'format=geojson', 'precision=0.001', join(tmp, 'a.json'));

// 2 · drop the tiny islands of big countries, but always keep each country's largest pieces
const fc = JSON.parse(readFileSync(join(tmp, 'a.json'), 'utf8'));
const ringArea = (ring) => {                               // rough km² (equirectangular), enough to rank rings
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return Math.abs(a / 2) * 111.3 * 111.3 * Math.cos((lat * Math.PI) / 180);
};
const MIN_KM2 = 900;
let dropped = 0;
for (const f of fc.features) {
  if (!f.geometry) continue;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const ranked = polys.map((p) => ({ p, a: ringArea(p[0]) })).sort((x, y) => y.a - x.a);
  const kept = ranked.filter((r, i) => i < 2 || r.a >= MIN_KM2);
  dropped += ranked.length - kept.length;
  f.geometry = { type: 'MultiPolygon', coordinates: kept.map((r) => r.p) };
}
fc.features = fc.features.filter((f) => f.geometry);
writeFileSync(join(tmp, 'b.json'), JSON.stringify(fc));
console.log(`rings dropped: ${dropped} · features: ${fc.features.length}`);

// 3 · topology (shared borders are stored once), quantized
mkdirSync('public/media/geo', { recursive: true });
run(join(tmp, 'b.json'), '-rename-layers', 'countries', '-o', 'format=topojson', 'quantization=20000', 'public/media/geo/world-egy.topo.json');

// 3b · contested areas must still fall where the source (Egypt's point of view) puts them after simplifying
{
  const pip = (p, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i], b = r[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };
  const find = (p) => {
    for (const f of fc.features) for (const poly of f.geometry.coordinates) {
      if (pip(p, poly[0]) && !poly.slice(1).some((h) => pip(p, h))) return f.properties.id;
    }
    return null;
  };
  const EXPECT = {
    'Gaza city': [34.45, 31.5, 'PS'], 'Khan Younis': [34.3, 31.34, 'PS'], Ramallah: [35.2, 31.9, 'PS'], 'East Jerusalem': [35.24, 31.78, 'PS'],
    'Tel Aviv': [34.78, 32.08, 'IL'], Halayeb: [36.2, 22.3, 'EG'], 'Bir Tawil': [33.7, 21.87, 'SD'], Taipei: [121.5, 25.0, 'CN'],
    'Northern Cyprus': [33.3, 35.3, 'CY'], Hargeisa: [44.06, 9.56, 'SO'], Laayoune: [-13.2, 27.15, 'EH'], Pristina: [21.16, 42.66, 'XK'],
    Simferopol: [34.1, 44.95, 'UA'], Srinagar: [74.8, 34.08, 'IN'], Muzaffarabad: [73.47, 34.36, 'PK'], 'Aksai Chin': [79.5, 35.2, 'CN'],
    'Golan Heights': [35.75, 33.0, 'SY'], Sukhumi: [41.0, 43.0, 'GE'], Stepanakert: [46.75, 39.82, 'AZ'], Tiraspol: [29.6, 46.84, 'MD'],
  };
  const wrong = Object.entries(EXPECT).filter(([, [x, y, id]]) => find([x, y]) !== id).map(([k, [x, y, id]]) => `${k}: ${find([x, y])} ≠ ${id}`);
  if (wrong.length) { console.error('CONTESTED AREAS MOVED — raise DETAIL:\n' + wrong.join('\n')); process.exit(1); }
  console.log(`contested-area checks passed: ${Object.keys(EXPECT).length}`);
}

// 4 · list of selectable countries for the page (names come from Intl.DisplayNames at build time)
const SKIP = new Set(['EG', 'AQ']);
const list = fc.features
  .filter((f) => !SKIP.has(f.properties.id))
  .map((f) => [f.properties.id, +f.properties.lx.toFixed(2), +f.properties.ly.toFixed(2)])
  .sort((a, b) => a[0].localeCompare(b[0]));
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/countries.json', JSON.stringify(list));
console.log(`selectable countries: ${list.length}`);
rmSync(tmp, { recursive: true, force: true });
