'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion';

interface ProductCardImageProps {
  src: string;
  alt: string;
  containerClassName?: string;
  spotlightOpen?: boolean;
  onSpotlightOpenChange?: (open: boolean) => void;
}

const SPRING = { stiffness: 300, damping: 28 };
const MAX_TILT = 15;

export function ProductCardImage({ src, alt, containerClassName, spotlightOpen: controlledOpen, onSpotlightOpenChange }: ProductCardImageProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const spotlightOpen = isControlled ? controlledOpen : internalOpen;
  const setSpotlightOpen = isControlled ? (onSpotlightOpenChange ?? (() => {})) : setInternalOpen;
  const [pointer, setPointer] = useState({ x: 50, y: 50, active: false });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const rotateXSpring = useSpring(rotateX, SPRING);
  const rotateYSpring = useSpring(rotateY, SPRING);

  // Holographic foil: gradient angle + position sweep with tilt, like real card foil
  const foilX = useTransform(rotateYSpring, [-MAX_TILT * 2, MAX_TILT * 2], [0, 100]);
  const foilY = useTransform(rotateXSpring, [MAX_TILT * 2, -MAX_TILT * 2], [0, 100]);
  const foilAngle = useTransform(rotateYSpring, [-MAX_TILT * 2, MAX_TILT * 2], [105, 255]);
  const foilBgPosition = useMotionTemplate`${foilX}% ${foilY}%`;
  const foilBgImage = useMotionTemplate`linear-gradient(${foilAngle}deg, transparent 15%, hsla(0,100%,72%,0.38) 25%, hsla(55,100%,72%,0.42) 32%, hsla(110,100%,72%,0.42) 39%, hsla(165,100%,72%,0.42) 46%, hsla(220,100%,72%,0.42) 53%, hsla(275,100%,72%,0.42) 60%, hsla(330,100%,72%,0.38) 67%, transparent 77%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotateX.set((0.5 - y) * MAX_TILT * 2);
    rotateY.set((x - 0.5) * MAX_TILT * 2);
    setPointer({ x: x * 100, y: y * 100, active: true });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setPointer((p) => ({ ...p, active: false }));
  };

  return (
    <>
      {/* Panel image — static, click to open spotlight */}
      <div className={containerClassName ?? 'shrink-0 aspect-[63/88] relative'}>
        <div
          className="absolute inset-0 overflow-hidden cursor-pointer"
          style={{ borderRadius: '5.5% / 3.977%' }}
          onClick={() => setSpotlightOpen(true)}
        >
          <Image src={src} alt={alt} fill className="object-contain" />
        </div>
      </div>

      {/* Spotlight — floating tilt + glare effect */}
      <AnimatePresence>
        {spotlightOpen && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpotlightOpen(false)}
          >
            {/* Entrance animation */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: '800px' }}
            >
              {/* Tilt container */}
              <motion.div
                className="relative cursor-none"
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
                  className="rounded-[23px] object-contain drop-shadow-2xl"
                  style={{ maxHeight: '88vh', width: 'auto' }}
                />

                {/* Layer 1: Soft ambient glow — large, diffuse, tracks cursor */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[23px] transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(ellipse 80% 55% at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.2) 0%, transparent 100%)`,
                    opacity: pointer.active ? 1 : 0,
                  }}
                />

                {/* Layer 2: Specular highlight — sharp bright point at cursor */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[23px] transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 12%, transparent 38%)`,
                    opacity: pointer.active ? 0.45 : 0,
                  }}
                />

                {/* Layer 3: Holographic rainbow foil — sweeps across card with tilt angle */}
                <motion.div
                  className="pointer-events-none absolute inset-0 rounded-[23px]"
                  style={{
                    backgroundImage: foilBgImage,
                    backgroundSize: '200% 200%',
                    backgroundPosition: foilBgPosition,
                    mixBlendMode: 'screen',
                    opacity: pointer.active ? 0.8 : 0,
                    transition: 'opacity 0.4s',
                  }}
                />

                {/* Layer 4: Edge rim light — faint vignette glow at card border */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-[23px] transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(ellipse 130% 130% at 50% 50%, transparent 52%, rgba(180,205,255,0.14) 100%)',
                    opacity: pointer.active ? 1 : 0,
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
