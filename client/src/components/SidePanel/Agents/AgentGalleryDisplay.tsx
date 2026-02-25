import { useEffect, useState } from 'react';
import type { AgentAvatar } from 'librechat-data-provider';

const ROTATION_INTERVAL_MS = 5000;

export default function AgentGalleryDisplay({
  images,
}: {
  images: AgentAvatar[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images.length) {
    return null;
  }

  const currentImage = images[currentIndex];
  const url = currentImage?.filepath;

  if (!url) {
    return null;
  }

  return (
    <div
      className="mb-4 flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-lg bg-surface-secondary"
      aria-label="Agent image gallery"
    >
      <img
        src={url}
        alt=""
        className="max-h-[420px] w-full object-contain transition-opacity duration-500"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
