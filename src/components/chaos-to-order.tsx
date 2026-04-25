export function ChaosToOrder({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Tangled scribble on the left */}
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M80 100 C60 60, 120 40, 100 80 C80 120, 140 140, 120 100 C100 60, 160 80, 140 120 C120 160, 80 140, 100 100" />
        <path d="M70 90 C50 50, 130 30, 110 70 C90 110, 150 130, 130 90 C110 50, 170 70, 150 110" />
        <path d="M90 110 C70 70, 130 50, 110 90 C90 130, 150 150, 130 110 C110 70, 170 90, 150 130" />
        <path d="M60 100 C40 60, 100 40, 80 80 C60 120, 120 140, 100 100 C80 60, 140 80, 120 120" />
        <path d="M100 80 C80 40, 140 20, 120 60 C100 100, 160 120, 140 80 C120 40, 180 60, 160 100" />
        <path d="M75 95 C55 55, 115 35, 95 75 C75 115, 135 135, 115 95 C95 55, 155 75, 135 115" />
        <path d="M85 105 C65 65, 125 45, 105 85 C85 125, 145 145, 125 105 C105 65, 165 85, 145 125" />
        <path d="M65 85 C45 45, 105 25, 85 65 C65 105, 125 125, 105 85" />
        <path d="M95 115 C75 75, 135 55, 115 95 C95 135, 155 155, 135 115" />
        <path d="M55 95 C35 55, 95 35, 75 75 C55 115, 115 135, 95 95" />
        <circle cx="100" cy="45" r="8" />
      </g>

      {/* Wavy connecting line */}
      <path
        d="M160 100 C220 100, 280 60, 340 80 C400 100, 460 140, 520 120 C580 100, 620 100, 640 100"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Neat spiral on the right */}
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M700 100
          C700 100, 700 95, 695 95
          C690 95, 690 100, 690 105
          C690 115, 700 115, 705 110
          C715 100, 715 90, 705 85
          C690 80, 680 90, 680 105
          C680 125, 700 130, 715 120
          C730 105, 730 85, 715 75
          C695 65, 670 80, 670 105
          C670 135, 700 145, 725 130
          C750 110, 750 75, 720 60
          C685 45, 655 70, 655 105
          C655 145, 695 160, 735 140
          C775 115, 775 65, 730 45
          C680 25, 640 60, 640 105
          C640 155, 690 175, 745 150" />
      </g>
    </svg>
  )
}
