/**
 * Country borders for the "Explore the world" globe — Natural Earth 5.1.1, Egypt point of view (public domain),
 * built by scripts/build-borders.mjs into /media/geo/world-egy.topo.json (TopoJSON, id = ISO 3166-1 alpha-2).
 * This module decodes that file (no dependency) and answers "which country is at this lon/lat?".
 * No three.js here: the DOM scene and the WebGL act both use it.
 */
export type Ring = Float32Array;                       // lon, lat, lon, lat, … (degrees)
export interface Country {
  id: string;
  label: [number, number];                             // lon, lat of the label point (where the plane lands)
  polys: Ring[][];                                     // polygons → rings (first = outline, rest = holes)
  bbox: [number, number, number, number];              // minLon, minLat, maxLon, maxLat
  span: number;                                        // largest side of the main polygon's bbox, in degrees
}
export interface Borders {
  countries: Country[];
  byId: Map<string, Country>;
  lines: Ring[];                                       // every border / coast segment exactly once
}

interface Topo {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: { countries: { geometries: { type: 'Polygon' | 'MultiPolygon'; arcs: number[][] | number[][][]; properties: { id: string; lx: number; ly: number } }[] } };
}

let pending: Promise<Borders> | null = null;

export function loadBorders(url = '/media/geo/world-egy.topo.json'): Promise<Borders> {
  pending ??= fetch(url).then((r) => {
    if (!r.ok) throw new Error(`borders: ${r.status}`);
    return r.json() as Promise<Topo>;
  }).then(decode);
  pending.catch(() => { pending = null; });
  return pending;
}

function decode(topo: Topo): Borders {
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const lines = topo.arcs.map((arc) => {
    const out = new Float32Array(arc.length * 2);
    let x = 0, y = 0;
    arc.forEach(([dx, dy], i) => { out[i * 2] = (x += dx) * sx + tx; out[i * 2 + 1] = (y += dy) * sy + ty; });
    return out;
  });
  const ring = (refs: number[]): Ring => {
    const pts: number[] = [];
    for (const ref of refs) {
      const arc = lines[ref < 0 ? ~ref : ref];
      const n = arc.length / 2;
      for (let k = pts.length ? 1 : 0; k < n; k++) {         // arcs share their end points: skip the repeat
        const i = ref < 0 ? n - 1 - k : k;
        pts.push(arc[i * 2], arc[i * 2 + 1]);
      }
    }
    return Float32Array.from(pts);
  };
  const countries = topo.objects.countries.geometries.map((g): Country => {
    const polys = (g.type === 'Polygon' ? [g.arcs as number[][]] : (g.arcs as number[][][])).map((p) => p.map(ring));
    const bbox: Country['bbox'] = [180, 90, -180, -90];
    let span = 0;
    for (const [outer] of polys) {
      let a = 180, b = 90, c = -180, d = -90;
      for (let i = 0; i < outer.length; i += 2) {
        a = Math.min(a, outer[i]); c = Math.max(c, outer[i]);
        b = Math.min(b, outer[i + 1]); d = Math.max(d, outer[i + 1]);
      }
      span = Math.max(span, Math.max(c - a, d - b));
      bbox[0] = Math.min(bbox[0], a); bbox[1] = Math.min(bbox[1], b);
      bbox[2] = Math.max(bbox[2], c); bbox[3] = Math.max(bbox[3], d);
    }
    return { id: g.properties.id, label: [g.properties.lx, g.properties.ly], polys, bbox, span };
  });
  return { countries, byId: new Map(countries.map((c) => [c.id, c])), lines };
}

const inRing = (lon: number, lat: number, r: Ring) => {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const yi = r[i + 1], yj = r[j + 1];
    if ((yi > lat) !== (yj > lat) && lon < ((r[j] - r[i]) * (lat - yi)) / (yj - yi) + r[i]) inside = !inside;
  }
  return inside;
};

/**
 * The country at a point, or null (sea, or an area the dataset leaves unassigned).
 * Very small countries are hard to hit: when the point is in the sea, the nearest small one within `reach`
 * degrees wins, so islands and city-states can still be picked.
 */
export function countryAt(b: Borders, lon: number, lat: number, reach = 1.2): Country | null {
  for (const c of b.countries) {
    if (lon < c.bbox[0] || lon > c.bbox[2] || lat < c.bbox[1] || lat > c.bbox[3]) continue;
    for (const poly of c.polys) {
      if (!inRing(lon, lat, poly[0])) continue;
      if (!poly.slice(1).some((hole) => inRing(lon, lat, hole))) return c;
    }
  }
  let best: Country | null = null, bestD = reach * reach;
  const k = Math.cos((lat * Math.PI) / 180);
  for (const c of b.countries) {
    if (c.span > 3) continue;
    const dx = (c.label[0] - lon) * k, dy = c.label[1] - lat;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
