import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function AnimatedSection({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 ${className}`}
    >
      {children}
    </motion.section>
  );
}