// Procedural geometry for "shade a fraction of the shape" interactive
// questions. Given a denominator, produce N equal-area clickable regions as
// SVG path strings. No content authoring / LLM needed — pure math.

export type ShapeKind = "hexagon" | "circle" | "bar" | "grid" | "triangle";

export interface ShapeSpec {
  kind: ShapeKind;
  denominator: number;
  viewBox: string;
  // one SVG path "d" per equal part, in reading order
  regions: string[];
}

export interface ShapeOpts {
  // grid only: rows × cols must equal the denominator
  rows?: number;
  cols?: number;
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

// Rectangle split into rows × cols equal cells, reading order (left→right,
// top→bottom). The workhorse for hundredths (10×10) and general area models.
function gridCells(rows: number, cols: number, w: number, h: number): string[] {
  const regions: string[] = [];
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw;
      const y = r * ch;
      regions.push(`M ${F(x)} ${F(y)} H ${F(x + cw)} V ${F(y + ch)} H ${F(x)} Z`);
    }
  }
  return regions;
}

// Equilateral triangle subdivided into k² congruent small triangles
// (denominator must be a perfect square: 4, 9, 16…). Row i holds 2i+1 parts,
// alternating up/down-pointing.
function triangleParts(d: number, cx: number, topY: number, side: number): string[] {
  const k = Math.round(Math.sqrt(d));
  const u = side / k; // small-triangle side
  const rowH = (u * Math.sqrt(3)) / 2;
  const regions: string[] = [];
  for (let i = 0; i < k; i++) {
    const yT = topY + i * rowH;
    const yB = topY + (i + 1) * rowH;
    const xTop = cx - (i * u) / 2; // leftmost vertex on the row's top edge
    const xBot = cx - ((i + 1) * u) / 2; // leftmost vertex on the bottom edge
    // upward-pointing triangles (i+1 of them)
    for (let t = 0; t <= i; t++) {
      regions.push(
        `M ${F(xTop + t * u)} ${F(yT)} L ${F(xBot + t * u)} ${F(yB)} L ${F(xBot + (t + 1) * u)} ${F(yB)} Z`
      );
    }
    // downward-pointing triangles (i of them)
    for (let t = 0; t < i; t++) {
      regions.push(
        `M ${F(xTop + t * u)} ${F(yT)} L ${F(xTop + (t + 1) * u)} ${F(yT)} L ${F(xBot + (t + 1) * u)} ${F(yB)} Z`
      );
    }
  }
  return regions;
}

export function makeShape(
  kind: ShapeKind,
  denominator: number,
  opts: ShapeOpts = {}
): ShapeSpec {
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
  if (kind === "grid") {
    const rows = opts.rows ?? Math.max(1, Math.round(Math.sqrt(denominator)));
    const cols = opts.cols ?? Math.ceil(denominator / rows);
    const w = 360;
    const h = Math.max(90, (360 * rows) / cols);
    return {
      kind,
      denominator: rows * cols,
      viewBox: `0 0 ${w} ${Math.round(h)}`,
      regions: gridCells(rows, cols, w, h),
    };
  }
  if (kind === "triangle") {
    // side 300, height ≈ 260
    return {
      kind,
      denominator,
      viewBox: "0 0 320 285",
      regions: triangleParts(denominator, 160, 10, 300),
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
