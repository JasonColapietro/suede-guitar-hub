/**
 * A small in-place radix-2 FFT, a Hann window and a magnitude spectrum.
 *
 * Everything that can be precomputed for a size (twiddle factors, the
 * bit-reversal permutation, the window) is computed once and cached, so a tool
 * that analyses a frame every 85 ms allocates nothing per frame once it passes
 * its own output buffer. Sizes must be powers of two; anything else throws.
 */

export function isPowerOfTwo(n: number) {
  return Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;
}

function assertPowerOfTwo(n: number) {
  if (!isPowerOfTwo(n)) throw new RangeError(`FFT size must be a power of two of at least 2, got ${n}.`);
}

type Plan = { size: number; cos: Float64Array; sin: Float64Array; reverse: Uint32Array };
const plans = new Map<number, Plan>();

function plan(size: number): Plan {
  let cached = plans.get(size);
  if (cached) return cached;
  assertPowerOfTwo(size);
  const half = size / 2, cos = new Float64Array(half), sin = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    cos[k] = Math.cos(-2 * Math.PI * k / size);
    sin[k] = Math.sin(-2 * Math.PI * k / size);
  }
  const bits = Math.log2(size), reverse = new Uint32Array(size);
  for (let i = 0; i < size; i++) {
    let r = 0;
    for (let b = 0, x = i; b < bits; b++, x >>= 1) r = (r << 1) | (x & 1);
    reverse[i] = r;
  }
  cached = { size, cos, sin, reverse };
  plans.set(size, cached);
  return cached;
}

/** Forward FFT of the complex signal (re, im), in place. Both arrays must share a power-of-two length. */
export function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  if (im.length !== n) throw new RangeError("FFT real and imaginary parts must have the same length.");
  const { cos, sin, reverse } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = reverse[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const half = length >> 1, step = n / length;
    for (let start = 0; start < n; start += length) {
      for (let k = 0, t = 0; k < half; k++, t += step) {
        const a = start + k, b = a + half;
        const wr = cos[t], wi = sin[t];
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

const windows = new Map<number, Float64Array>();
/** A periodic Hann window of the given size, cached. Do not modify the returned array. */
export function hannWindow(size: number) {
  let cached = windows.get(size);
  if (cached) return cached;
  assertPowerOfTwo(size);
  cached = new Float64Array(size);
  for (let i = 0; i < size; i++) cached[i] = .5 - .5 * Math.cos(2 * Math.PI * i / size);
  windows.set(size, cached);
  return cached;
}

const scratch = new Map<number, { re: Float64Array; im: Float64Array }>();

/**
 * Hann-windowed magnitude spectrum of a real frame: `size / 2 + 1` bins from DC
 * to Nyquist, scaled so a full-scale sine at a bin centre reads about 1.
 * Pass `out` to reuse a buffer between frames.
 */
export function magnitudeSpectrum(samples: ArrayLike<number>, out?: Float64Array) {
  const size = samples.length;
  assertPowerOfTwo(size);
  let buffers = scratch.get(size);
  if (!buffers) { buffers = { re: new Float64Array(size), im: new Float64Array(size) }; scratch.set(size, buffers); }
  const { re, im } = buffers, window = hannWindow(size);
  for (let i = 0; i < size; i++) {
    const x = samples[i];
    re[i] = Number.isFinite(x) ? x * window[i] : 0;
    im[i] = 0;
  }
  fft(re, im);
  const bins = size / 2 + 1;
  const result = out && out.length === bins ? out : new Float64Array(bins);
  // A Hann window has a coherent gain of 0.5; a real sine splits over two sides.
  const scale = 4 / size;
  for (let k = 0; k < bins; k++) result[k] = Math.hypot(re[k], im[k]) * scale;
  return result;
}
