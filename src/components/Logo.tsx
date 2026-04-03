import React from 'react';
import { cn } from '../lib/utils';

export const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center", className)}>
    <svg viewBox="0 0 460 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-12 w-auto overflow-visible">
      {/* 3x3 Grid of Squares */}
      <rect x="10" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="42" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="74" y="20" width="22" height="22" rx="4" fill="#E31E24" />
      
      <rect x="10" y="52" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="42" y="52" width="22" height="22" rx="4" fill="#E31E24" />
      <rect x="74" y="52" width="22" height="22" rx="4" fill="#2E3192" />
      
      <rect x="10" y="84" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="42" y="84" width="22" height="22" rx="4" fill="#2E3192" />
      <rect x="74" y="84" width="22" height="22" rx="4" fill="#2E3192" />

      {/* TILLMAX LTD Text */}
      <text x="110" y="75" fontFamily="Arial, sans-serif" fontSize="68" fontWeight="900" letterSpacing="-2">
        <tspan fill="#2E3192">TILL</tspan>
        <tspan fill="#E31E24">MAX</tspan>
        <tspan fill="#2E3192" fontSize="32" dx="8" dy="-20">LTD</tspan>
      </text>

      {/* Subtitle with lines */}
      <line x1="110" y1="95" x2="145" y2="95" stroke="#E31E24" strokeWidth="1" />
      <text x="155" y="100" fontFamily="Arial, sans-serif" fontSize="20" fill="#333" letterSpacing="2">
        Quality Comes First
      </text>
      <line x1="345" y1="95" x2="380" y2="95" stroke="#E31E24" strokeWidth="1" />
      
      {/* Registered Trademark Symbol */}
      <text x="410" y="25" fontFamily="Arial, sans-serif" fontSize="14" fill="#E31E24">®</text>
    </svg>
    <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-pulse ml-2">DEBUG</div>
  </div>
);
