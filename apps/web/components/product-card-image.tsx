'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { X } from 'lucide-react';

interface ProductCardImageProps {
  src: string;
  alt: string;
  containerClassName?: string;
}

const SPRING = { stiffness: 300, damping: 28 };
const MAX_TILT = 15;

export function ProductCardImage({ src, alt, containerClassName }: ProductCardImageProps) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const rotateXSpring = useSpring(rotateX, SPRING);
  const rotateYSpring = useSpring(rotateY, SPRING);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotateX.set((0.5 - y) * MAX_TILT * 2);
    rotateY.set((x - 0.5) * MAX_TILT * 2);
    setGlare({ x: x * 100, y: y * 100, opacity: 0.22 });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setGlare((g) => ({ ...g, opacity: 0 }));
  };

  return (
    <>
      {/* Panel image — static, click to open spotlight */}
      <div
        className={containerClassName ?? 'shrink-0 aspect-[63/88] relative'}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[6px] cursor-pointer"
          onClick={() => setSpotlightOpen(true)}
        >
          <Image src={src} alt={alt} fill className="object-contain" />
        </div>
      </div>

      {/* Spotlight — floating tilt effect lives here */}
      <AnimatePresence>
        {spotlightOpen && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpotlightOpen(false)}
          >
            <button
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                setSpotlightOpen(false);
              }}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Entrance animation */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: '800px' }}
            >
              {/* Tilt + glare */}
              <motion.div
                className="relative"
                style={{
                  rotateX: rotateXSpring,
                  rotateY: rotateYSpring,
                  transformStyle: 'preserve-3d',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <Image
                  src={src}
                  alt={alt}
                  width={420}
                  height={588}
                  className="rounded-[14px] object-contain drop-shadow-2xl"
                  style={{ maxHeight: '88vh', width: 'auto' }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[14px] transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.28) 0%, transparent 65%)`,
                    opacity: glare.opacity,
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
