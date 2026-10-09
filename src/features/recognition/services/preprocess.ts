import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';

import { MODEL_CENTER_CROP_FRACTION, MODEL_INPUT_SIZE } from '../model';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Centered square covering `fraction` of the short side: the framing the model was trained on. */
export function centerCropRect(width: number, height: number, fraction = MODEL_CENTER_CROP_FRACTION): CropRect {
  if (!(width > 0 && height > 0)) throw new Error('Image has no size.');
  const side = Math.max(1, Math.round(Math.min(width, height) * fraction));
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    width: side,
    height: side,
  };
}

/**
 * Square sizes to resize through, ending at `size`: one step of less than 2x down to size*2^k, then exact
 * halvings. Android resizes with plain bilinear sampling (Bitmap.createScaledBitmap), so shrinking a phone
 * photo's ~2,600 px crop to 224 px in one step reads 4 of every ~140 source pixels and aliases fine detail
 * such as window grids into moire. A 2x bilinear step averages each 2x2 block exactly, so the chain comes
 * close to the antialiased downscale the model was trained with. On phone-resolution photos, the one-step
 * resize cut top-1 accuracy from 73% to 45%, while this chain matched the training resize (ml/README.md).
 */
export function resizeSteps(side: number, size: number): number[] {
  if (!(side > 0 && size > 0)) throw new Error('Image has no size.');
  let first = size;
  while (first * 2 <= side) first *= 2;
  const steps = [first];
  while (steps[steps.length - 1] > size) steps.push(steps[steps.length - 1] / 2);
  return steps;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_LOOKUP = new Uint8Array(128).fill(255);
for (let i = 0; i < BASE64.length; i += 1) BASE64_LOOKUP[BASE64.charCodeAt(i)] = i;

/** Base64 to bytes without relying on a global `atob`/`Buffer`. */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^,]*,/, '').replace(/[\s=]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0, bits = 0, out = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    const value = code < 128 ? BASE64_LOOKUP[code] : 255;
    if (value === 255) throw new Error('Invalid base64 image data.');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, out);
}

/** RGBA (or RGB) bytes -> float32 RGB 0-255, NHWC. */
export function pixelsToTensor(pixels: Uint8Array, width: number, height: number, channels: 3 | 4): Float32Array {
  if (pixels.length < width * height * channels) throw new Error('Decoded image is smaller than its size.');
  const tensor = new Float32Array(width * height * 3);
  for (let p = 0, src = 0, dst = 0; p < width * height; p += 1, src += channels, dst += 3) {
    tensor[dst] = pixels[src];
    tensor[dst + 1] = pixels[src + 1];
    tensor[dst + 2] = pixels[src + 2];
  }
  return tensor;
}

export type PhotoIssue = 'too-dark' | 'too-bright' | 'low-detail';

// Luminance limits (0-255). Every one of the 6,361 real training images has a mean of at least 9.6, at
// most 224, and a spread (standard deviation) of at least 16.9, so these only catch frames no landmark
// photo looks like: a covered lens, a black or white screen, a blank wall.
export const MIN_MEAN_LUMINANCE = 6;
export const MAX_MEAN_LUMINANCE = 245;
export const MIN_LUMINANCE_SPREAD = 8;

/** Reject frames with nothing to recognize before they reach the model, which must not guess on them. */
export function assessPhoto(tensor: Float32Array): PhotoIssue | null {
  const pixels = Math.floor(tensor.length / 3);
  if (pixels === 0) return 'low-detail';
  let sum = 0, sumSquares = 0;
  for (let i = 0; i < pixels * 3; i += 3) {
    const luminance = 0.299 * tensor[i] + 0.587 * tensor[i + 1] + 0.114 * tensor[i + 2];
    sum += luminance;
    sumSquares += luminance * luminance;
  }
  const mean = sum / pixels;
  const spread = Math.sqrt(Math.max(0, sumSquares / pixels - mean * mean));
  if (!Number.isFinite(mean) || !Number.isFinite(spread)) return 'low-detail';
  if (mean < MIN_MEAN_LUMINANCE) return 'too-dark';
  if (mean > MAX_MEAN_LUMINANCE) return 'too-bright';
  if (spread < MIN_LUMINANCE_SPREAD) return 'low-detail';
  return null;
}

/** Photo URI -> model input tensor [size, size, 3] (float32 RGB 0-255, not normalized). */
export async function imageToModelInput(uri: string, size = MODEL_INPUT_SIZE): Promise<Float32Array> {
  const context = ImageManipulator.manipulate(uri);
  const refs: { release(): void }[] = [context];
  try {
    const original = await context.renderAsync();
    refs.push(original);
    const crop = centerCropRect(original.width, original.height);
    let chain = context.crop(crop);
    for (const step of resizeSteps(crop.width, size)) chain = chain.resize({ width: step, height: step });
    const resized = await chain.renderAsync();
    refs.push(resized);
    // Expo modules expose no raw pixels; a max-quality JPEG round trip is the lightest path and
    // matches the JPEG images the model was trained on.
    const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: 1, base64: true });
    if (!saved.base64) throw new Error('Image manipulator returned no image data.');
    const decoded = decodeJpeg(base64ToBytes(saved.base64), { useTArray: true, formatAsRGBA: true });
    if (decoded.width !== size || decoded.height !== size) {
      throw new Error(`Expected a ${size}x${size} image, got ${decoded.width}x${decoded.height}.`);
    }
    return pixelsToTensor(decoded.data, size, size, 4);
  } finally {
    for (const ref of refs) ref.release();
  }
}
