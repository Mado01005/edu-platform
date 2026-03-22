import SubjectCard from './SubjectCard';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}

export default function ProgressRing({ percentage, size = 52, strokeWidth = 4, color }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Map Tailwind gradient classes to actual hex colors for SVG
  const colorMap: Record<string, string> = {
    'from-indigo-500 to-purple-500': '#818cf8',
    'from-blue-500 to-cyan-500': '#38bdf8',
    'from-green-500 to-emerald-500': '#34d399',
    'from-red-500 to-orange-500': '#f87171',
    'from-pink-500 to-rose-500': '#f472b6',
    'from-yellow-500 to-amber-500': '#fbbf24',
    'from-teal-500 to-cyan-500': '#2dd4bf',
    'from-violet-500 to-purple-500': '#a78bfa',
  };

  const strokeColor = colorMap[color] || '#818cf8';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${strokeColor}40)` }}
        />
      </svg>
      {/* Percentage label in the center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black text-white drop-shadow-md">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}
