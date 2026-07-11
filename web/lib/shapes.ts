// Procedural geometry for "shade a fraction of the shape" interactive
// questions. Given a denominator, produce N equal-area clickable regions as
// SVG path strings. No content authoring / LLM needed — pure math.

export type ShapeKind = "hexagon" | "circle" | "bar";

export interface ShapeSpec {
  kind: ShapeKind;
  denominator: number;
  viewBox: string;
  // one SVG path "d" per equal part, in reading order
  regions: string[];
}

const F = (n: number) => n.toFixed(2);

// Regular hexagon split into 6 triangles, each trisected → 18 equal thin
// triangles radiating from the center (matches the classic 3/18 manipulative).
function hexagon18(cx: number, cy: number, R: number): string[] {
  const V: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3; // flat-ish; left & right points
    V.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
  }
  const regions: string[] = [];
  for (let i = 0; i < 6; i++) {
    const A = V[i];
    const B = V[(i + 1) % 6];
    const pts: [number, number][] = [
      A,
      [A[0] + (B[0] - A[0]) / 3, A[1] + (B[1] - A[1]) / 3],
      [A[0] + (2 * (B[0] - A[0])) / 3, A[1] + (2 * (B[1] - A[1])) / 3],
      B,
    ];
    for (let j = 0; j < 3; j++) {
      const p = pts[j];
      const q = pts[j + 1];
      regions.push(`M ${F(cx)} ${F(cy)} L ${F(p[0])} ${F(p[1])} L ${F(q[0])} ${F(q[1])} Z`);
    }
  }
  return regions;
}

// Circle split into `d` equal pie sectors, starting at the top.
function circleSectors(d: number, cx: number, cy: number, r: number): string[] {
  const regions: string[] = [];
  for (let k = 0; k < d; k++) {
    const a0 = -Math.PI / 2 + (k * 2 * Math.PI) / d;
    const a1 = -Math.PI / 2 + ((k + 1) * 2 * Math.PI) / d;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    regions.push(
      `M ${F(cx)} ${F(cy)} L ${F(x0)} ${F(y0)} A ${F(r)} ${F(r)} 0 ${large} 1 ${F(x1)} ${F(y1)} Z`
    );
  }
  return regions;
}

// Horizontal bar split into `d` equal columns.
function barParts(d: number, w: number, h: number): string[] {
  const regions: string[] = [];
  const cw = w / d;
  for (let k = 0; k < d; k++) {
    const x = k * cw;
    regions.push(`M ${F(x)} 0 H ${F(x + cw)} V ${F(h)} H ${F(x)} Z`);
  }
  return regions;
}

export function makeShape(kind: ShapeKind, denominator: number): ShapeSpec {
  if (kind === "hexagon") {
    // hexagon geometry is fixed at 18 parts
    return {
      kind,
      denominator: 18,
      viewBox: "0 0 300 300",
      regions: hexagon18(150, 150, 135),
    };
  }
  if (kind === "circle") {
    return {
      kind,
      denominator,
      viewBox: "0 0 300 300",
      regions: circleSectors(denominator, 150, 150, 135),
    };
  }
  // bar
  return {
    kind,
    denominator,
    viewBox: "0 0 360 120",
    regions: barParts(denominator, 360, 120),
  };
}
