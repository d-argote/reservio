'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'

export interface HBarDatum {
  label: string
  available: number
  total: number
  /** Optional display name override */
  displayLabel?: string
}

interface Props {
  data: HBarDatum[]
  height?: number
  availableColor?: string
  totalColor?: string
  animationDuration?: number
  formatValue?: (v: number) => string
}

/**
 * D3 horizontal stacked bar chart (available vs total per category).
 * Animated, interactive, responsive.
 */
export function D3HorizontalBars({
  data,
  height,
  availableColor = '#00288e',
  totalColor = '#dde1ff',
  animationDuration = 650,
  formatValue = (v) => String(v),
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedWidthRef = useRef(0)
  const [redrawCount, setRedrawCount] = useState(0)
  const triggerRedraw = useCallback(() => setRedrawCount(n => n + 1), [])

  // Measure container width and re-measure on resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    renderedWidthRef.current = el.clientWidth
    triggerRedraw()
    const observer = new ResizeObserver(entries => {
      renderedWidthRef.current = entries[0].contentRect.width
      triggerRedraw()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [triggerRedraw])

  const barH = 20
  const gap = 20
  const marginTop = 8
  const marginBottom = 12
  const marginLeft = 0   // labels rendered as HTML
  const marginRight = 40

  const computedHeight = height ?? (data.length * (barH + gap) + marginTop + marginBottom)

  useEffect(() => {
    const renderedWidth = renderedWidthRef.current
    if (!svgRef.current || !containerRef.current || !data.length || !renderedWidth) return
    const svgEl = svgRef.current

    const totalW = renderedWidth

    // Left margin accounts for label column rendered as HTML overlay;
    // we just inset the bar area
    const labelW = 120
    const innerW = Math.max(totalW - labelW - marginRight, 10)
    const innerH = computedHeight - marginTop - marginBottom

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', totalW).attr('height', computedHeight)

    const g = svg.append('g').attr('transform', `translate(${labelW},${marginTop})`)

    const maxTotal = d3.max(data, d => d.total) ?? 1
    const xScale = d3.scaleLinear().domain([0, maxTotal]).range([0, innerW])

    const tooltip = d3.select(tooltipRef.current)

    data.forEach((d, i) => {
      const y = i * (barH + gap)

      // Background (total) bar
      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', xScale(d.total))
        .attr('height', barH)
        .attr('rx', barH / 2).attr('ry', barH / 2)
        .attr('fill', totalColor)

      // Available bar — animated
      const availW = xScale(d.available)
      const availBar = g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', 0)
        .attr('height', barH)
        .attr('rx', barH / 2).attr('ry', barH / 2)
        .attr('fill', availableColor)
        .style('cursor', 'pointer')

      availBar.transition()
        .duration(animationDuration)
        .ease(d3.easeCubicOut)
        .delay(i * 80)
        .attr('width', availW)

      // Count label
      const labelEl = g.append('text')
        .attr('x', xScale(d.total) + 6)
        .attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#444653')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('font-family', 'Inter, sans-serif')
        .attr('opacity', 0)
        .text(`${formatValue(d.available)}/${formatValue(d.total)}`)

      labelEl.transition()
        .duration(animationDuration)
        .delay(i * 80 + animationDuration * 0.5)
        .attr('opacity', 1)

      // Hover interaction on the full row
      const hitTarget = g.append('rect')
        .attr('x', -labelW).attr('y', y - gap / 4)
        .attr('width', totalW).attr('height', barH + gap / 2)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')

      hitTarget
        .on('mouseover', function (event) {
          availBar.transition().duration(80).attr('fill', '#173bab')
          const pct = d.total > 0 ? ((d.available / d.total) * 100).toFixed(0) : '0'
          tooltip.style('opacity', '1').html(`
            <div style="font-size:11px;font-weight:700;color:#151c27;margin-bottom:4px">${d.displayLabel ?? d.label}</div>
            <div style="display:flex;gap:12px">
              <div>
                <div style="font-size:16px;font-weight:800;color:#00288e;line-height:1">${formatValue(d.available)}</div>
                <div style="font-size:9px;color:#757684;margin-top:1px">DISPONIBLES</div>
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:#444653;line-height:1">${formatValue(d.total)}</div>
                <div style="font-size:9px;color:#757684;margin-top:1px">TOTAL</div>
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:#006c49;line-height:1">${pct}%</div>
                <div style="font-size:9px;color:#757684;margin-top:1px">DISP.</div>
              </div>
            </div>
          `)

          const rect = containerRef.current!.getBoundingClientRect()
          const ttNode = tooltipRef.current!
          const mouseX = (event as MouseEvent).clientX - rect.left
          const mouseY = (event as MouseEvent).clientY - rect.top
          const ttW = ttNode.offsetWidth || 180
          const ttH = ttNode.offsetHeight || 70
          const left = Math.max(4, Math.min(mouseX - ttW / 2, rect.width - ttW - 4))
          const top = Math.max(4, mouseY - ttH - 10)
          tooltip.style('left', `${left}px`).style('top', `${top}px`)
        })
        .on('mousemove', function (event) {
          const rect = containerRef.current!.getBoundingClientRect()
          const ttNode = tooltipRef.current!
          const ttW = ttNode.offsetWidth || 180
          const ttH = ttNode.offsetHeight || 70
          const mouseX = (event as MouseEvent).clientX - rect.left
          const mouseY = (event as MouseEvent).clientY - rect.top
          const left = Math.max(4, Math.min(mouseX - ttW / 2, rect.width - ttW - 4))
          const top = Math.max(4, mouseY - ttH - 10)
          tooltip.style('left', `${left}px`).style('top', `${top}px`)
        })
        .on('mouseleave', function () {
          availBar.transition().duration(120).attr('fill', availableColor)
          tooltip.style('opacity', '0')
        })
    })

    // Render label text with SVG (left of bars)
    data.forEach((d, i) => {
      const y = i * (barH + gap)
      g.append('text')
        .attr('x', -8).attr('y', y + barH / 2 + 1)
        .attr('dominant-baseline', 'middle')
        .attr('text-anchor', 'end')
        .attr('fill', '#151c27')
        .attr('font-size', '11px')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-weight', '500')
        .text(d.displayLabel ?? (d.label.length > 15 ? d.label.slice(0, 14) + '…' : d.label))
    })

    return () => {
      d3.select(svgEl).selectAll('*').on('mouseover', null).on('mousemove', null).on('mouseleave', null)
      d3.select(svgEl).selectAll('*').remove()
    }
  }, [data, computedHeight, availableColor, totalColor, animationDuration, formatValue, marginRight, redrawCount])

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-on-surface-variant font-body text-sm"
        style={{ height: computedHeight }}
      >
        Sin datos
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="w-full overflow-visible" />
      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant/20">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded inline-block" style={{ background: availableColor }} />
          <span className="font-body text-xs text-on-surface-variant">Disponibles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded inline-block" style={{ background: totalColor }} />
          <span className="font-body text-xs text-on-surface-variant">Total</span>
        </div>
      </div>
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute opacity-0 pointer-events-none bg-white border border-[#e7eefe] rounded-lg px-3 py-2 shadow-[0_4px_16px_rgba(23,28,31,0.12)] transition-opacity duration-[120ms] min-w-[140px] z-[100]"
      />
    </div>
  )
}
