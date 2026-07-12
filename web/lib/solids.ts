// Procedural geometry for "count the unit cubes" interactive 3D volume
// questions (CCSS 5.MD.4 / 5.MD.5). Given a solid spec, produce the list of
// occupied unit-cube cells. Pure math — no content authoring / LLM needed.
//
// Coordinates: x = width (right), y = height (up), z = depth (toward viewer).

export type SolidKind = "cuboid" | "lshape" | "staircase";

export interface CubesSpec {
  solid: SolidKind;
  // cuboid: l × h × w  (x, y, z extents)
  l?: number;
  h?: number;
  w?: number;
  // lshape: full cuboid minus a corner block of cutL × cutH × cutW
  cutL?: number;
  cutH?: number;
  cutW?: number;
  // staircase: `steps` steps rising 1 unit each, depth w
  steps?: number;
}

export type Cell = [number, number, number];

export function solidCells(spec: CubesSpec): Cell[] {
  const cells: Cell[] = [];
  if (spec.solid === "cuboid") {
    const { l = 2, h = 2, w = 2 } = spec;
    for (let x = 0; x < l; x++)
      for (let y = 0; y < h; y++)
        for (let z = 0; z < w; z++) cells.push([x, y, z]);
    return cells;
  }
  if (spec.solid === "lshape") {
    // full block minus the top-front-right corner chunk
    const { l = 3, h = 3, w = 2, cutL = 1, cutH = 1, cutW = 2 } = spec;
    for (let x = 0; x < l; x++)
      for (let y = 0; y < h; y++)
        for (let z = 0; z < w; z++) {
          const inCut = x >= l - cutL && y >= h - cutH && z >= w - cutW;
          if (!inCut) cells.push([x, y, z]);
        }
    return cells;
  }
  // staircase: column x has height (steps - x), depth w
  const { steps = 3, w = 2 } = spec;
  for (let x = 0; x < steps; x++)
    for (let y = 0; y < steps - x; y++)
      for (let z = 0; z < w; z++) cells.push([x, y, z]);
  return cells;
}

export function solidVolume(spec: CubesSpec): number {
  return solidCells(spec).length;
}

// ---- step-by-step counting demo ---------------------------------------------
// Decompose the solid into the counting strategy a 5th grader would use:
// cuboid / lshape → layer by layer (bottom→top); staircase → column by column
// (tallest→shortest, matching the 4+3+2+1 pattern).

export type StepMode = "layer" | "column";

export interface CountStep {
  cells: Cell[];
  count: number;
  cumulative: number;
}

export function stepModeFor(spec: CubesSpec): StepMode {
  return spec.solid === "staircase" ? "column" : "layer";
}

export function solidSteps(spec: CubesSpec): CountStep[] {
  const cells = solidCells(spec);
  const mode = stepModeFor(spec);
  const axis = mode === "layer" ? 1 : 0; // group by y (layer) or x (column)

  const groups = new Map<number, Cell[]>();
  for (const cell of cells) {
    const key = cell[axis];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cell);
  }

  const keys = [...groups.keys()].sort((a, b) => a - b);
  const steps: CountStep[] = [];
  let cumulative = 0;
  for (const k of keys) {
    const g = groups.get(k)!;
    cumulative += g.length;
    steps.push({ cells: g, count: g.length, cumulative });
  }
  return steps;
}
