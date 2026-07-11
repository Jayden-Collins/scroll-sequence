"use client";

import { useEffect, useRef, useState } from "react";
import DragDropZone from "../../components/DragDropZone";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { getReactUsageSnippet, getTsxComponentCode } from "../../lib/utils";
import JSZip from "jszip";
import { saveAs } from "file-saver"
import Image from "next/image";
import XLogo from "@/components/XLogo";
import GithubLogo from "@/components/GithubLogo";

export default function ScrollSequenceGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [ frameUrls, setFrameUrls ] = useState<string[]>([])
  const imagesRef = useRef<HTMLImageElement[]>([])

  const [ file, setFile ] = useState<File | null>(null)

  // ffmpeg states
  const [ loaded, setLoaded ] = useState(false)
  const [ isProcessing, setIsProcessing ] = useState(false)
  const [ progress, setProgress ] = useState(0)

  const ffmpegRef = useRef<FFmpeg | null>(null)

  const [ isExporting, setIsExporting ] = useState(false)

  // Load ffmpeg on mount
  useEffect(() => {
    // Fetch raw data from unpkg.com, convert it into a localized Blob URL, and feed that to the browser
    // to adhere to the security rules of modern browsers against downloading WASM files from third-party CDNs
    const loadFFmpeg = async () => {
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg()
      }
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      const ffmpeg = ffmpegRef.current

      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100))
      });

      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        setLoaded(true);

        console.log("FFmpeg WebAssembly loaded successfully.")
      } catch (error) {
        console.error("Failed to load FFmpeg:", error)
      }
    };

    loadFFmpeg();
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    setIsProcessing(true)

    // Only accept MP4s or MOVs
    if (selectedFile.type === "video/mp4" || selectedFile.type === "video/quicktime") {
      setFile(selectedFile);
    } else {
      console.error("Invalid file type. Please upload an MP4 or MOV.");
    }

    setIsProcessing(false)
  }

  // Extract frames from animations
  const handleExtractFrames = async () => {
    if (!file || !loaded) return;
    setIsProcessing(true);
    setProgress(0);

    const ffmpeg = ffmpegRef.current;
    if (!ffmpeg) return

    try {
      console.log("Writing file to WebAssembly virtual FS...");
      await ffmpeg.writeFile('input.mp4', await fetchFile(file));
      
      // Use fps=15 to keep the frame count manageable for RAM
      console.log("Running FFmpeg extraction command...");
      // -i stands for "input", and tells ffmpeg which file to read
      // -vf: video filter; tells ffmpeg to only extract 15 frames per second
      // -q:v 5: quality: video; JPEG quality scale used, ranges from 1 (perfect quality) to 31 (pixelated)
      await ffmpeg.exec(['-i', 'input.mp4', '-vf', 'fps=15', '-q:v', '5', 'frame_%04d.jpg']);
      
      console.log("Extraction complete. Reading files from virtual FS...");
      
      // Read the directory to find our extracted frames
      const dirContents = await ffmpeg.listDir('.');
      const jpegFiles = dirContents
        .filter(f => f.name.endsWith('.jpg'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      const frameUrls: string[] = [];
      
      for (const fileObj of jpegFiles) {
        const fileData = await ffmpeg.readFile(fileObj.name);

        // Create a browser-readable Blob URL from the raw byte data
        const blob = new Blob([(fileData as Uint8Array).buffer as ArrayBuffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        frameUrls.push(url);
      }

      console.log(`Successfully generated ${frameUrls.length} frame URLs.`);
      
      console.log(`Received ${frameUrls.length} frames from WebAssembly`)
      setFrameUrls(frameUrls)
      
    } catch (error) {
      console.error("Error during extraction:", error);
    } finally {
      setIsProcessing(false);
    }
  }

  // Update animation preview when frames changes
  useEffect(() => {
    // If no URLs are loaded yet, don't run the canvas logic
    if (frameUrls.length === 0) return

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    
    if (!canvas || !context) return;

    // Resets images array to clear previous uploads
    imagesRef.current = []

    // Preloader
    const loadImages = () => {
      frameUrls.forEach(url => {
        const img = new window.Image();
        img.src = url
        imagesRef.current.push(img)
      })

      // Draw the very first frame as soon as it loads to prevent a blank screen
      imagesRef.current[0].onload = () => {
        canvas.width = imagesRef.current[0].width;
        canvas.height = imagesRef.current[0].height;

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

      // Ensure scroll fraction does not exceed 1 to prevent errors when the user bounces past the page edges
      const clampedFraction = Math.max(0, Math.min(1, scrollFraction));

      // Map the 0.0 - 1.0 fraction to an exact integer in our image array
      const frameIndex = Math.min(
        frameUrls.length - 1,
        Math.floor(clampedFraction * frameUrls.length)
      );

      // Image Renderer
      requestAnimationFrame(() => {
        const img = imagesRef.current[frameIndex]

        // Ensure the image exists and is fully loaded before drawing
        // Paints the new image over the old one
        if (img && img.complete) {
          context.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);

    // Cleanup listener when the component unmounts
    return () => window.removeEventListener("scroll", handleScroll);
  }, [frameUrls]) 

  // Downloads a zip with the extracted image sequence, ScrollAnimation component, and usage code snippet
  const handleExportZip = async () => {
    if (frameUrls.length === 0) return;
    setIsExporting(true);

    try {
      console.log("Initializing JSZip...");
      const zip = new JSZip();

      // Add the Scroll Animation component and usage snippet to the root of the ZIP
      zip.file("ScrollAnimation.tsx", getTsxComponentCode());
      zip.file("page.tsx", getReactUsageSnippet(frameUrls.length));

      // Create the images folder mimicking a Next.js /public/ structure
      const imgFolder = zip.folder("public/images");
      if (!imgFolder) throw new Error("Could not create image folder in zip.");

      // 3. Fetch each Blob URL and add it to the ZIP folder
      for (let i = 0; i < frameUrls.length; i++) {
        const url = frameUrls[i];
        // Fetch the data back out of the Blob URL
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Pad the index to match our component's expected format (e.g., frame_0001.jpg)
        // Image index number starts at 1
        const frameIndex = (i + 1).toString().padStart(4, "0");
        imgFolder.file(`frame_${frameIndex}.jpg`, blob);
      }

      console.log("Generating ZIP file...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      console.log("Triggering download...");
      saveAs(zipBlob, "scroll-sequence-animation.zip");

    } catch (error) {
      console.error("Error creating ZIP:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="flex flex-col items-center min-h-dvh justify-center px-4 pb-8 bg-zinc-50 font-sans text-black">
      {/* Hero Section */}
      <section className="flex flex-col gap-25 pt-50 items-center justify-center min-h-dvh max-w-6xl">
        {/* Tagline */}
        <section className="flex flex-col gap-8 items-center justify-center max-w-6xl">
          <h1 className="font-black text-6xl text-center leading-18">Turn any MP4 into a <br/><span className="font-serif italic font-medium text-cyan-500 tracking-tight">Scroll Sequence</span></h1>
          <p className="text-zinc-500 font-semibold">Upload video. Extract Frames. Download code.</p>

          <button
            onClick={() => document.getElementById("generator")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-black rounded-full px-8 py-4 text-white font-bold text-lg hover:bg-black/85 hover:cursor-pointer"
          >
            Try Now
          </button>
        </section>

        {/* Features */}
        <section className="flex flex-col md:flex-row gap-8 px-8 md:px-16 max-w-6xl">
          <div className="bg-white shadow-md rounded-2xl p-12 border border-gray-200">
            <h2 className="text-4xl font-serif italic font-medium text-cyan-500 mb-3">Free & Private</h2>
            <p className="text-zinc-500">Powered by WebAssembly. Your video never leaves your browser.  Lightning fast and completely private.</p>
          </div>

          <div className="bg-white shadow-md rounded-2xl p-12 border border-gray-200">
            <h2 className="text-4xl font-serif italic font-medium text-cyan-500 mb-3">Copy-Paste Code</h2>
            <p className="text-zinc-500">Downloads a ready-to-use React component and your optimized image sequence. Zero configuration needed.</p>
          </div>
        </section>
      </section>

      {/* Show Upload or Scroll Sequence Preview */}
      <section id="generator" className="flex w-full max-w-6xl flex-col min-h-dvh items-center justify-between pt-4">
        {frameUrls.length === 0 ? (
          <section className="flex flex-col gap-8 mt-20 items-center justify-center">
            <h1 className="font-black text-6xl text-center leading-tight">Scroll Sequence <br/><span className="font-serif italic font-medium text-cyan-500">Generator</span></h1>

            {/* Upload File */}
            <DragDropZone
              file={file}
              onFileChange={validateAndSetFile}
              disabled={isProcessing}
              accept="video/mp4,video/quicktime"
            />

            {/* Generate Sequence Button */}
            {file && (
              <div className="flex flex-col items-center">
                <button 
                  onClick={handleExtractFrames}
                  disabled={isProcessing || !loaded}
                  className="px-8 py-3 bg-black text-white font-bold text-lg rounded-full hover:bg-black/85 hover:cursor-pointer transition-all active:scale-98"
                >
                  {isProcessing ? `Generating... ${progress}%` : "Generate Scroll Sequence"}
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-col w-full gap-3 mt-20 items-center justify-center">
            <h1 className="font-black text-6xl text-center leading-tight">Animation <span className="font-serif italic font-medium text-cyan-500">Preview</span></h1>        
            <p className="text-zinc-500 font-semibold">Scroll down to preview your animation.</p>

            {/* Animation Preview */}
            <section 
              ref={containerRef}
              className="relative h-[300vh] w-full max-w-4xl"
              // h-[100vh] is h-screen
              // height must be >100vh to be scrollable
              // the amount >100vh determines the speed of the animation, larger = slower, smaller = faster  
            >  
              <div
                // sticky top-0 keeps the animation on screen while the user scrolls
                className="sticky top-0 w-full h-screen flex items-center justify-center"
              > 
                <div className="flex items-center justify-center w-full rounded-2xl overflow-hidden shadow-2xl border-12 border-white">
                  <canvas ref={canvasRef} className="w-full h-auto"/>   
                </div>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-row gap-4 pb-16">
              {/* Reset Button */}
              <button
                onClick={() => {
                  setFrameUrls([])
                  setFile(null)
                  setProgress(0)
                }}
                className="px-8 py-3 bg-black text-white font-bold text-lg rounded-full hover:bg-black/85 hover:cursor-pointer transition-all active:scale-98"
              >
                Change Video
              </button>

              {/* Export Button */}
              <button
                onClick={() => handleExportZip()}
                disabled={isExporting}
                className="px-8 py-3 bg-black text-white font-bold text-lg rounded-full hover:bg-black/85 hover:cursor-pointer transition-all active:scale-98"
              >
                {isExporting ? "Packaging ZIP..." : "Export to ZIP"}
              </button>
            </div>

          </section>
        )}

        {/* Footer */}
        <div className="flex w-full flex-row px-8 gap-2 items-center justify-between">
          <p className="text-gray-400">Built with ❤️ by <span className="text-zinc-500 font-semibold hover:text-black hover:cursor-pointer">Jayden</span></p>
          <div className="flex flex-row gap-2 items-center justify-center">
            <GithubLogo className="w-6 text-gray-400 hover:text-black hover:cursor-pointer transition-colors" />
            <XLogo className="w-5 text-gray-400 hover:text-black hover:cursor-pointer transition-colors" />
          </div>
        </div>
      </section>
    </main>
  );
}
