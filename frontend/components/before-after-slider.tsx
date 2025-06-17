"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeAfterSliderProps
{
  beforeImage: string;
  afterImage: string;
  initialPosition?: number; // 0-100, default 50
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  initialPosition = 50,
}: BeforeAfterSliderProps)
{
  const [sliderPosition, setSliderPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const updatePosition = (clientX: number) =>
  {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) =>
  {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) =>
  {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  };

  useEffect(() =>
  {
    const handleMouseMove = (e: MouseEvent) =>
    {
      if (!isDragging) return;
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) =>
    {
      if (!isDragging) return;
      e.preventDefault();
      updatePosition(e.touches[0].clientX);
    };

    const handleMouseUp = () =>
    {
      setIsDragging(false);
    };

    const handleTouchEnd = () =>
    {
      setIsDragging(false);
    };

    if (isDragging)
    {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () =>
    {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-black border border-gray-300 dark:border-zinc-700 cursor-ew-resize select-none"
      style={{ aspectRatio: "16/9" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Before Image (Left side) */}
      <div className="absolute inset-0">
        <img
          src={beforeImage}
          alt="Before"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* After Image (Right side) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 0 0 ${sliderPosition}%)`,
        }}
      >
        <img
          src={afterImage}
          alt="After"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Labels - positioned above the clipping to prevent cutoff */}
      <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-30 pointer-events-none">
        Original
      </div>
      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium z-30 pointer-events-none">
        With LUT
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
        style={{
          left: `${sliderPosition}%`,
          transform: "translateX(-50%)",
        }}
      />

      {/* Slider Handle */}
      <div
        ref={sliderRef}
        className="absolute top-1/2 w-10 h-10 bg-white rounded-full shadow-lg border-2 border-gray-300 z-20 pointer-events-none flex items-center justify-center cursor-ew-resize transform -translate-y-1/2"
        style={{
          left: `${sliderPosition}%`,
          transform: "translateX(-50%) translateY(-50%)",
        }}
      >
        <div className="flex space-x-0.5">
          <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
          <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
          <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
        </div>
      </div>

      {/* Hover Instructions */}
      {!isDragging && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium opacity-80 pointer-events-none">
          Drag to compare
        </div>
      )}
    </div>
  );
}
