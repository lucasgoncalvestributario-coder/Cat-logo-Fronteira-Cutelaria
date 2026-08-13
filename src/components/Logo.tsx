import React, { useState } from 'react';
import officialLogoPng from '../assets/logo.png';

interface LogoProps {
  className?: string;
  alt?: string;
}

export function Logo({ className = "w-16 h-16", alt = "Fronteira Cutelaria Logo" }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <img
        src="/icon-512.png"
        alt={alt}
        loading="eager"
        decoding="sync"
        className={`${className} object-contain shrink-0 max-w-full`}
      />
    );
  }

  return (
    <img
      src={officialLogoPng}
      alt={alt}
      loading="eager"
      decoding="sync"
      onError={() => setHasError(true)}
      className={`${className} object-contain shrink-0 max-w-full`}
    />
  );
}
