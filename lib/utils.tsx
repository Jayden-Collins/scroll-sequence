export const getReactUsageSnippet = (frameCount: number) => {
  return `import ScrollAnimation from './ScrollAnimation';

export default function MyPage() {
  return (
    <main>
      {/* Content above the animation */}
      <section style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1>Scroll down to begin animation</h1>
      </section>

      {/* The drop-in component */}
      <ScrollAnimation 
        frameCount={${frameCount}} 
        imagePrefix="/images/frame_"
        extension=".jpg"
        scrollSpeed="300vh"
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
  /** Total number of frames in the sequence */
  frameCount: number;
  /** Path to the folder containing the images. Example: '/animation/frame_' */
  imagePrefix?: string;
  /** Image file extension. Default: '.jpg' */
  extension?: string;
  /** Height of the scroll container, controlling the speed. Default: '300vh' */
  scrollSpeed?: string;
}

export default function ScrollAnimation({
  frameCount,
  imagePrefix = "/images/frame_",
  extension = ".jpg",
  scrollSpeed = "300vh",
}: ScrollAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // 1. Preload Images
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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const scale = Math.max(
          canvas.width / imagesRef.current[0].width,
          canvas.height / imagesRef.current[0].height
        );
        const x = canvas.width / 2 - (imagesRef.current[0].width / 2) * scale;
        const y = canvas.height / 2 - (imagesRef.current[0].height / 2) * scale;
        context.drawImage(
          imagesRef.current[0],
          x,
          y,
          imagesRef.current[0].width * scale,
          imagesRef.current[0].height * scale
        );
      };
    };

    loadImages();

    // 2. Handle Scrolling
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
          const scale = Math.max(
            canvas.width / img.width,
            canvas.height / img.height
          );
          const x = canvas.width / 2 - (img.width / 2) * scale;
          const y = canvas.height / 2 - (img.height / 2) * scale;
          context.drawImage(img, x, y, img.width * scale, img.height * scale);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    // 3. Handle Resizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      handleScroll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [frameCount, imagePrefix, extension]);

  return (
    <section ref={containerRef} style={{ height: scrollSpeed, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, width: "100%", height: "100vh", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      </div>
    </section>
  );
}`;
};

export const getJsxComponentCode = () => {
  return `"use client";

import React, { useEffect, useRef } from "react";

export default function ScrollAnimation({
  frameCount,
  imagePrefix = "/images/frame_",
  extension = ".jpg",
  scrollSpeed = "300vh",
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    // 1. Preload Images
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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const scale = Math.max(
          canvas.width / imagesRef.current[0].width,
          canvas.height / imagesRef.current[0].height
        );
        const x = canvas.width / 2 - (imagesRef.current[0].width / 2) * scale;
        const y = canvas.height / 2 - (imagesRef.current[0].height / 2) * scale;
        context.drawImage(
          imagesRef.current[0],
          x,
          y,
          imagesRef.current[0].width * scale,
          imagesRef.current[0].height * scale
        );
      };
    };

    loadImages();

    // 2. Handle Scrolling
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
          const scale = Math.max(
            canvas.width / img.width,
            canvas.height / img.height
          );
          const x = canvas.width / 2 - (img.width / 2) * scale;
          const y = canvas.height / 2 - (img.height / 2) * scale;
          context.drawImage(img, x, y, img.width * scale, img.height * scale);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    // 3. Handle Resizing
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      handleScroll();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [frameCount, imagePrefix, extension, padLength]);

  return (
    <section ref={containerRef} style={{ height: scrollSpeed, position: "relative" }}>
      <div style={{ position: "sticky", top: 0, width: "100%", height: "100vh", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      </div>
    </section>
  );
}`;
};
