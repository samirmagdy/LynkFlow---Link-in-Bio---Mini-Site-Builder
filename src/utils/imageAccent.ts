const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toHex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map(channel => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`;

const colorDistance = (a: [number, number, number], b: [number, number, number]) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** Samples an uploaded image and creates a transparent gradient using its strongest accents. */
export async function extractImageAccentGradient(imageUrl: string): Promise<string | null> {
  if (typeof window === 'undefined' || !imageUrl) return null;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = imageUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The image could not be sampled for accent colors.'));
    });
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const samples: Array<{ rgb: [number, number, number]; score: number }> = [];

    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index + 3] / 255 < 0.65) continue;
      const rgb: [number, number, number] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const max = Math.max(...rgb);
      const min = Math.min(...rgb);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const luminance = (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) / 255;
      samples.push({ rgb, score: saturation * 0.7 + (1 - Math.abs(luminance - 0.52)) * 0.3 });
    }
    if (!samples.length) return null;
    samples.sort((a, b) => b.score - a.score);
    const primary = samples[0].rgb;
    const secondary = samples.find(sample => colorDistance(sample.rgb, primary) > 55)?.rgb || [primary[2], primary[0], primary[1]] as [number, number, number];
    return `linear-gradient(135deg, color-mix(in srgb, ${toHex(...primary)} 82%, transparent), color-mix(in srgb, ${toHex(...secondary)} 48%, transparent) 58%, transparent 100%)`;
  } catch {
    return null;
  }
}
