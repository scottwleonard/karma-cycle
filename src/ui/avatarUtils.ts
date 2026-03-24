const AVATAR_SIZE = 64;
const AVATAR_KEY = 'karma_cycle_avatar';
const MAX_BYTES = 8_000; // ~6KB base64 limit

/** Resize an image file to 64x64 and return as base64 data URL */
export function resizeAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext('2d')!;

        // Crop to square from center, then resize
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

        const dataUrl = canvas.toDataURL('image/webp', 0.7);
        if (dataUrl.length > MAX_BYTES) {
          // Retry with lower quality
          const smaller = canvas.toDataURL('image/webp', 0.4);
          resolve(smaller);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function saveAvatarLocal(dataUrl: string): void {
  try {
    localStorage.setItem(AVATAR_KEY, dataUrl);
  } catch {
    // Storage full — ignore
  }
}

export function loadAvatarLocal(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
}

/** Open a file picker and return the resized avatar data URL */
export function pickAvatar(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      try {
        const dataUrl = await resizeAvatar(file);
        resolve(dataUrl);
      } catch {
        resolve(null);
      }
    });
    input.click();
  });
}
