"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CheckCircle, Minus, Play, Plus, WarningCircle } from "@phosphor-icons/react";
import { solidCells, solidSteps, stepModeFor, type CubesSpec } from "@/lib/solids";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { StepControls } from "./StepControls";

interface Props {
  spec: CubesSpec;
  // Controlled mode (practice flow): parent judges via the server. When
  // onCheck is provided, clicking Check reports the entered count and feedback
  // comes from `verdict`. When omitted (demo), the component self-checks.
  onCheck?: (count: number) => void;
  verdict?: boolean | null;
}

// alternate tints by layer to make layer-by-layer counting easier
const LAYER_COLORS = [0xffd3c7, 0xffe9e2];
// step-demo palette
const STEP_CURRENT = 0xf45b39; // this step's cubes
const STEP_DONE = 0xffb8a6; // already counted
const STEP_FUTURE = 0xf2f0f5; // not yet counted (also dimmed via opacity)

const AUTOPLAY_MS = 1300;

// "Count the unit cubes" — a rotatable 3D solid built from unit cubes, with a
// step-by-step counting demo (layer/column highlight, edulab-style).
// Correct when the entered count equals the number of cubes.
export function CubeCount({ spec, onCheck, verdict }: Props) {
  const { t } = useI18n();
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<{ mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial }[]>([]);
  const cells = useMemo(() => solidCells(spec), [spec]);
  const steps = useMemo(() => solidSteps(spec), [spec]);
  const stepMode = stepModeFor(spec);

  const [count, setCount] = useState(0);
  const [selfChecked, setSelfChecked] = useState<null | boolean>(null);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const controlled = onCheck !== undefined;
  const feedback = controlled ? verdict ?? null : selfChecked;
  const locked = controlled && feedback !== null;
  // steps demo unlocks after answering (practice) or anytime (demo)
  const stepsAvailable = !controlled || feedback !== null;
  const stepping = stepIndex !== null;

  // ---- scene ----------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f5f9);

    const maxX = Math.max(...cells.map((c) => c[0])) + 1;
    const maxY = Math.max(...cells.map((c) => c[1])) + 1;
    const maxZ = Math.max(...cells.map((c) => c[2])) + 1;
    const offset = new THREE.Vector3(maxX / 2, maxY / 2, maxZ / 2);

    const box = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const edgeGeo = new THREE.EdgesGeometry(box);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x443d4d });
    meshesRef.current = [];
    for (const [x, y, z] of cells) {
      const mat = new THREE.MeshLambertMaterial({
        color: LAYER_COLORS[y % LAYER_COLORS.length],
        transparent: true,
        opacity: 1,
      });
      const cube = new THREE.Mesh(box, mat);
      cube.position.set(x + 0.5 - offset.x, y + 0.5 - offset.y, z + 0.5 - offset.z);
      scene.add(cube);
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.copy(cube.position);
      scene.add(edges);
      meshesRef.current.push({ mesh: cube, mat });
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(5, 8, 6);
    scene.add(dir);

    const dim = Math.max(maxX, maxY, maxZ);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(dim * 1.6, dim * 1.35, dim * 2.1);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = dim * 1.2;
    controls.maxDistance = dim * 5;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      box.dispose();
      edgeGeo.dispose();
      meshesRef.current = [];
      mount.removeChild(renderer.domElement);
    };
  }, [cells]);

  // ---- step highlighting ------------------------------------------------------
  useEffect(() => {
    const meshes = meshesRef.current;
    if (!meshes.length) return;

    if (stepIndex === null) {
      // restore default look
      cells.forEach(([, y], i) => {
        const m = meshes[i];
        if (!m) return;
        m.mat.color.setHex(LAYER_COLORS[y % LAYER_COLORS.length]);
        m.mat.opacity = 1;
      });
      return;
    }

    // membership: which step does each cell belong to?
    const cellStep = new Map<string, number>();
    steps.forEach((s, si) => {
      for (const c of s.cells) cellStep.set(c.join(","), si);
    });
    cells.forEach((c, i) => {
      const m = meshes[i];
      if (!m) return;
      const si = cellStep.get(c.join(",")) ?? 0;
      if (si === stepIndex) {
        m.mat.color.setHex(STEP_CURRENT);
        m.mat.opacity = 1;
      } else if (si < stepIndex) {
        m.mat.color.setHex(STEP_DONE);
        m.mat.opacity = 1;
      } else {
        m.mat.color.setHex(STEP_FUTURE);
        m.mat.opacity = 0.28;
      }
    });
  }, [stepIndex, cells, steps]);

  // ---- autoplay ---------------------------------------------------------------
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStepIndex((i) => {
        if (i === null) return 0;
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, steps.length]);

  function check() {
    if (controlled) onCheck!(count);
    else setSelfChecked(count === cells.length);
  }

  function bump(delta: number) {
    if (locked) return;
    setCount((c) => Math.max(0, c + delta));
    if (!controlled) setSelfChecked(null);
  }

  function openSteps() {
    setStepIndex(0);
    setPlaying(true);
  }

  function closeSteps() {
    setPlaying(false);
    setStepIndex(null);
  }

  const step = stepIndex !== null ? steps[stepIndex] : null;
  const stepText = step
    ? stepMode === "column"
      ? t.cubesStepColumn(stepIndex! + 1, step.count, step.cumulative)
      : t.cubesStepLayer(stepIndex! + 1, step.count, step.cumulative)
    : "";
  const stepCaption =
    step && stepIndex === steps.length - 1
      ? `${stepText} ${t.cubesStepDone(cells.length)}`
      : stepText;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-center">
        <p className="font-display text-xl font-bold tracking-tight text-ink">
          {t.cubesInstruction}
        </p>
        <p className="mt-1 text-sm text-muted">{t.cubesHint}</p>
      </div>

      <div
        ref={mountRef}
        className="h-72 w-full max-w-md cursor-grab overflow-hidden rounded-card border-2 border-line active:cursor-grabbing md:h-80"
        aria-label={t.cubesInstruction}
      />

      {/* step demo panel */}
      {stepping ? (
        <StepControls
          stepIndex={stepIndex!}
          stepCount={steps.length}
          playing={playing}
          caption={stepCaption}
          closeLabel={t.cubesHideSteps}
          onStep={(i) => {
            setPlaying(false);
            setStepIndex(i);
          }}
          onTogglePlay={() => setPlaying((p) => !p)}
          onClose={closeSteps}
        />
      ) : (
        stepsAvailable && (
          <button
            onClick={openSteps}
            className="btn btn-neutral min-h-10 rounded-full px-5 py-2 text-sm text-muted hover:text-ink"
          >
            <Play size={14} weight="fill" />
            {t.cubesShowSteps}
          </button>
        )
      )}

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted">{t.cubesCount}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => bump(-1)}
            disabled={locked || count === 0}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-surface text-ink shadow-edge-sm transition active:translate-y-[3px] active:shadow-none disabled:opacity-40"
            aria-label="-1"
          >
            <Minus size={18} weight="bold" />
          </button>
          <span className="w-14 text-center text-2xl font-bold tabular-nums text-ink">
            {count}
          </span>
          <button
            onClick={() => bump(1)}
            disabled={locked}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-line bg-surface text-ink shadow-edge-sm transition active:translate-y-[3px] active:shadow-none disabled:opacity-40"
            aria-label="+1"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
        {feedback !== null &&
          (feedback ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-mastered">
              <CheckCircle size={18} weight="fill" />
              {t.correct}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gap">
              <WarningCircle size={18} weight="fill" />
              {t.tryAgain}
            </span>
          ))}
      </div>

      <button
        onClick={check}
        disabled={locked || count === 0}
        className="btn btn-primary min-h-11 rounded-full px-7 py-2.5 text-sm"
      >
        {t.shadeCheck}
      </button>
    </div>
  );
}
