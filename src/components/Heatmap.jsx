import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Heatmap({ data, width = 700, height = 240 }) {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const hours = d3.range(0, 24);
    const cellW = w / 24;
    const cellH = h / 7;

    const maxTrips = d3.max(data, (d) => d.trips);
    const color = d3.scaleSequential()
      .domain([0, maxTrips])
      .interpolator(d3.interpolateBlues);

    // Reindex data for quick lookup
    const lookup = {};
    data.forEach((d) => {
      lookup[`${d.day}-${d.hour}`] = d.trips;
    });

    // Cells
    DAYS.forEach((day, di) => {
      hours.forEach((hour) => {
        const trips = lookup[`${day}-${hour}`] || 0;
        g.append('rect')
          .attr('x', hour * cellW)
          .attr('y', di * cellH)
          .attr('width', cellW - 1)
          .attr('height', cellH - 1)
          .attr('rx', 3)
          .attr('fill', color(trips))
          .append('title')
          .text(`${day} ${hour}:00 — ${trips.toLocaleString()} trips`);
      });
    });

    // X-axis (hours)
    const xScale = d3.scaleBand().domain(hours).range([0, w]);
    g.append('g')
      .attr('transform', `translate(0,${h + 4})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues([0, 3, 6, 9, 12, 15, 18, 21])
          .tickFormat((d) => `${d}:00`)
      )
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').remove())
      .call((g) => g.selectAll('text').attr('fill', '#64748B').style('font-size', '10px'));

    // Y-axis (days)
    const yScale = d3.scaleBand().domain(DAYS).range([0, h]);
    g.append('g')
      .attr('transform', 'translate(-6,0)')
      .call(d3.axisLeft(yScale).tickSize(0))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('fill', '#64748B').style('font-size', '11px'));

  }, [data, width, height]);

  return <svg ref={svgRef} />;
}
