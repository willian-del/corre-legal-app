import { useEffect, useState } from "react";

export function useDehaloImage(src: string) {
  const [processed, setProcessed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3] / 255;
          if (a <= 0) continue;

          // Remove white matte
          for (let c = 0; c < 3; c++) {
            const C = d[i + c] / 255;
            let C2 = (C - (1 - a)) / (a || 1);
            if (!isFinite(C2)) C2 = C;
            d[i + c] = Math.max(0, Math.min(255, Math.round(C2 * 255)));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL("image/png");
        if (!cancelled) setProcessed(url);
      } catch {
        // Fallback silencioso
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);

  return processed;
}
