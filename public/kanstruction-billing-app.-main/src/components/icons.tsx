// src/components/icons.tsx
export function KanstructionLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kanstruction Logo"
    >
      <g clipPath="url(#clip0_101_2)">
        {/* Gem */}
        <path d="M50 5L10 35L50 95L90 35L50 5Z" fill="#D81B60"/>
        <path d="M50 5L10 35L50 45L50 5Z" fill="#C2185B"/>
        <path d="M50 5L90 35L50 45L50 5Z" fill="#E91E63"/>
        <path d="M10 35L50 95L50 45L10 35Z" fill="#AD1457"/>
        <path d="M90 35L50 95L50 45L90 35Z" fill="#D81B60"/>

        {/* Steel Bars */}
        <rect x="58" y="20" width="4" height="40" fill="#78909C"/>
        <rect x="68" y="20" width="4" height="40" fill="#78909C"/>
        <rect x="78" y="20" width="4" height="40" fill="#78909C"/>

        {/* Bricks */}
        <rect x="58" y="65" width="28" height="10" fill="#BF360C"/>
        <rect x="64" y="78" width="28" height="10" fill="#BF360C" />

         {/* Cement Bag */}
        <path d="M25 50 C20 70, 45 90, 55 85 S 70 60, 60 40 Z" fill="#D2B48C"/>
        <text x="42" y="70" fontFamily="sans-serif" fontSize="10" fill="black" textAnchor="middle">CEMENT</text>

      </g>
      <defs>
        <clipPath id="clip0_101_2">
          <rect width="100" height="100" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  );
}
