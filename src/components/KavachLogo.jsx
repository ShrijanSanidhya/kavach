import React from 'react';

export default function KavachLogo({ size = 36, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center gap-3">
        <svg
          height={size}
          viewBox="0 0 24 24"
          fill="transparent"
          stroke="#00C8FF"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 8px rgba(0,200,255,0.5))" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M12 8v8M8 12h8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span
          style={{
            fontFamily: "monospace",
            fontWeight: 900,
            letterSpacing: "4px",
            fontSize: `${size * 0.8}px`,
            background: "linear-gradient(90deg, #00C8FF, #FFFFFF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          KAVACH
        </span>
      </div>
      {subtitle && (
        <span
          style={{
            marginTop: "4px",
            fontSize: "8px",
            letterSpacing: "3px",
            color: "#2A4A6B",
            textTransform: "uppercase",
            fontWeight: 700
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
