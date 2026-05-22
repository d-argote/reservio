'use client'

import { CSSProperties } from 'react'
import { scaleLinear, max, line as d3Line, curveMonotoneX } from 'd3'

interface MonthDatum {
  mes: string   // 'YYYY-MM'
  total: number
}

interface ChartPoint {
  label: string
  total: number
}

interface Props {
  data: MonthDatum[]
  color?: string
  height?: number
  quarterly?: boolean   // aggregate into quarters
}

/** Returns the Spanish quarter label for a 'YYYY-MM' string */
function toQuarterKey(mes: string): string {
  const [y, m] = mes.split('-').map(Number)
  const q = Math.ceil(m / 3)
  return `T${q} ${y}`
}

/** Quarter sort key so T1<T2<T3<T4 within same year */
function quarterSortKey(label: string): number {
  const [tq, yr] = label.split(' ')
  const q = parseInt(tq.slice(1))
  const y = parseInt(yr)
  return y * 10 + q
}

function aggregateQuarterly(data: MonthDatum[]): ChartPoint[] {
  const map: Record<string, number> = {}
  for (const d of data) {
    const key = toQuarterKey(d.mes)
    map[key] = (map[key] ?? 0) + d.total
  }
  return Object.entries(map)
    .sort(([a], [b]) => quarterSortKey(a) - quarterSortKey(b))
    .map(([label, total]) => ({ label, total }))
}

function renderChart(points: ChartPoint[], color: string, height: number, gradId: string) {
  if (points.length === 0) return (
    <div className="flex items-center justify-center text-on-surface-variant font-body text-sm py-10">
      Sin datos disponibles
    </div>
  )

  const n = points.length
  const xScale = scaleLinear().domain([0, n - 1]).range([0, 100])
  const yMax = max(points.map(d => d.total)) ?? 0
  const yScale = scaleLinear().domain([0, Math.max(yMax, 1)]).range([100, 0])

  const lineGen = d3Line<ChartPoint>()
    .x((_, i) => xScale(i))
    .y(d => yScale(d.total))
    .curve(curveMonotoneX)

  const pathD = lineGen(points)
  if (!pathD) return null

  const areaD = pathD + ` L ${xScale(n - 1)} 100 L ${xScale(0)} 100 Z`
  const maxVal = Math.max(...points.map(d => d.total))
  const maxIdx = points.findIndex(d => d.total === maxVal)
  // Build Y-axis ticks and always include the actual maximum value
  const rawTicks: number[] = yScale.ticks(5)
  if (maxVal > 0 && !rawTicks.some(t => t === maxVal)) {
    rawTicks.push(maxVal)
    rawTicks.sort((a, b) => a - b)
  }
  const fmt = yScale.tickFormat(5, 'd')
  const yTicks = rawTicks.map(t => ({ val: t, label: fmt(t) }))

  return (
    <div
      className="relative w-full"
      style={{ height, '--mt': '20px', '--mr': '8px', '--mb': '28px', '--ml': '32px' } as CSSProperties}
    >
      {/* Y axis */}
      <div
        className="absolute inset-0 overflow-visible"
        style={{ height: `calc(100% - var(--mt) - var(--mb))`, width: 'var(--ml)', transform: 'translateY(var(--mt))' }}
      >
        {yTicks.map((tick, i) => (
          <div
            key={i}
            style={{ top: `${yScale(tick.val)}%` }}
            className="absolute w-full text-right pr-2 text-[10px] font-mono text-on-surface-variant -translate-y-1/2 tabular-nums"
          >
            {tick.label}
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div
        className="absolute inset-0 overflow-visible"
        style={{
          height: `calc(100% - var(--mt) - var(--mb))`,
          width: `calc(100% - var(--ml) - var(--mr))`,
          transform: 'translateX(var(--ml)) translateY(var(--mt))',
        }}
      >
        <svg viewBox="0 0 100 100" className="overflow-visible w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i} transform={`translate(0,${yScale(tick.val)})`}>
              <line x1={0} x2={100} stroke="#c4c5d5" strokeDasharray="4,4" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {/* Area */}
          <path d={areaD} fill={`url(#${gradId})`} />

          {/* Line */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots */}
          {points.map((p, i) => (
            <path
              key={i}
              d={`M ${xScale(i)} ${yScale(p.total)} l 0.0001 0`}
              vectorEffect="non-scaling-stroke"
              strokeWidth={i === maxIdx && p.total > 0 ? '10' : '6'}
              strokeLinecap="round"
              fill="none"
              stroke={i === maxIdx && p.total > 0 ? color : `${color}88`}
            />
          ))}
        </svg>

        {/* X axis labels — relative container gives left:% a real width to work with */}
        <div style={{ position: 'relative', width: '100%', height: 0 }} className="mt-2">
          {points.map((p, i) => {
            const isFirst = i === 0
            const isLast = i === n - 1
            const isMax = i === maxIdx && p.total > 0
            const showAll = n <= 6
            const isEven = i % 2 === 0
            if (!showAll && !isFirst && !isLast && !isMax && !isEven) return null
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${xScale(i)}%`,
                  top: 0,
                  transform: `translateX(${isFirst ? '0%' : isLast ? '-100%' : '-50%'})`,
                  whiteSpace: 'nowrap',
                }}
                className={`text-[10px] font-mono ${
                  isMax && p.total > 0 ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                {p.label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function LineChartMonthly({ data, color = '#00288e', height = 280, quarterly = false }: Props) {
  const gradId = quarterly ? 'lc-quarterly-grad' : 'lc-monthly-grad'

  const points: ChartPoint[] = quarterly
    ? aggregateQuarterly(data)
    : data.map(d => ({ label: `${d.mes.slice(5)}/${d.mes.slice(2, 4)}`, total: d.total }))

  return renderChart(points, color, height, gradId)
}
