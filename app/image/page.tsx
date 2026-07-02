"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Animation begins when the top of the image touches the bottom of the screen
  // and finishes when the center of the image is in the center of the screen
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start end", "center center"],
  });

  // Maps the scrollYProgress to the opacity and y translation
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]); // Image begins 100 pixel lower to introduce momentum

  return (
    <main className="bg-black text-white min-h-screen">
      
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-5xl font-semibold max-w-2xl">
          Scroll Reveal
        </h1>
      </section>

      <section 
        ref={scrollRef} 
        className="flex min-h-screen items-center justify-center px-6"
      >
        <motion.div 
          style={{ opacity, y }} 
          className="relative w-full max-w-4xl aspect-video overflow-hidden rounded-2xl"
        >
          <Image
            src="/images/hero.jpg"
            alt="Hero reveal"
            fill
            priority
            className="object-cover"
          />
        </motion.div>
      </section>

    </main>
  );
}
