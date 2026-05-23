'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface Props {
  data: DonutSlice[]
  size?: number
  innerRadius?: number
  animationDuration?: number
  showTotal?: boolean
  totalLabel?: string
}

/**
 * D3 animated donut chart with hover effects and smooth arc transitions.
 */
export function D3DonutChart({
  data,
  size = 180,
  innerRadius,
  animationDuration = 750,
  showTotal = true,
  totalLabel = 'Total',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const outerR = size / 2 - 4
  const innerR = innerRadius ?? outerR * 0.6

  const total = data.reduce((s, d) => s + d.value, 0)

  useEffect(() => {
    if (!svgRef.current) return
    const svgEl = svgRef.current

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', size).attr('height', size).attr('viewBox', `0 0 ${size} ${size}`)

    const g = svg.append('g').attr('transform', `translate(${size / 2}, ${size / 2})`)

    const pie = d3.pie<DonutSlice>()
      .value(d => d.value)
      .sort(null)
      .padAngle(total > 0 ? 0.025 : 0)

    const arc = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .cornerRadius(3)

    const arcHover = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(innerR)
      .outerRadius(outerR + 6)
      .cornerRadius(3)

    const pieData = pie(total > 0 ? data : [{ label: 'Vacío', value: 1, color: '#e7eefe' }])

    const tooltip = d3.select(tooltipRef.current)
    const containerEl = containerRef.current

    const paths = g.selectAll('.arc')
      .data(pieData)
      .join('path')
      .attr('class', 'arc')
      .attr('fill', d => d.data.color)
      .attr('opacity', 0.9)
      .style('cursor', total > 0 ? 'pointer' : 'default')
      // Start from 0 angle for animation
      .each(function (d) {
        (this as any)._current = { startAngle: d.endAngle, endAngle: d.endAngle }
      })
      .attr('d', d => {
        const start: d3.PieArcDatum<DonutSlice> = {
          ...d,
          startAngle: d.endAngle,
          endAngle: d.endAngle,
        }
        return arc(start) ?? ''
      })

    // Animate arcs in
    paths.transition()
      .duration(animationDuration)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(
          { startAngle: d.endAngle, endAngle: d.endAngle },
          d,
        )
        return (t) => arc(interpolate(t)) ?? ''
      })

    if (total > 0) {
      paths
        .on('mouseover', function (event, d) {
          d3.select(this)
            .raise()
            .transition().duration(100)
            .attr('opacity', 1)
            .attr('d', dd => arcHover(dd as d3.PieArcDatum<DonutSlice>) ?? '')

          const pct = ((d.data.value / total) * 100).toFixed(1)
          tooltip
            .style('opacity', '1')
            .html(`
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="width:10px;height:10px;border-radius:50%;background:${d.data.color};display:inline-block;flex-shrink:0"></span>
                <span style="font-size:11px;font-weight:700;color:#151c27">${d.data.label}</span>
              </div>
              <div style="font-size:18px;font-weight:800;color:${d.data.color};line-height:1">${d.data.value}</div>
              <div style="font-size:10px;color:#757684;margin-top:1px">${pct}% del total</div>
            `)

          if (containerEl) {
            const containerRect = containerEl.getBoundingClientRect()
            const ttNode = tooltipRef.current!
            const ttW = ttNode.offsetWidth || 100
            const ttH = ttNode.offsetHeight || 70
            // Position tooltip relative to mouse
            const mouseX = (event as MouseEvent).clientX - containerRect.left
            const mouseY = (event as MouseEvent).clientY - containerRect.top
            const left = Math.max(4, Math.min(mouseX - ttW / 2, containerRect.width - ttW - 4))
            const top = Math.max(4, mouseY - ttH - 10)
            tooltip.style('left', `${left}px`).style('top', `${top}px`)
          }
        })
        .on('mousemove', function (event) {
          if (containerEl) {
            const containerRect = containerEl.getBoundingClientRect()
            const ttNode = tooltipRef.current!
            const ttW = ttNode.offsetWidth || 100
            const ttH = ttNode.offsetHeight || 70
            const mouseX = (event as MouseEvent).clientX - containerRect.left
            const mouseY = (event as MouseEvent).clientY - containerRect.top
            const left = Math.max(4, Math.min(mouseX - ttW / 2, containerRect.width - ttW - 4))
            const top = Math.max(4, mouseY - ttH - 10)
            tooltip.style('left', `${left}px`).style('top', `${top}px`)
          }
        })
        .on('mouseleave', function () {
          d3.select(this)
            .transition().duration(150)
            .attr('opacity', 0.9)
            .attr('d', dd => arc(dd as d3.PieArcDatum<DonutSlice>) ?? '')
          tooltip.style('opacity', '0')
        })
    }

    return () => {
      d3.select(svgEl).selectAll('path').on('mouseover', null).on('mouseleave', null)
      d3.select(svgEl).selectAll('*').remove()
    }
  }, [data, size, outerR, innerR, animationDuration, total])

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-4">
      {/* SVG chart */}
      <div className="relative">
        <svg ref={svgRef} />
        {showTotal && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ transform: 'none' }}
          >
            <span className="font-headline text-2xl font-bold text-on-surface leading-none">{total}</span>
            <span className="font-body text-xs text-on-surface-variant mt-0.5">{totalLabel}</span>
          </div>
        )}
      </div>

      {/* Legend */}
      {total > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {data.map(d => (
            <div key={d.label} className="flex items-center gap-1.5 text-xs font-body text-on-surface-variant">
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ background: d.color }}
              />
              <span>{d.label}</span>
              <span className="font-semibold text-on-surface ml-0.5">({d.value})</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute opacity-0 pointer-events-none bg-white border border-[#e7eefe] rounded-lg px-3 py-2 shadow-[0_4px_16px_rgba(23,28,31,0.12)] transition-opacity duration-[120ms] min-w-[90px] z-[100]"
      />
    </div>
  )
}
