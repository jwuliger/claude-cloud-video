/** Canvas layers that redraw as a pure function of the playhead time. */

/**
 * @typedef {object} LayerOptions
 * @property {HTMLElement} parent
 * @property {number} width Layout pixels.
 * @property {number} height Layout pixels.
 * @property {number} start Seconds when drawing begins.
 * @property {number} end Seconds when drawing stops.
 * @property {(ctx: CanvasRenderingContext2D, time: number) => void} draw
 * @property {string} [className]
 */

/**
 * @typedef {object} Layer
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} ctx
 * @property {number} width
 * @property {number} height
 * @property {number} start
 * @property {number} end
 * @property {(ctx: CanvasRenderingContext2D, time: number) => void} draw
 */

/** Seconds a layer keeps drawing outside its window so entrances and exits are never cut. */
const DRAW_MARGIN = 0.75;

/**
 * @typedef {object} FrameHookOptions
 * @property {number} start
 * @property {number} end
 * @property {(time: number) => void} run Called on every seek inside the window.
 */

export function createLayerRegistry() {
  /** @type {Layer[]} */
  const layers = [];
  /** @type {FrameHookOptions[]} */
  const hooks = [];
  const pixelRatio = window.devicePixelRatio || 1;

  return {
    /**
     * @param {LayerOptions} options
     * @returns {HTMLCanvasElement}
     */
    add(options) {
      const { parent, width, height, start, end, draw, className = 'abs' } = options;
      const canvas = document.createElement('canvas');
      canvas.className = className;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D is not available.');
      }
      ctx.scale(pixelRatio, pixelRatio);
      parent.append(canvas);
      layers.push({ canvas, ctx, width, height, start, end, draw });
      return canvas;
    },

    /**
     * Run code on every seek, for DOM text that depends on tweened state. GSAP callbacks are
     * suppressed while seeking, so anything that must be exact for a given time goes here.
     * @param {FrameHookOptions} options
     */
    hook(options) {
      hooks.push(options);
    },

    /** Redraw every layer, and run every hook, whose window contains `time`. */
    render(/** @type {number} */ time) {
      for (const hook of hooks) {
        if (time >= hook.start - DRAW_MARGIN && time <= hook.end + DRAW_MARGIN) {
          hook.run(time);
        }
      }
      for (const layer of layers) {
        if (time < layer.start - DRAW_MARGIN || time > layer.end + DRAW_MARGIN) {
          continue;
        }
        layer.ctx.clearRect(0, 0, layer.width, layer.height);
        layer.draw(layer.ctx, time);
      }
    },
  };
}
