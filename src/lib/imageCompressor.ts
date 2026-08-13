/**
 * High-performance browser-side image compressor for knives catalog photos
 * Supports JPG, PNG, WEBP, JPEG, GIF and mobile camera uploads.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve('');
        return;
      }

      // If it's not a standard browser-decodable image, return dataUrl directly
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (!width || !height) {
            resolve(dataUrl);
            return;
          }

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            // Fill with black background in case of transparent PNG converted to JPEG
            ctx.fillStyle = '#0a0b0e';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed || dataUrl);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          console.warn('Canvas compression fallback to raw dataUrl:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        // Direct fallback
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
