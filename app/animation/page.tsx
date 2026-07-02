"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const imagesRef = useRef<HTMLImageElement[]>([])
  const frameCount = 121

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    
    if (!canvas || !context) return;

    // Preloader
    const loadImages = () => {
      for (let i = 1; i <= frameCount; i++) {
        const img = new window.Image();

        // Pads the number with zeros (e.g., 1 becomes '0001') to match FFmpeg output
        const frameIndex = i.toString().padStart(4, "0");
        img.src = `/animation/sequence_${frameIndex}.jpg`;
        imagesRef.current.push(img);
      }

      // Draw the very first frame as soon as it loads to prevent a blank screen
      imagesRef.current[0].onload = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        context.drawImage(imagesRef.current[0], 0, 0, canvas.width, canvas.height);
      };
    };

    loadImages();

    // Scroll Tracker
    const handleScroll = () => {
      if (!containerRef.current || imagesRef.current.length === 0) return;

      // Calculate how far the user has scrolled down the specific container
      const scrollTop = window.scrollY - containerRef.current.offsetTop;
      const maxScroll = containerRef.current.scrollHeight - window.innerHeight;
      
      // Yields a value between 0.0 and 1.0
      const scrollFraction = scrollTop / maxScroll;

      // Clamp between 0 and 1 to prevent errors if the user bounces past the page edges
      const clampedFraction = Math.max(0, Math.min(1, scrollFraction));

      // Map the 0.0 - 1.0 fraction to an exact integer in our image array
      const frameIndex = Math.min(
        frameCount - 1,
        Math.floor(clampedFraction * frameCount)
      );

      // Image Renderer
      requestAnimationFrame(() => {
        if (imagesRef.current[frameIndex]) {
          // Paints the new image over the old one
          // Forces the image to stretch and fit the container; update to use a math function to crop image dynamically to simulate object-fit: cover if needed
          context.drawImage(
            imagesRef.current[frameIndex],
            0,
            0,
            canvas.width,
            canvas.height
          );
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    // Resize to Prevent Stretch Blur
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      handleScroll(); // Immediately redraw the current frame at the new size
    };
    
    window.addEventListener("resize", handleResize);

    // Cleanup listeners when the component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [])

  return (
    <main className="bg-black text-white min-h-screen">
      <section 
        ref={containerRef} 
        className="relative h-[300vh]"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="block h-full w-full object-cover" 
          />   
        </div>
      </section>
    </main>
  );
}
