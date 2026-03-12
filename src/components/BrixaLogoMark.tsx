'use client';

import { useId } from 'react';

/** Brixa brand logo: robot with bridge visor and invoice lines. Uses brand colors (primary/primary-light/primary-dark). Size = visual height; bottom aligns with text baseline when container uses items-end. */
export function BrixaLogoMark({ size = 48 }: { size?: number }) {
  const id = useId().replace(/:/g, '');
  const brixaGrad = `brixaGradient-${id}`;
  const accentGrad = `accentGradient-${id}`;
  const viewBoxHeight = 160;
  const viewBoxWidth = 120;
  const viewBoxMinX = 50;
  const width = (size * viewBoxWidth) / viewBoxHeight;
  return (
    <svg
      width={width}
      height={size}
      viewBox={`${viewBoxMinX} 0 ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={brixaGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C96E22" />
          <stop offset="100%" stopColor="#F4A85C" />
        </linearGradient>
        <linearGradient id={accentGrad} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E8893A" />
          <stop offset="100%" stopColor="#F4A85C" />
        </linearGradient>
      </defs>
      {/* Bot head */}
      <rect
        x="50"
        y="60"
        width="120"
        height="90"
        rx="26"
        stroke={`url(#${brixaGrad})`}
        strokeWidth="7"
        fill="#0E1628"
      />
      {/* Antenna */}
      <line x1="110" y1="60" x2="110" y2="42" stroke="#E8893A" strokeWidth="7" />
      <circle cx="110" cy="34" r="6" fill="#E8893A" />
      {/* Bridge visor */}
      <path
        d="M75 95 Q110 70 145 95"
        stroke={`url(#${accentGrad})`}
        strokeWidth="7"
        fill="none"
      />
      {/* Eyes */}
      <circle cx="90" cy="100" r="6" fill="#E8893A" />
      <circle cx="130" cy="100" r="6" fill="#E8893A" />
      {/* Bridge pillars */}
      <line x1="90" y1="95" x2="90" y2="112" stroke="#E8893A" strokeWidth="5" />
      <line x1="110" y1="90" x2="110" y2="112" stroke="#E8893A" strokeWidth="5" />
      <line x1="130" y1="95" x2="130" y2="112" stroke="#E8893A" strokeWidth="5" />
      {/* Invoice lines */}
      <line x1="80" y1="125" x2="140" y2="125" stroke="#6B6560" strokeWidth="5" />
      <line x1="80" y1="138" x2="120" y2="138" stroke="#6B6560" strokeWidth="5" />
    </svg>
  );
}
