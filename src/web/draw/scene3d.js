/** A small wireframe flight: grid floor, gates and pylons seen from a camera that never stops moving. */

import { PALETTE } from '../../config/video.config.js';
import { rgba } from '../../core/color.js';
import { TAU, clamp01, lerp } from '../../core/math.js';
import { hash2 } from '../../core/rng.js';
import { polyline } from './primitives.js';

const NEAR = 0.2;
const FOCAL = 1050;
const FAR = 70;
const GRID_STEP = 2;
const GRID_HALF_WIDTH = 24;
const SPEED = 9;
const GATE_SPACING = 18;
const GATE_RADIUS = 3.4;
const RING_SEGMENTS = 72;

/**
 * @typedef {{ x: number, y: number, z: number }} Vec3
 * @typedef {{ position: Vec3, right: Vec3, up: Vec3, forward: Vec3 }} Camera
 */

/**
 * Centre line the camera follows, as a function of travelled distance.
 * @param {number} z
 * @param {number} seed
 * @returns {Vec3}
 */
export function pathAt(z, seed) {
  const phase = hash2(1, 2, seed) * TAU;
  return {
    x: 5.2 * Math.sin(z * 0.045 + phase) + 1.8 * Math.sin(z * 0.11 + phase * 2),
    y: 2.5 + 0.9 * Math.sin(z * 0.06 + 1),
    z,
  };
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {number}
 */
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @returns {Vec3}
 */
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
/**
 * @param {Vec3} a
 * @returns {Vec3}
 */
function normalize(a) {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / length, y: a.y / length, z: a.z / length };
}

/**
 * @param {number} t Seconds.
 * @param {number} seed
 * @returns {Camera}
 */
export function cameraAt(t, seed) {
  const travelled = t * SPEED + hash2(3, 4, seed) * 40;
  const position = pathAt(travelled, seed);
  const target = pathAt(travelled + 14, seed);
  target.y -= 0.9;
  const forward = normalize(sub(target, position));
  const roll = 0.07 * Math.cos(travelled * 0.045);
  const flatRight = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const flatUp = cross(flatRight, forward);
  const right = {
    x: flatRight.x * Math.cos(roll) + flatUp.x * Math.sin(roll),
    y: flatRight.y * Math.cos(roll) + flatUp.y * Math.sin(roll),
    z: flatRight.z * Math.cos(roll) + flatUp.z * Math.sin(roll),
  };
  return { position, right, up: cross(right, forward), forward };
}

/**
 * @param {Camera} camera
 * @param {Vec3} point
 * @returns {Vec3} Point in camera space (z is depth).
 */
function toCamera(camera, point) {
  const relative = sub(point, camera.position);
  return {
    x: dot(relative, camera.right),
    y: dot(relative, camera.up),
    z: dot(relative, camera.forward),
  };
}

/**
 * Project a world segment to the screen, clipping against the near plane.
 * @param {Camera} camera
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {number} cx
 * @param {number} cy
 * @returns {[number, number, number, number, number] | null} x1, y1, x2, y2, nearest depth.
 */
function projectSegment(camera, a, b, cx, cy) {
  let p = toCamera(camera, a);
  let q = toCamera(camera, b);
  if (p.z < NEAR && q.z < NEAR) {
    return null;
  }
  if (p.z < NEAR) {
    p = lerpVec(p, q, (NEAR - p.z) / (q.z - p.z));
  } else if (q.z < NEAR) {
    q = lerpVec(q, p, (NEAR - q.z) / (p.z - q.z));
  }
  return [
    cx + (p.x / p.z) * FOCAL,
    cy - (p.y / p.z) * FOCAL,
    cx + (q.x / q.z) * FOCAL,
    cy - (q.y / q.z) * FOCAL,
    Math.min(p.z, q.z),
  ];
}

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {number} t
 * @returns {Vec3}
 */
function lerpVec(a, b, t) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
}

/**
 * @param {number} depth
 * @returns {number} 0-1 visibility that fades with distance.
 */
function fog(depth) {
  return clamp01(1 - depth / FAR) ** 1.6;
}

/**
 * Binds a camera to a canvas so scene code can draw world-space lines in one call.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Camera} camera
 * @param {{ x: number, y: number }} centre Screen centre in layout pixels.
 * @returns {(a: Vec3, b: Vec3, style: { color: string, strength: number, width: number }) => void}
 */
function createView(ctx, camera, centre) {
  return (a, b, style) => {
    const projected = projectSegment(camera, a, b, centre.x, centre.y);
    if (!projected) {
      return;
    }
    const [x1, y1, x2, y2, depth] = projected;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = style.width;
    ctx.strokeStyle = rgba(style.color, style.strength * fog(depth));
    ctx.stroke();
  };
}

/** @typedef {ReturnType<typeof createView>} View */

const FLOOR_STYLE = { color: PALETTE.text, strength: 0.3, width: 1 };
const PYLON_STYLE = { color: PALETTE.text, strength: 0.5, width: 1.2 };
const GATE_STYLES = [
  { color: PALETTE.accent, strength: 1, width: 1.6, scale: 1 },
  { color: PALETTE.accent, strength: 0.4, width: 1, scale: 0.62 },
];

/**
 * @param {View} view
 * @param {Camera} camera
 */
function drawFloor(view, camera) {
  const zStart = Math.floor(camera.position.z / GRID_STEP) * GRID_STEP;
  const zEnd = zStart + FAR;
  for (let x = -GRID_HALF_WIDTH; x <= GRID_HALF_WIDTH; x += GRID_STEP) {
    // Split long lines into segments so distance fog varies along their length.
    for (let z = zStart; z < zEnd; z += GRID_STEP * 2) {
      view({ x, y: 0, z }, { x, y: 0, z: z + GRID_STEP * 2 }, FLOOR_STYLE);
    }
  }
  for (let z = zStart; z < zEnd; z += GRID_STEP) {
    view({ x: -GRID_HALF_WIDTH, y: 0, z }, { x: GRID_HALF_WIDTH, y: 0, z }, FLOOR_STYLE);
  }
}

/**
 * @param {View} view
 * @param {Camera} camera
 * @param {number} seed
 */
function drawGates(view, camera, seed) {
  const first = Math.floor(camera.position.z / GATE_SPACING);
  for (let n = first; n < first + Math.ceil(FAR / GATE_SPACING) + 1; n += 1) {
    const z = n * GATE_SPACING;
    const centre = pathAt(z, seed);
    for (const style of GATE_STYLES) {
      const radius = GATE_RADIUS * style.scale;
      for (let k = 0; k < RING_SEGMENTS; k += 1) {
        const from = (k / RING_SEGMENTS) * TAU;
        const to = ((k + 1) / RING_SEGMENTS) * TAU;
        view(
          { x: centre.x + Math.cos(from) * radius, y: centre.y + Math.sin(from) * radius, z },
          { x: centre.x + Math.cos(to) * radius, y: centre.y + Math.sin(to) * radius, z },
          style,
        );
      }
    }
  }
}

/**
 * @param {View} view
 * @param {Camera} camera
 * @param {number} seed
 */
function drawPylons(view, camera, seed) {
  const first = Math.floor(camera.position.z / 6);
  for (let n = first; n < first + Math.ceil(FAR / 6); n += 1) {
    for (const side of [-1, 1]) {
      if (hash2(n, side, seed) < 0.35) {
        continue;
      }
      const z = n * 6 + hash2(n, 9, seed) * 4;
      const x = pathAt(z, seed).x + side * (7 + hash2(n, 5, seed) * 11);
      const height = 1.5 + hash2(n, 7, seed) * 8;
      view({ x, y: 0, z }, { x, y: height, z }, PYLON_STYLE);
      view({ x: x - 0.5, y: height, z }, { x: x + 0.5, y: height, z }, PYLON_STYLE);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {{ width: number, height: number, seed: number }} options
 */
export function drawFlight(ctx, t, options) {
  const { width, height, seed } = options;
  const camera = cameraAt(t, seed);
  const view = createView(ctx, camera, { x: width / 2, y: height * 0.5 });
  drawFloor(view, camera);
  drawPylons(view, camera, seed);
  drawGates(view, camera, seed);
}

/**
 * Top-down trace of the path ahead and behind the camera, for the inset diagram.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {number} width
 * @param {number} height
 * @param {number} seed
 */
export function drawPathMap(ctx, t, width, height, seed) {
  const camera = cameraAt(t, seed);
  const here = camera.position.z;
  const from = here - 40;
  const to = here + 110;
  const points = [];
  for (let z = from; z <= to; z += 2) {
    const p = pathAt(z, seed);
    points.push(
      width / 2 + p.x * (width / 26),
      height - 18 - ((z - from) / (to - from)) * (height - 72),
    );
  }
  polyline(ctx, points, PALETTE.textDim, 0.9, 1.2);
  const mark = pathAt(here, seed);
  const x = width / 2 + mark.x * (width / 26);
  const y = height - 18 - ((here - from) / (to - from)) * (height - 72);
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, TAU);
  ctx.fillStyle = PALETTE.accent;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, TAU);
  ctx.strokeStyle = rgba(PALETTE.accent, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
}
