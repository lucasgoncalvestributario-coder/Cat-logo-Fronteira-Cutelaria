import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  color: string;
  flickerSpeed: number;
}

export function EmberBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Pre-allocated particles for zero garbage collection during animation loop
    const particleCount = Math.min(Math.floor(width / 20), 50);
    const particles: Particle[] = [];

    const colors = [
      '#ff6b00', // Flame orange
      '#ff4500', // Crimson red
      '#ffa500', // Deep amber
      '#ffeaad', // Hot ember core spark
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.5 + 0.8,
        speedY: -(Math.random() * 0.9 + 0.4),
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        maxOpacity: Math.random() * 0.7 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        flickerSpeed: (Math.random() - 0.5) * 0.04,
      });
    }

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Render bottom subtle forge ember glow
      const glowGrad = ctx.createLinearGradient(0, height, 0, height - 160);
      glowGrad.addColorStop(0, 'rgba(255, 70, 0, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, height - 160, width, 160);

      // Render particle embers
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.y += p.speedY * (dt * 60);
        p.x += p.speedX * (dt * 60);

        // Natural flickering
        p.opacity += p.flickerSpeed;
        if (p.opacity <= 0.15 || p.opacity >= p.maxOpacity) {
          p.flickerSpeed = -p.flickerSpeed;
        }

        // Reset particle when it floats off the top
        if (p.y < -20) {
          p.y = height + Math.random() * 20;
          p.x = Math.random() * width;
          p.opacity = Math.random() * 0.5 + 0.2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));

        // Soft ember glow
        ctx.shadowBlur = p.size * 4;
        ctx.shadowColor = p.color;

        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden bg-black">
      {/* Canvas for animated rising embers */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  );
}
