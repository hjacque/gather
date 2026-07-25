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
import type { FoilPattern } from '@gather/types';

interface CardImageProps {
  src: string;
  alt: string;
  containerClassName?: string;
  spotlightOpen?: boolean;
  onSpotlightOpenChange?: (open: boolean) => void;
  foilPattern?: FoilPattern | null;
}

const SPRING = { stiffness: 300, damping: 28 };
const MAX_TILT = 15;

const ILLUSTRATION_ZONE: React.CSSProperties = {
  clipPath: 'inset(10% 8% 52.7% 8% round 2px)',
};

const NAME_BAR_ZONE: React.CSSProperties = {
  clipPath: 'inset(2.5% 3.5% 90% 3.5% round 2px)',
};

const ATTACKS_ZONE: React.CSSProperties = {
  clipPath: 'inset(50.5% 3.5% 2.5% 3.5% round 2px)',
};

const LEFT_GAP_ZONE: React.CSSProperties = {
  clipPath: 'inset(10% 92% 49% 3.5% round 2px)',
};

const RIGHT_GAP_ZONE: React.CSSProperties = {
  clipPath: 'inset(10% 3.5% 49% 92% round 2px)',
};

const BORDERS_ZONE: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(#000 0%, #000 100%), linear-gradient(#000 0%, #000 100%)',
  WebkitMaskSize: '100% 100%, 93% 95%',
  WebkitMaskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskComposite: 'destination-out',
  maskImage: 'linear-gradient(#000 0%, #000 100%), linear-gradient(#000 0%, #000 100%)',
  maskSize: '100% 100%, 93% 95%',
  maskPosition: 'center',
  maskRepeat: 'no-repeat',
  maskComposite: 'subtract',
};

function getZoneStyles(foilPattern: FoilPattern | null | undefined): React.CSSProperties[] {
  if (foilPattern === 'rareHolo') return [ILLUSTRATION_ZONE, BORDERS_ZONE];
  if (foilPattern === 'regularHolo') return [ILLUSTRATION_ZONE];
  if (foilPattern === 'reverse') return [NAME_BAR_ZONE, ATTACKS_ZONE, LEFT_GAP_ZONE, RIGHT_GAP_ZONE];
  return [];
}

interface FoilLayersProps {
  pointer: { x: number; y: number; active: boolean };
  foilBgImage: ReturnType<typeof useMotionTemplate>;
  foilBgPosition: ReturnType<typeof useMotionTemplate>;
}

function FoilLayers({ pointer, foilBgImage, foilBgPosition }: FoilLayersProps) {
  return (
    <>
      <div
        className="absolute inset-0 rounded-[23px] transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 80% 55% at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.2) 0%, transparent 100%)`,
          opacity: pointer.active ? 1 : 0,
        }}
      />

      <div
        className="absolute inset-0 rounded-[23px] transition-opacity duration-150"
        style={{
          background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.10) 12%, transparent 38%)`,
          opacity: pointer.active ? 0.45 : 0,
        }}
      />

      <motion.div
        className="absolute inset-0 rounded-[23px]"
        style={{
          backgroundImage: foilBgImage,
          backgroundSize: '200% 200%',
          backgroundPosition: foilBgPosition,
          mixBlendMode: 'screen',
          opacity: pointer.active ? 0.8 : 0,
          transition: 'opacity 0.4s',
        }}
      />

      <div
        className="absolute inset-0 rounded-[23px] transition-opacity duration-300"
        style={{
          background: 'radial-gradient(ellipse 130% 130% at 50% 50%, transparent 52%, rgba(180,205,255,0.14) 100%)',
          opacity: pointer.active ? 1 : 0,
        }}
      />
    </>
  );
}

export function CardImage({ src, alt, containerClassName, spotlightOpen: controlledOpen, onSpotlightOpenChange, foilPattern }: CardImageProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const spotlightOpen = isControlled ? controlledOpen : internalOpen;
  const setSpotlightOpen = isControlled ? (onSpotlightOpenChange ?? (() => {})) : setInternalOpen;
  const [pointer, setPointer] = useState({ x: 50, y: 50, active: false });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const rotateXSpring = useSpring(rotateX, SPRING);
  const rotateYSpring = useSpring(rotateY, SPRING);

  const foilX = useTransform(rotateYSpring, [-MAX_TILT * 2, MAX_TILT * 2], [0, 100]);
  const foilY = useTransform(rotateXSpring, [MAX_TILT * 2, -MAX_TILT * 2], [0, 100]);
  const foilAngle = useTransform(rotateYSpring, [-MAX_TILT * 2, MAX_TILT * 2], [105, 255]);
  const foilBgPosition = useMotionTemplate`${foilX}% ${foilY}%`;
  const foilBgImage = useMotionTemplate`linear-gradient(${foilAngle}deg, transparent 15%, hsla(0,60%,88%,0.50) 25%, hsla(55,60%,88%,0.55) 32%, hsla(110,60%,88%,0.55) 39%, hsla(165,60%,88%,0.55) 46%, hsla(220,60%,88%,0.55) 53%, hsla(275,60%,88%,0.55) 60%, hsla(330,60%,88%,0.50) 67%, transparent 77%)`;

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

  const zoneStyles = getZoneStyles(foilPattern);

  return (
    <>
      <div className={containerClassName ?? 'shrink-0 aspect-[63/88] relative'}>
        <div
          className="absolute inset-0 overflow-hidden cursor-pointer"
          style={{ borderRadius: '5.5% / 3.977%' }}
          onClick={() => setSpotlightOpen(true)}
        >
          <Image src={src} alt={alt} fill className="object-contain" />
        </div>
      </div>

      <AnimatePresence>
        {spotlightOpen && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpotlightOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ perspective: '800px' }}
            >
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

                {zoneStyles.map((zoneStyle, i) => (
                  <div
                    key={i}
                    className="pointer-events-none absolute inset-0"
                    style={zoneStyle}
                  >
                    <FoilLayers pointer={pointer} foilBgImage={foilBgImage} foilBgPosition={foilBgPosition} />
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
