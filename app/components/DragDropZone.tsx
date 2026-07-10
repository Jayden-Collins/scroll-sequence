"use client";

import { useState, useRef, DragEvent } from "react";

interface DragDropZoneProps {
  file: File | null,
  onFileChange: (file: File) => void,
  disabled?: boolean,
  accept?: string
}

export default function DragDropZone({ 
  file,
  onFileChange,
  disabled,
  accept
 }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e.dataTransfer.files[0]);
    }
  }

  // When user browses and selects file instead of using drag & drop
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileChange(e.target.files[0]);
    }
  }

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out cursor-pointer
          ${isDragging 
            ? "border-cyan-500 bg-cyan-400/10 scale-[1.02]" 
            : "border-zinc-400 bg-zinc-100 hover:border-zinc-300 hover:bg-zinc-200/60 active:scale-98"
          }
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept={accept}
          className="hidden"
        />
        
        {/* Show upload instructions or uploaded file */}
        {file ? (
          <div className="space-y-2">
            <div className="text-cyan-500 text-4xl mb-4">✓</div>
            <p className="font-medium">{file.name}</p>
            <p className="text-zinc-400 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-zinc-400 text-4xl mb-4">📁</div>
            <p className="font-medium text-lg">Drag & Drop your MP4 here</p>
            <p className="text-zinc-400 text-sm">or click to browse</p>
          </div>
        )}
      </div>
    </div>
  )
}
