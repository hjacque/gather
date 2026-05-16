'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const images = [
  '/images/mtg-login.jpg',
  '/images/mtg-login2.jpg',
  '/images/mtg-login3.jpg',
];

export function BackgroundCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 6000); // 6 seconds
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={images[index]}
          className="absolute inset-0 bg-cover bg-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
          style={{ backgroundImage: `url(${images[index]})` }}
        />
      </AnimatePresence>

      {/* Optional dark overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />
    </div>
  );
}
