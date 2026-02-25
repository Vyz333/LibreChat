/**
 * Converts AVIF images to PNG using canvas (browser-native AVIF decode).
 * Used when the server's sharp/libvips does not support AVIF.
 */

export function isAVIFFile(file: File): boolean {
  return file.type === 'image/avif' || /\.avif$/i.test(file.name);
}

/**
 * Converts an AVIF file to PNG using canvas.
 * Requires browser support for AVIF in Image element.
 *
 * @param file - The AVIF file to convert
 * @returns Promise<File> - The converted PNG file
 */
export function convertAVIFToPNG(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create PNG blob'));
              return;
            }
            const name = file.name.replace(/\.avif$/i, '.png');
            resolve(
              new File([blob], name, {
                type: 'image/png',
                lastModified: Date.now(),
              }),
            );
          },
          'image/png',
          0.95,
        );
      };
      img.onerror = () => reject(new Error('Failed to decode AVIF image'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Processes a file, converting AVIF to PNG if necessary.
 *
 * @param file - The file to process
 * @returns Promise<File> - The processed file (converted if AVIF, original otherwise)
 */
export async function processAVIFFileForUpload(file: File): Promise<File> {
  if (!isAVIFFile(file)) {
    return file;
  }
  return convertAVIFToPNG(file);
}
