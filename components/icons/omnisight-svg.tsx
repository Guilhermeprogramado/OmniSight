import type { FC } from "react";

interface OmniSightSVGProps {
  theme: "dark" | "light";
  scale?: number;
}

export const OmniSightSVG: FC<OmniSightSVGProps> = ({ scale = 1 }) => {
  return (
    <svg
      width={500 * scale}
      height={350 * scale}
      viewBox="0 0 500 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cyanToBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#73fbd3" />
          <stop offset="25%" stopColor="#44e5ca" />
          <stop offset="60%" stopColor="#2191b8" />
          <stop offset="100%" stopColor="#102e70" />
        </linearGradient>
        <linearGradient id="topArchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1b4985" />
          <stop offset="15%" stopColor="#34c8c2" />
          <stop offset="50%" stopColor="#a6ffea" />
          <stop offset="85%" stopColor="#2a86b9" />
          <stop offset="100%" stopColor="#0f2b5c" />
        </linearGradient>
        <linearGradient id="innerArchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0d244a" />
          <stop offset="20%" stopColor="#2cb1ba" />
          <stop offset="50%" stopColor="#8bfbe4" />
          <stop offset="80%" stopColor="#216fa3" />
          <stop offset="100%" stopColor="#0a1a36" />
        </linearGradient>
        <linearGradient id="irisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#52f2d4" />
          <stop offset="50%" stopColor="#1eaec2" />
          <stop offset="100%" stopColor="#0d3b66" />
        </linearGradient>
        <linearGradient id="swirlGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4df8d1" />
          <stop offset="40%" stopColor="#22aab8" />
          <stop offset="80%" stopColor="#113e7a" />
          <stop offset="100%" stopColor="#08142e" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g transform="translate(0, 10)">
        <path
          d="M 60,210 C 120,80 380,80 440,210 C 370,115 130,115 60,210 Z"
          fill="url(#topArchGrad)"
        />
        <path
          d="M 95,190 C 145,110 355,110 405,190 C 350,130 150,130 95,190 Z"
          fill="url(#innerArchGrad)"
        />
        <path
          d="M 175,230 C 200,285 300,325 365,255 C 400,215 410,160 385,125 C 395,155 385,210 345,250 C 290,305 200,270 175,230 Z"
          fill="url(#cyanToBlue)"
        />
        <path
          d="M 200,280 C 240,310 310,300 350,250 C 310,290 240,290 200,280 Z"
          fill="#3de0d0"
          opacity="0.8"
        />
        <path
          d="M 315,145 C 350,175 350,230 310,260 C 265,295 200,260 185,210 C 175,175 195,145 205,155 C 190,180 185,215 215,245 C 250,275 310,255 325,215 C 335,185 315,155 315,145 Z"
          fill="url(#swirlGrad)"
        />
        <path
          d="M 285,148 C 320,170 325,225 295,250 C 265,275 215,255 200,225 C 190,205 195,180 205,165 C 215,150 235,160 225,175 C 215,190 210,205 220,220 C 235,240 270,250 290,230 C 310,210 305,175 280,160 C 270,154 275,142 285,148 Z"
          fill="url(#irisGrad)"
        />
        <path
          d="M 235,225 C 220,220 215,200 225,185 C 240,165 270,165 285,185 C 295,200 290,220 275,228 C 260,235 240,225 245,210 C 250,195 270,195 275,205 C 278,212 268,220 260,215 C 250,210 250,198 260,192 C 270,186 280,200 270,212 C 260,222 240,212 235,225 Z"
          fill="#52f2d4"
        />
        <path
          d="M 200,128 C 230,120 270,120 300,128 C 270,123 230,123 200,128 Z"
          fill="#ffffff"
          opacity="0.6"
          filter="url(#glow)"
        />
        <path
          d="M 215,160 C 240,140 275,145 295,160"
          stroke="#a6ffea"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
        <path
          d="M 185,220 C 180,245 200,270 230,285"
          stroke="#3cdabb"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </g>
    </svg>
  );
};