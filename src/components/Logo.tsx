import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-16 h-16" }: LogoProps) {
  const [imgSrc, setImgSrc] = React.useState("/icon-512.png");

  const handleError = () => {
    if (imgSrc === "/icon-512.png") {
      setImgSrc("https://i.ibb.co/FbFCpLJf/Chat-GPT-Image-11-de-ago-de-2026-20-20-18.png");
    } else if (imgSrc !== "/logo.svg") {
      setImgSrc("/logo.svg");
    }
  };

  return (
    <img
      src={imgSrc}
      alt="Fronteira Cutelaria Logo"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={`${className} object-contain rounded-xl border border-amber-500/40 bg-[#12141a] p-1 shadow-xl shrink-0`}
    />
  );
}
