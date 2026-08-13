import React, { useState } from 'react';
import officialLogoPng from '../assets/logo.png';

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = "w-16 h-16", alt = "Fronteira Cutelaria Logo" }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Rich standalone SVG vector representation of Fronteira Cutelaria Forge & Blades
    return (
      <svg
        viewBox="0 0 200 200"
        className={`${className} object-contain rounded-xl border border-amber-500/40 bg-[#12141a] p-1 shadow-xl shrink-0`}
        aria-label={alt}
      >
        <defs>
          <linearGradient id="svg-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="svg-dark-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#181a24" />
            <stop offset="100%" stopColor="#0d0e12" />
          </linearGradient>
          <linearGradient id="svg-blade-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Outer Circular Shield */}
        <circle cx="100" cy="100" r="92" fill="url(#svg-dark-bg)" stroke="url(#svg-gold-grad)" strokeWidth="5" />
        <circle cx="100" cy="100" r="84" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />

        {/* Anvil Base */}
        <path d="M 60 145 L 140 145 L 130 130 L 115 130 L 120 115 L 80 115 L 85 130 L 70 130 Z" fill="url(#svg-gold-grad)" />

        {/* Crossed Forged Knives */}
        <g transform="translate(100, 92)">
          {/* Left Knife */}
          <g transform="rotate(-35)">
            <path d="M -5 -45 Q -2 -15 -4 20 L 4 20 Q 2 -15 5 -45 Z" fill="url(#svg-blade-grad)" />
            <rect x="-4" y="20" width="8" height="25" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
            <circle cx="0" cy="42" r="3" fill="#f59e0b" />
          </g>
          {/* Right Knife */}
          <g transform="rotate(35)">
            <path d="M -5 -45 Q -2 -15 -4 20 L 4 20 Q 2 -15 5 -45 Z" fill="url(#svg-blade-grad)" />
            <rect x="-4" y="20" width="8" height="25" rx="3" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
            <circle cx="0" cy="42" r="3" fill="#f59e0b" />
          </g>
        </g>

        {/* Ember Flames */}
        <path d="M 100 42 C 103 48 108 52 108 58 C 108 63 104 66 100 66 C 96 66 92 63 92 58 C 92 52 97 48 100 42 Z" fill="#ff6b00" />
        <circle cx="85" cy="55" r="2" fill="#f59e0b" />
        <circle cx="115" cy="55" r="2" fill="#f59e0b" />

        {/* Outer Star Highlight */}
        <polygon points="100,12 103,19 110,20 105,25 106,32 100,28 94,32 95,25 90,20 97,19" fill="url(#svg-gold-grad)" />
      </svg>
    );
  }

  return (
    <img
      src={officialLogoPng}
      alt={alt}
      loading="eager"
      decoding="sync"
      onError={() => setHasError(true)}
      className={`${className} object-contain rounded-xl border border-amber-500/40 bg-[#12141a] p-1 shadow-xl shrink-0`}
    />
  );
}
