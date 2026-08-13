/**
 * High-performance browser-side image compressor for knives catalog photos
 * Supports JPG, PNG, WEBP, JPEG, GIF, and mobile camera uploads.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    if (!file) {
      console.warn('[ImageCompressor] Nenhum arquivo fornecido.');
      resolve('');
      return;
    }

    console.log(`[ImageCompressor] 📸 Processando imagem: "${file.name}" (${file.type || 'tipo desconhecido'}, ${(file.size / 1024).toFixed(1)} KB)`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        console.warn('[ImageCompressor] Falha ao ler arquivo em DataURL.');
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (!width || !height) {
            console.log('[ImageCompressor] Dimensões não detectadas, utilizando dataUrl original.');
            resolve(dataUrl);
            return;
          }

          const origWidth = width;
          const origHeight = height;

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
            ctx.fillStyle = '#0a0b0e';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            const sizeKb = (compressed.length / 1024).toFixed(1);
            console.log(`[ImageCompressor] ✓ Imagem comprimida com sucesso: ${origWidth}x${origHeight} -> ${width}x${height} (~${sizeKb} KB)`);
            resolve(compressed || dataUrl);
          } else {
            console.log('[ImageCompressor] Canvas 2D indisponível, usando fallback DataURL.');
            resolve(dataUrl);
          }
        } catch (err) {
          console.warn('[ImageCompressor] Erro na compressão via Canvas, utilizando dataUrl original:', err);
          resolve(dataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('[ImageCompressor] Erro ao carregar elemento Image, usando dataUrl bruto:', err);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.onerror = (err) => {
      console.error('[ImageCompressor] Erro no FileReader:', err);
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}
