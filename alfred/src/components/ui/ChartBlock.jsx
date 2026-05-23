// components/ChartBlock.jsx
"use client"
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import {
  LineChart, BarChart, AreaChart, ScatterChart,
  Line, Bar, Area, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"

const COLORS = [
  "#7c3aed",  // violet
  "#10b981",  // emerald green
  "#f59e0b",  // amber
  "#3b82f6",  // blue
  "#ef4444",  // red
  "#ec4899",  // pink
  "#14b8a6",  // teal
  "#f97316",  // orange
]

const TOOLTIP_STYLE = {
  backgroundColor: "#0d0d0d",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 11,
  fontFamily: "'IBM Plex Mono', monospace",
}

const AXIS_STYLE = {
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', monospace",
  fill: "rgba(255,255,255,0.35)",
}

export function ChartBlock({ data }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

const renderChart = () => {
  const { type, data: chartData, lines, bars, areas, xKey = "x" } = data

  const normalizedData = type === "pie"
    ? chartData.map(item => ({
        ...item,
        name: item.name || item.label || item.key || "unknown",
        value: item.value || item.count || item.y || 0,
      }))
    : chartData


    
    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 20, left: 0, bottom: 10 },
    }
     
    const commonAxes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey={xKey}
          tick={AXIS_STYLE}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
          label={data.xLabel ? {
            value: data.xLabel,
            position: "insideBottom",
            offset: -5,
            style: AXIS_STYLE,
          } : undefined}
        />
        <YAxis
          tick={AXIS_STYLE}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          tickLine={false}
          label={data.yLabel ? {
            value: data.yLabel,
            angle: -90,
            position: "insideLeft",
            style: AXIS_STYLE,
          } : undefined}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
        <Legend
          wrapperStyle={{
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
            color: "rgba(255,255,255,0.4)",
          }}
        />
      </>
    )

    // get data keys (everything except x key)
    const dataKeys = lines || bars || areas ||
      Object.keys(chartData[0] || {}).filter(k => k !== xKey).map((key, i) => ({
        key,
        color: COLORS[i % COLORS.length],
      }))

    if (type === "line") {
      return (
        <LineChart {...commonProps}>
          {commonAxes}
          {dataKeys.map((l, i) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              stroke={l.color || COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: l.color || COLORS[i % COLORS.length] }}
            />
          ))}
        </LineChart>
      )
    }

    if (type === "area") {
      return (
        <AreaChart {...commonProps}>
          {commonAxes}
          {dataKeys.map((a, i) => (
            <Area
              key={a.key}
              type="monotone"
              dataKey={a.key}
              stroke={a.color || COLORS[i % COLORS.length]}
              fill={`${a.color || COLORS[i % COLORS.length]}22`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      )
    }

    if (type === "bar") {
      return (
        <BarChart {...commonProps}>
          {commonAxes}
          {dataKeys.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              fill={b.color || COLORS[i % COLORS.length]}
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
          ))}
        </BarChart>
      )
    }

    if (type === "scatter") {
      return (
        <ScatterChart {...commonProps}>
          {commonAxes}
          <Scatter
            data={chartData}
            fill={COLORS[0]}
            opacity={0.8}
          />
        </ScatterChart>
      )
    }

if (type === "pie") {
  return (
    <PieChart margin={{ top: 30, right: 80, bottom: 10, left: 80 }}>  {/* ← margin for labels */}
      <Pie
        data={normalizedData}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={100}   // ← reduced from 120
        innerRadius={45}
        paddingAngle={3}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
        labelLine={{ stroke: "rgba(255,255,255,0.15)" }}
      >
        {normalizedData.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.9} />
        ))}
      </Pie>
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        formatter={(value, name) => [value, name]}
      />
      <Legend
        formatter={(value, entry) => (
          <span style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {entry.payload.name}
          </span>
        )}
      />
    </PieChart>
  )
}
    return <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>unsupported chart type: {type}</div>
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        margin: "12px 0",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#000000",
        padding: "2.5rem 1rem 1.5rem",
      }}
    >
      {/* badge */}
      <span style={{
        position: "absolute", top: 10, left: 12,
        fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
        color: "rgba(161,161,170,0.5)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "2px 8px", borderRadius: 6,
      }}>
        {data.type} chart
      </span>

      {/* copy */}
      <button
        onClick={copy}
        style={{
          position: "absolute", top: 8, right: 10,
          padding: "6px", borderRadius: 6,
          border: copied ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(255,255,255,0.08)",
          background: copied ? "rgba(124,58,237,0.1)" : "rgba(24,24,27,0.6)",
          color: copied ? "#a78bfa" : "rgba(161,161,170,0.6)",
          cursor: "pointer", opacity: hovered || copied ? 1 : 0,
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>

      {/* title */}
{data.title && (
  <div style={{
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "rgba(167,139,250,0.7)",
    marginBottom: 16,
    textAlign: "center",
    whiteSpace: "nowrap",      // ← single line
    overflow: "hidden",
    textOverflow: "ellipsis",  // ← ... if too long
    paddingRight: 40,          // ← don't overlap copy button
  }}>
    {data.title}
  </div>
)}

      {/* chart */}
{/* chart */}
<div style={{ width: "100%", overflowX: "auto" }}>
  <div style={{ minWidth: 500 }}>  {/* ← minimum width before scroll kicks in */}
<ResponsiveContainer width="100%" height={data.type === "pie" ? 380 : 300}>
  {renderChart()}
</ResponsiveContainer>
  </div>
</div>
    </div>
  )
}