/** Cubic-bezier easing, the same curve model CSS uses, so brand motion is defined by 4 numbers. */

const NEWTON_ITERATIONS = 8;
const BISECTION_LIMIT = 24;
const EPSILON = 1e-6;

/**
 * @param {number} a1
 * @param {number} a2
 * @param {number} t
 * @returns {number} One coordinate of the bezier at parameter t.
 */
function bezier(a1, a2, t) {
  return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
}

/**
 * @param {number} a1
 * @param {number} a2
 * @param {number} t
 * @returns {number} Slope of the bezier coordinate at parameter t.
 */
function slope(a1, a2, t) {
  return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
}

/**
 * Find the curve parameter whose x equals the given progress.
 * @param {number} x1
 * @param {number} x2
 * @param {number} x
 * @returns {number}
 */
function solveParameter(x1, x2, x) {
  let t = x;
  for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
    const error = bezier(x1, x2, t) - x;
    const derivative = slope(x1, x2, t);
    if (Math.abs(error) < EPSILON || derivative === 0) {
      return t;
    }
    t -= error / derivative;
  }
  let low = 0;
  let high = 1;
  t = x;
  for (let i = 0; i < BISECTION_LIMIT; i += 1) {
    const value = bezier(x1, x2, t);
    if (Math.abs(value - x) < EPSILON) {
      break;
    }
    if (value < x) {
      low = t;
    } else {
      high = t;
    }
    t = (low + high) / 2;
  }
  return t;
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {(progress: number) => number} Easing function mapping 0..1 to 0..1.
 */
export function cubicBezier(x1, y1, x2, y2) {
  return (progress) => {
    if (progress <= 0) {
      return 0;
    }
    if (progress >= 1) {
      return 1;
    }
    return bezier(y1, y2, solveParameter(x1, x2, progress));
  };
}
