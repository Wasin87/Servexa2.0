import React, { useEffect, useRef } from 'react';

interface ConfettiCelebrationProps {
  active: boolean;
  onComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  opacity: number;
}

const COLORS = ['#ea580c', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#fbbf24'];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({ active, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = setTimeout(() => onComplete?.(), 1500);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const total = 165;

    for (let i = 0; i < total; i++) {
      const cannon = i % 3;
      const originX =
        cannon === 0
          ? canvas.width * 0.22
          : cannon === 1
          ? canvas.width * 0.5
          : canvas.width * 0.78;
      const originY =
        cannon === 1 ? canvas.height * 0.55 : canvas.height * 0.38;
      particles.push({
        x: originX + (Math.random() - 0.5) * 140,
        y: originY + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -14 - 4,
        size: Math.random() * 8 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.28,
        opacity: 1
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 3200;

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.rotation += p.vRot;
        if (elapsed > duration * 0.65) {
          p.opacity = Math.max(0, 1 - (elapsed - duration * 0.65) / (duration * 0.35));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onComplete?.();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[10100] pointer-events-none w-full h-full"
      aria-hidden="true"
    />
  );
};
