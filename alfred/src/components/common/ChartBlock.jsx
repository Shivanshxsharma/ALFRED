// components/ChartBlock.jsx
"use client"
import { useState } from "react"
import { Copy, Check } from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js"
import { Line, Bar, Doughnut, Scatter } from "react-chartjs-2"

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler
)

const COLORS = [
  "#7c3aed", "#10b981", "#f59e0b",
  "#3b82f6", "#ef4444", "#ec4899",
  "#14b8a6", "#f97316",
]

const FONT = "'IBM Plex Mono', monospace"
const CHART_WIDTH = 680
const CHART_HEIGHT = 300
const PIE_HEIGHT = 380

const baseOptions = {
  responsive: false,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: {
      labels: {
        color: "rgba(255,255,255,0.5)",
        font: { family: FONT, size: 11 },
        boxWidth: 12,
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: "#0d0d0d",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      titleColor: "#e2e8f0",
      bodyColor: "rgba(255,255,255,0.6)",
      titleFont: { family: FONT, size: 11 },
      bodyFont: { family: FONT, size: 11 },
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,0.35)", font: { family: FONT, size: 10 } },
      grid: { color: "rgba(255,255,255,0.05)" },
      border: { color: "rgba(255,255,255,0.1)" },
    },
    y: {
      ticks: { color: "rgba(255,255,255,0.35)", font: { family: FONT, size: 10 } },
      grid: { color: "rgba(255,255,255,0.05)" },
      border: { color: "rgba(255,255,255,0.1)" },
    },
  },
}

function withAxisLabels(options, data) {
  return {
    ...options,
    scales: {
      ...options.scales,
      x: {
        ...options.scales.x,
        title: data.xLabel ? {
          display: true, text: data.xLabel,
          color: "rgba(255,255,255,0.3)",
          font: { family: FONT, size: 10 },
        } : undefined,
      },
      y: {
        ...options.scales.y,
        title: data.yLabel ? {
          display: true, text: data.yLabel,
          color: "rgba(255,255,255,0.3)",
          font: { family: FONT, size: 10 },
        } : undefined,
      },
    },
  }
}

export function ChartBlock({ data }) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isPie = data.type === "pie"
  const chartHeight = isPie ? PIE_HEIGHT : CHART_HEIGHT

  const renderChart = () => {
    const { type, data: chartData, lines, bars, areas, points } = data
    const resolvedXKey = data.xKey || "x"

    // ── LINE / AREA ───────────────────────────────────────────────────────
    if (type === "line" || type === "area") {
      const series = lines || areas ||
        Object.keys(chartData[0] || {})
          .filter(k => k !== resolvedXKey)
          .map((key, i) => ({ key, color: COLORS[i % COLORS.length] }))

      const labels = chartData.map(d => d[resolvedXKey])
      const datasets = series.map((s, i) => {
        const color = s.color || COLORS[i % COLORS.length]
        return {
          label: s.key,
          data: chartData.map(d => d[s.key]),
          borderColor: color,
          backgroundColor: type === "area" ? `${color}22` : "transparent",
          fill: type === "area",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.4,
        }
      })

      const options = withAxisLabels({
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: { ...baseOptions.plugins.legend, display: datasets.length > 1 },
        },
      }, data)

      return (
        <Line
          data={{ labels, datasets }}
          options={options}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
        />
      )
    }

    // ── BAR ───────────────────────────────────────────────────────────────
    if (type === "bar") {
      const resolvedXKey2 = data.xKey || "x"
      const isSingleValue =
        (bars?.length === 1 && bars[0].key === "value") ||
        (!bars && chartData[0] && ("value" in chartData[0] || "label" in chartData[0]))

      if (isSingleValue) {
        const labels = chartData.map(d => d[resolvedXKey2] || d.name || d.label)
        const datasets = [{
          label: data.yLabel || "value",
          data: chartData.map(d => d.value),
          backgroundColor: chartData.map((_, i) => `${COLORS[i % COLORS.length]}cc`),
          borderColor: chartData.map((_, i) => COLORS[i % COLORS.length]),
          borderWidth: 1,
          borderRadius: 4,
        }]

        const options = withAxisLabels({
          ...baseOptions,
          plugins: { ...baseOptions.plugins, legend: { display: false } },
          scales: {
            ...baseOptions.scales,
            x: {
              ...baseOptions.scales.x,
              ticks: { ...baseOptions.scales.x.ticks, maxRotation: 15 },
            },
          },
        }, data)

        return (
          <Bar
            data={{ labels, datasets }}
            options={options}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
          />
        )
      }

      // multi-series bar
      const series = bars ||
        Object.keys(chartData[0] || {})
          .filter(k => k !== resolvedXKey2)
          .map((key, i) => ({ key, color: COLORS[i % COLORS.length] }))

      const labels = chartData.map(d => d[resolvedXKey2])
      const datasets = series.map((s, i) => {
        const color = s.color || COLORS[i % COLORS.length]
        return {
          label: s.key,
          data: chartData.map(d => d[s.key]),
          backgroundColor: `${color}cc`,
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
        }
      })

      return (
        <Bar
          data={{ labels, datasets }}
          options={withAxisLabels(baseOptions, data)}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
        />
      )
    }

    // ── SCATTER ───────────────────────────────────────────────────────────
    if (type === "scatter") {
      const seriesConfig = points || []
      const yKey = seriesConfig[0]?.key
        || Object.keys(chartData[0] || {}).find(k => k !== resolvedXKey)
        || "y"
      const pointColor = seriesConfig[0]?.color || COLORS[0]

      const scatterData = chartData.map(d => ({
        x: Number(d[resolvedXKey]),
        y: Number(d[yKey]),
      }))

      const options = withAxisLabels({
        ...baseOptions,
        plugins: { ...baseOptions.plugins, legend: { display: false } },
        scales: {
          x: { ...baseOptions.scales.x, type: "linear" },
          y: { ...baseOptions.scales.y },
        },
      }, data)

      return (
        <Scatter
          data={{
            datasets: [{
              label: yKey,
              data: scatterData,
              backgroundColor: `${pointColor}cc`,
              borderColor: pointColor,
              pointRadius: 5,
              pointHoverRadius: 7,
            }],
          }}
          options={options}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
        />
      )
    }

    // ── PIE ───────────────────────────────────────────────────────────────
    if (type === "pie") {
      const normalized = chartData.map(item => ({
        name: item.name || item.label || item.key || "unknown",
        value: item.value || item.count || item.y || 0,
      }))

      const options = {
        responsive: false,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(255,255,255,0.5)",
              font: { family: FONT, size: 11 },
              padding: 16,
              boxWidth: 12,
            },
          },
          tooltip: baseOptions.plugins.tooltip,
        },
      }

      return (
        <Doughnut
          data={{
            labels: normalized.map(d => d.name),
            datasets: [{
              data: normalized.map(d => d.value),
              backgroundColor: COLORS.map(c => `${c}cc`),
              borderColor: COLORS,
              borderWidth: 1,
              hoverOffset: 6,
            }],
          }}
          options={options}
          width={CHART_WIDTH}
          height={PIE_HEIGHT}
        />
      )
    }

    return (
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
        unsupported chart type: {type}
      </div>
    )
  }

  return (
    <div
      className="not-prose"
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
        boxSizing: "border-box",
      }}
    >
      {/* badge */}
      <span style={{
        position: "absolute", top: 10, left: 12,
        fontSize: 11, fontFamily: FONT,
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
          fontSize: 12, fontFamily: FONT,
          color: "rgba(167,139,250,0.7)",
          marginBottom: 16, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", paddingRight: 40,
        }}>
          {data.title}
        </div>
      )}

      {/* scroll container */}
      <div style={{
        width: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(124,58,237,0.3) transparent",
      }}>
        {/* fixed width canvas wrapper */}
        <div style={{
          width: CHART_WIDTH,
          height: chartHeight,
          minWidth: CHART_WIDTH,
          flexShrink: 0,
        }}>
          {renderChart()}
        </div>
      </div>
    </div>
  )
}