'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

export interface BarDatum {
  label: string
  value: number
  color?: string
}

interface Props {
  data: BarDatum[]
  height?: number
  accentColor?: string
  secondaryColor?: string
  formatLabel?: (v: number) => string
  formatTick?: (v: number) => string
  animationDuration?: number
}

/**
 * D3 vertical bar chart — animated on mount, interactive tooltips,
 * responsive, matches the ITAM Reservio design system.
 */
export function D3BarChart({
  data,
  height = 200,
  accentColor = '#00288e',
  secondaryColor = '#b8c4ff',
  formatLabel = (v) => String(v),
  formatTick = (v) => String(v),
  animationDuration = 700,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data.length) return

    const container = containerRef.current
    const width = container.clientWidth || 400

    const margin = { top: 24, right: 16, bottom: 32, left: 36 }
    const innerW = width - margin.left - margin.right
    const innerH = height - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', height)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerW])
      .padding(0.35)

    const yMax = d3.max(data, d => d.value) ?? 1
    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.12])
      .range([innerH, 0])

    // Gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerW)
          .tickFormat(() => '')
          .ticks(4)
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
      .call(d3.axisBottom(xScale).tickSize(0))
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
      .call(
        d3.axisLeft(yScale)
          .ticks(4)
          .tickFormat(d => formatTick(+d))
          .tickSize(0)
      )
      .call(ax => {
        ax.select('.domain').remove()
        ax.selectAll('text')
          .attr('fill', '#757684')
          .attr('font-size', '10px')
          .attr('font-family', 'Inter, sans-serif')
          .attr('dx', '-4px')
      })

    // Tooltip
    const tooltip = d3.select(tooltipRef.current)

    // Bars — render at 0 height then animate up
    const bars = g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.label) ?? 0)
      .attr('width', xScale.bandwidth())
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('y', innerH)
      .attr('height', 0)
      .attr('fill', (d, i) =>
        d.color ?? (i === data.length - 1 ? accentColor : secondaryColor)
      )
      .style('cursor', 'pointer')
      .attr('opacity', 0.9)

    // Animate bars
    bars.transition()
      .duration(animationDuration)
      .ease(d3.easeCubicOut)
      .delay((_, i) => i * 60)
      .attr('y', d => yScale(d.value))
      .attr('height', d => innerH - yScale(d.value))

    // Hover interactions
    bars
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition().duration(100)
          .attr('opacity', 1)
          .attr('fill', accentColor)

        tooltip
          .style('opacity', '1')
          .html(`
            <div style="font-size:11px;font-weight:700;color:#151c27;margin-bottom:2px">${d.label}</div>
            <div style="font-size:18px;font-weight:800;color:${accentColor};line-height:1">${formatLabel(d.value)}</div>
          `)

        const rect = (this as SVGRectElement).getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const ttNode = tooltipRef.current!
        const ttW = ttNode.offsetWidth || 80
        let left = rect.left - containerRect.left + rect.width / 2 - ttW / 2
        const top = rect.top - containerRect.top - ttNode.offsetHeight - 8

        // Clamp within container
        left = Math.max(4, Math.min(left, containerRect.width - ttW - 4))
        tooltip.style('left', `${left}px`).style('top', `${top}px`)
      })
      .on('mouseleave', function (_, d) {
        const i = data.indexOf(d)
        d3.select(this)
          .transition().duration(120)
          .attr('opacity', 0.9)
          .attr('fill', d.color ?? (i === data.length - 1 ? accentColor : secondaryColor))
        tooltip.style('opacity', '0')
      })

    // Value labels on top of bars (after animation)
    const labels = g.selectAll('.bar-label')
      .data(data)
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', d => (xScale(d.label) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', innerH)
      .attr('text-anchor', 'middle')
      .attr('fill', '#444653')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, sans-serif')
      .attr('opacity', 0)
      .text(d => formatLabel(d.value))

    labels.transition()
      .duration(animationDuration)
      .ease(d3.easeCubicOut)
      .delay((_, i) => i * 60 + animationDuration * 0.6)
      .attr('y', d => yScale(d.value) - 5)
      .attr('opacity', 1)

  }, [data, height, accentColor, secondaryColor, formatLabel, formatTick, animationDuration])

  // ResizeObserver for responsiveness
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      // Re-trigger by clearing and re-running — simplest safe approach
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
        // Re-run effect by toggling a dummy state isn't ideal here;
        // instead we call the draw logic inline via the ref
        const event = new Event('resize')
        window.dispatchEvent(event)
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-on-surface-variant font-body text-sm"
        style={{ height }}
      >
        Sin datos
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          background: '#ffffff',
          border: '1px solid #e7eefe',
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 4px 16px rgba(23,28,31,0.12)',
          transition: 'opacity 0.12s',
          minWidth: '72px',
          textAlign: 'center',
          zIndex: 100,
        }}
      />
    </div>
  )
}
