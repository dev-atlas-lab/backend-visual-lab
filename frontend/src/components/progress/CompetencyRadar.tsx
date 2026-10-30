/**
 * Competency Radar & Engineer Mastery Hexagon — Backend Visual Lab
 * Pure SVG Radar Chart calculating systems engineering proficiency across 6 dimensions.
 */

interface RadarDimension {
  axis: string;
  label: string;
  value: number; // 0 to 100
}

interface CompetencyRadarProps {
  dimensions: RadarDimension[];
  size?: number;
}

export function CompetencyRadar({ dimensions, size = 320 }: CompetencyRadarProps) {
  const center = size / 2;
  const radius = (size / 2) - 45; // Leave margin for labels
  const totalAxes = dimensions.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Grid levels (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1.0];

  // Calculate polygon points
  const polygonPoints = dimensions
    .map((dim, idx) => {
      const angle = angleSlice * idx - Math.PI / 2;
      const r = radius * (Math.max(15, dim.value) / 100);
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: "visible" }}
        role="img"
        aria-label="Systems Engineering Competency Radar Chart"
      >
        {/* Background Concentric Grid Polygons */}
        {levels.map((level, lIdx) => {
          const levelPoints = Array.from({ length: totalAxes })
            .map((_, idx) => {
              const angle = angleSlice * idx - Math.PI / 2;
              const r = radius * level;
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <polygon
              key={lIdx}
              points={levelPoints}
              fill="transparent"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              strokeDasharray={lIdx === 3 ? "none" : "3,3"}
            />
          );
        })}

        {/* Axis Lines from Center to Edges */}
        {dimensions.map((_, idx) => {
          const angle = angleSlice * idx - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="var(--border-subtle)"
              strokeWidth="1"
            />
          );
        })}

        {/* Dynamic Filled Competency Area */}
        <polygon
          points={polygonPoints}
          fill="rgba(226, 161, 115, 0.22)"
          stroke="var(--accent)"
          strokeWidth="2.5"
          style={{
            filter: "drop-shadow(0 0 10px rgba(226, 161, 115, 0.35))",
            transition: "all 0.5s ease-out",
          }}
        />

        {/* Vertex Markers & Labels */}
        {dimensions.map((dim, idx) => {
          const angle = angleSlice * idx - Math.PI / 2;
          const r = radius * (Math.max(15, dim.value) / 100);
          const cx = center + r * Math.cos(angle);
          const cy = center + r * Math.sin(angle);

          // Label coordinates slightly beyond radius
          const labelR = radius + 24;
          const lx = center + labelR * Math.cos(angle);
          const ly = center + labelR * Math.sin(angle);

          return (
            <g key={idx}>
              {/* Vertex Circle */}
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill="var(--accent-strong)"
                stroke="var(--surface-0)"
                strokeWidth="2"
              />

              {/* Text Label */}
              <text
                x={lx}
                y={ly}
                textAnchor={Math.abs(Math.cos(angle)) < 0.3 ? "middle" : Math.cos(angle) > 0 ? "start" : "end"}
                dominantBaseline="central"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  fill: "var(--text-secondary)",
                  letterSpacing: "0.02em",
                }}
              >
                {dim.label} ({dim.value}%)
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
