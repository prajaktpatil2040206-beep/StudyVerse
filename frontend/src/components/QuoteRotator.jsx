import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { motivationalQuotes } from '../utils/moodWeights';

export default function QuoteRotator() {
  const [index, setIndex] = useState(Math.floor(Math.random() * motivationalQuotes.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % motivationalQuotes.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="quote-rotator">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="quote-text"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.5 }}
        >
          "{motivationalQuotes[index]}"
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
