export const getReactUsageSnippet = (frameCount: number) => {
  return `import ScrollAnimation from './ScrollAnimation';

export default function MyPage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Content above the animation */}
      <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1>Scroll down to begin animation.</h1>
      </section>

      {/* The drop-in component */}
      <ScrollAnimation 
        frameCount={${frameCount}} 
        imagePrefix="/images/frame_" // If necessary, update the file path
        extension=".jpg"
        className = "rounded-2xl overflow-hidden shadow-2xl"
        scrollHeight="300vh" // Minimum 100vh. Controls animation scroll speed
      />

      {/* Content below the animation */}
      <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Animation complete!</p>
      </section>
    </main>
  );
}`;
};

export const getTsxComponentCode = () => {
  return `"use client";

import React, { useEffect, useRef } from "react";

interface ScrollAnimationProps {
  /* Total number of frames in the sequence */
  frameCount: number;
  /* Path to the folder containing the images with the image prefix. Example: '/animation/frame_' */
  imagePrefix?: string;
  /* Image file extension. Default: '.jpg' */
  extension?: string;
  /* Height of the scroll container, controlling the speed. Default: '300vh'; Must be >'100vh' */
  scrollHeight?: string;
  /* Maximum width of the animation container. Default: '64rem' (matches Tailwind max-w-4xl) */
  maxWidth?: string;
  /* Tailwind CSS styles */
  className? : string;
  /* Optional CSS styles for the inner canvas container (e.g., borders, shadows, rounded corners) */
  containerStyle?: React.CSSProperties;
}

export default function ScrollAnimation({
  frameCount,
  imagePrefix = "/images/frame_",
  extension = ".jpg",
  scrollHeight = "300vh",
  maxWidth = "64rem",
  className,
  containerStyle = {}
}: ScrollAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    // Preload Images
    const loadImages = () => {
      imagesRef.current = [];
      for (let i = 1; i <= frameCount; i++) {
        const img = new window.Image();
        const frameIndex = i.toString().padStart(4, "0");
        img.src = \`\${imagePrefix}\${frameIndex}\${extension}\`;
        imagesRef.current.push(img);
      }

      // Draw the first frame immediately to prevent a blank canvas
      imagesRef.current[0].onload = () => {
        canvas.width = imagesRef.current[0].width;
        canvas.height = imagesRef.current[0].height;

        context.drawImage(imagesRef.current[0], 0, 0, canvas.width, canvas.height);
      };
    };

    loadImages();

    const handleScroll = () => {
      if (!containerRef.current || imagesRef.current.length === 0) return;

      const scrollTop = window.scrollY - containerRef.current.offsetTop;
      const maxScroll = containerRef.current.scrollHeight - window.innerHeight;
      const scrollFraction = scrollTop / maxScroll;
      const clampedFraction = Math.max(0, Math.min(1, scrollFraction));
      
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(clampedFraction * frameCount)
      );

      requestAnimationFrame(() => {
        const img = imagesRef.current[frameIndex];

        if (img && img.complete) {
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll)
  }, [frameCount, imagePrefix, extension]);

  return (
    <section
      ref={containerRef}
      style={{ height: scrollHeight, position: "relative", width: "100%", maxWidth: maxWidth }}
    >
      <div style={{ position: "sticky", top: 0, width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          className={className}
          style={{ display: "flex", alignItems: "center", justifyItems: "center", width: "100%", ...containerStyle }}
        >
          <canvas ref={canvasRef} style={{ width: "100%" }} />
        </div>
      </div>
    </section>
  );
}`
};
