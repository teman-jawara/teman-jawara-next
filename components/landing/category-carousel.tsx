"use client";

import { useEffect, useRef, useState } from "react";

const categories = [
  { icon: "📚", title: "Karya Tulis" },
  { icon: "📊", title: "Bisnis" },
  { icon: "💻", title: "Teknologi" },
  { icon: "🎨", title: "Desain" },
  { icon: "🎤", title: "Public Speaking" },
  { icon: "⚖️", title: "Debat" },
  { icon: "📱", title: "UI/UX" },
  { icon: "🤖", title: "AI" },
  { icon: "📈", title: "Data Science" },
  { icon: "🎬", title: "Video Kreatif" },
];

export function CategoryCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto scroll
  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) return;

    const scroll = () => {
      if (!isPaused && !isDraggingRef.current) {
        carousel.scrollLeft += 0.5;

        // Reset ke awal setelah melewati set pertama.
        const halfWidth = carousel.scrollWidth / 2;

        if (carousel.scrollLeft >= halfWidth) {
          carousel.scrollLeft = 0;
        }
      }

      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const carousel = carouselRef.current;

    if (!carousel) return;

    isDraggingRef.current = true;
    setIsDragging(true);

    startXRef.current = event.clientX;
    scrollStartRef.current = carousel.scrollLeft;

    carousel.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const carousel = carouselRef.current;

    if (!carousel || !isDraggingRef.current) return;

    const distance = event.clientX - startXRef.current;

    carousel.scrollLeft = scrollStartRef.current - distance;
  };

  const stopDragging = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        stopDragging();
      }}
    >
      {/* Fade kiri */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-white to-transparent" />

      {/* Fade kanan */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />

      <div
        ref={carouselRef}
        className={`flex gap-6 overflow-x-auto px-3 py-6 scrollbar-none ${
          isDragging
            ? "cursor-grabbing select-none"
            : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        {[...categories, ...categories].map((category, index) => (
          <div
            key={`${category.title}-${index}`}
            className="group flex h-[155px] w-[160px] min-w-[160px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-gold-500 bg-white px-4 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] hover:bg-gold-50 hover:shadow-[0_10px_30px_rgba(245,166,35,0.22)]"
          >
            <div className="text-[42px] leading-none transition-transform duration-300 group-hover:scale-110">
              {category.icon}
            </div>

            <span className="text-center text-sm font-semibold text-navy-800">
              {category.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}