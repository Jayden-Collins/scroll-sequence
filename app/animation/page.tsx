"use client";

import { useEffect, useRef, useState } from "react";
import DragDropZone from "../components/DragDropZone";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { getReactUsageSnippet, getTsxComponentCode } from "../utils/exportTemplates";
import JSZip from "jszip";
import { saveAs } from "file-saver"

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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Math.max scales the image to fill the entire canvas
        // Math.min scales the image to fit in the canvas
        const scale = Math.max(canvas.width / imagesRef.current[0].width, canvas.height / imagesRef.current[0].height)
        // Calculate the X and Y margin to center the image
        const x = (canvas.width / 2) - (imagesRef.current[0].width / 2) * scale
        const y = (canvas.height / 2) - (imagesRef.current[0].height / 2) * scale

        context.drawImage(imagesRef.current[0], x, y, imagesRef.current[0].width * scale, imagesRef.current[0].height * scale);
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
          // Math.max scales the image to fill the entire canvas
          // Math.min scales the image to fit in the canvas
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
          // Calculate the X and Y margin to center the image
          const x = (canvas.width / 2) - (img.width / 2) * scale
          const y = (canvas.height / 2) - (img.height / 2) * scale

          context.drawImage(
            img,
            x,
            y,
            img.width * scale,
            img.height * scale
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
  }, [frameUrls]) 

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
    <main className="flex flex-col items-center justify-center bg-white font-sans text-black min-h-screen">
      {/* Show Upload or Scroll Sequence Preview */}
      {frameUrls.length === 0 ? (
      <div className="flex flex-col items-center justify-center mx-auto">
          <DragDropZone
            file={file}
            onFileChange={validateAndSetFile}
            disabled={isProcessing}
            accept="video/mp4,video/quicktime"
          />

          {file && (
            <div className="mt-8 flex flex-col items-center">
              <button 
                onClick={handleExtractFrames}
                disabled={isProcessing || !loaded}
                className="px-8 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
              >
                {isProcessing ? `Generating... ${progress}%` : "Generate Scroll Sequence"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-3 items-center justify-center">
          {/* Reset Button */}
          <button
            onClick={() => {
              setFrameUrls([])
              setFile(null)
              setProgress(0)
            }}
            className="px-8 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-all active:scale-98"
          >
            Start Over
          </button>

          <button
            onClick={() => handleExportZip()}
            disabled={isExporting}
            className="px-8 py-3 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-all active:scale-98"
          >
            {isExporting ? "Downloading..." : "Export to ZIP"}
          </button>

          <section 
            ref={containerRef}
            className="relative h-[300vh]"
            // h-[100vh] is h-screen
            // height must be >100vh to be scrollable
            // the amount >100vh determines the speed of the animation, larger = slower, smaller = faster  
          >
            <div
              className="sticky top-0 w-full" // sticky top-0 keeps the animation on screen while the user scrolls
            > 
              <canvas ref={canvasRef} />   
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
