'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export interface AreaDatum {
  label: string     // x-axis label (e.g. "2025-03")
  value: number
}

interface Props {
  data: AreaDatum[]
  height?: number
  color?: string
  fillColor?: string
  animationDuration?: number
  formatLabel?: (v: number) => string
  formatTick?: (label: string) => string
}

/**
 * D3 area / line chart — smooth Catmull-Rom curve, gradient fill,
 * interactive dot + tooltip, animated on mount.
 */
export function D3AreaChart({
  data,
  height = 180,
  color = '#00288e',
  fillColor,
  animationDuration = 900,
  formatLabel = (v) => String(v),
  formatTick = (l) => l.slice(5), // default: strip year from "YYYY-MM"
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return
    const svgEl = svgRef.current
    const containerEl = containerRef.current
    const width = containerEl.clientWidth || 400

    const margin = { top: 24, right: 16, bottom: 32, left: 36 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    // Gradient definition
    const gradId = `area-grad-${Math.random().toString(36).slice(2, 7)}`
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1')

    grad.append('stop').attr('offset', '0%').attr('stop-color', fillColor ?? color).attr('stop-opacity', 0.28)
    grad.append('stop').attr('offset', '100%').attr('stop-color', fillColor ?? color).attr('stop-opacity', 0.03)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const xScale = d3.scalePoint()
      .domain(data.map(d => d.label))
      .range([0, innerW])
      .padding(0.3)

    const yMax = d3.max(data, d => d.value) ?? 1
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.15])
      .range([innerH, 0])

    // Gridlines
    g.append('g')
      .call(
        d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => '').ticks(4)
      )
      .call(gg => {
        gg.select('.domain').remove()
        gg.selectAll('.tick line')
          .attr('stroke', '#e7eefe')
          .attr('stroke-dasharray', '3,3')
      })

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(0).tickFormat(d => formatTick(String(d))))
      .call(ax => {
        ax.select('.domain').attr('stroke', '#c4c5d5')
        ax.selectAll('text')
          .attr('fill', '#757684')
          .attr('font-size', '10px')
          .attr('font-family', 'Inter, sans-serif')
          .attr('dy', '1.2em')
      })

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4).tickSize(0).tickFormat(d => formatLabel(+d)))
      .call(ax => {
        ax.select('.domain').remove()
        ax.selectAll('text')
          .attr('fill', '#757684')
          .attr('font-size', '10px')
          .attr('font-family', 'Inter, sans-serif')
          .attr('dx', '-4px')
      })

    // Area generator
    const area = d3.area<AreaDatum>()
      .x(d => xScale(d.label) ?? 0)
      .y0(innerH)
      .y1(d => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5))

    // Line generator
    const line = d3.line<AreaDatum>()
      .x(d => xScale(d.label) ?? 0)
      .y(d => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5))

    // Area fill path
    const areaPath = g.append('path')
      .datum(data)
      .attr('fill', `url(#${gradId})`)
      .attr('d', area)

    // Clip path for wipe-in animation
    const clipId = `clip-${Math.random().toString(36).slice(2, 7)}`
    defs.append('clipPath').attr('id', clipId)
      .append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', 0).attr('height', innerH + 4)
      .transition()
      .duration(animationDuration)
      .ease(d3.easeCubicOut)
      .attr('width', innerW)

    areaPath.attr('clip-path', `url(#${clipId})`)

    // Line stroke path
    const linePath = g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('clip-path', `url(#${clipId})`)
      .attr('d', line)

    // Interactive dots
    const tooltip = d3.select(tooltipRef.current)

    g.selectAll('.dot')
      .data(data)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.label) ?? 0)
      .attr('cy', d => yScale(d.value))
      .attr('r', 0)
      .attr('fill', '#ffffff')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .style('cursor', 'pointer')
      .transition()
      .duration(200)
      .delay(animationDuration + 50)
      .attr('r', 4.5)

    // Hover overlay line
    const hoverLine = g.append('line')
      .attr('stroke', color)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0)
      .attr('y1', 0).attr('y2', innerH)

    // Invisible hover strips for each data point
    const bandwidth = xScale.step()
    g.selectAll('.hover-strip')
      .data(data)
      .join('rect')
      .attr('class', 'hover-strip')
      .attr('x', d => (xScale(d.label) ?? 0) - bandwidth / 2)
      .attr('y', 0)
      .attr('width', bandwidth)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mouseover', function (event, d) {
        const cx = xScale(d.label) ?? 0
        const cy = yScale(d.value)

        hoverLine.attr('x1', cx).attr('x2', cx).attr('opacity', 0.4)

        g.selectAll('.dot')
          .filter(dd => (dd as AreaDatum).label === d.label)
          .attr('r', 6)
          .attr('stroke-width', 3)

        tooltip.style('opacity', '1').html(`
          <div style="font-size:11px;font-weight:700;color:#151c27;margin-bottom:2px">${d.label}</div>
          <div style="font-size:18px;font-weight:800;color:${color};line-height:1">${formatLabel(d.value)}</div>
          <div style="font-size:9px;color:#757684;margin-top:2px">reservas</div>
        `)

        const rect = containerEl.getBoundingClientRect()
        const ttNode = tooltipRef.current!
        const ttW = ttNode.offsetWidth || 90
        const ttH = ttNode.offsetHeight || 70
        const left = Math.max(4, Math.min(
          cx + margin.left - ttW / 2,
          rect.width - ttW - 4
        ))
        const top = Math.max(4, cy + margin.top - ttH - 14)
        tooltip.style('left', `${left}px`).style('top', `${top}px`)
      })
      .on('mouseleave', function (_, d) {
        hoverLine.attr('opacity', 0)
        g.selectAll('.dot')
          .filter(dd => (dd as AreaDatum).label === d.label)
          .attr('r', 4.5)
          .attr('stroke-width', 2.5)
        tooltip.style('opacity', '0')
      })

    void areaPath
    void linePath

    return () => {
      d3.select(svgEl).selectAll('circle').on('mouseover', null).on('mouseleave', null)
      d3.select(svgEl).selectAll('*').remove()
    }
  }, [data, height, color, fillColor, animationDuration, formatLabel, formatTick])

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-on-surface-variant font-body text-sm"
        style={{ height }}
      >
        Sin datos disponibles
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
      <div
        ref={tooltipRef}
        className="absolute opacity-0 pointer-events-none bg-white border border-[#e7eefe] rounded-lg px-3 py-2 shadow-[0_4px_16px_rgba(23,28,31,0.12)] transition-opacity duration-[120ms] min-w-[80px] text-center z-[100]"
      />
    </div>
  )
}
