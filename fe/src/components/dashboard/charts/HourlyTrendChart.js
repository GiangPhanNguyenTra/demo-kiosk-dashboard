import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from 'antd';
import Plotly from 'plotly.js-dist';

const HourlyTrendChart = ({ data, workingHours = { start: 7, end: 17 }, groupBy }) => {
  const chartRef = useRef(null);

  const processedData = useMemo(() => {
    if (!data || !data.length) return null;

    // Sắp xếp dữ liệu theo giờ
    const sortedData = [...data].sort((a, b) => a.hour - b.hour);
    
    return {
      x: sortedData.map(item => `${String(item.hour).padStart(2, '0')}:00`),
      y: sortedData.map(item => item.count),
      hours: sortedData.map(item => item.hour),
      average: sortedData.reduce((a, b) => a + b.count, 0) / sortedData.length,
      details: sortedData.map(item => ({
        total: item.totalCount,
        days: item.activeDays
      }))
    };
  }, [data]);

  useEffect(() => {
    if (!processedData) return;

    const chartElement = chartRef.current;

    const plotData = [{
      x: processedData.hours,
      y: processedData.y,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Số lần in',
      line: {
        color:   '#59A14F',
        width: 2,
      },
      marker: {
        color:'#59A14F',
        size: 6,
      },
      hovertemplate: 
        '<span style="color:#fff"><b>Giờ</b>: %{x}:00<br>' +
        '<b>Trung bình</b>: %{y:.1f} lần/ngày<br></span>' +
        '<extra></extra>',
      text: processedData.x,
      textposition: 'top center'
    }];

    const layout = {
      margin: { t: 80, l: 60, r: 30, b: 50 },
      height: 420,
      paper_bgcolor: '#f8f8f8',
      plot_bgcolor: '#f8f8f8',
      font: { 
        family: 'Arial, sans-serif',
        size: 12,
        color: '#444'
      },
      title: {
        text: `Trung bình số lần in phiếu theo giờ`,
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9,
        xanchor: 'center',
        yanchor: 'top'
      },
      xaxis: {
        title: { 
          text: 'Giờ trong ngày',
          font: { size: 14, color: '#444' }
        },
        tickmode: 'array',
        tickvals: processedData.hours,
        ticktext: processedData.x,
        range: [workingHours.start - 0.5, workingHours.end + 0.5],
        showgrid: true,
        showline: true,
        linecolor: '#444',
        linewidth: 1,
        mirror: true,
        fixedrange: false,
        gridcolor: '#e6e6e6'
      },
      yaxis: {
        title: { 
          text: groupBy ? `Số lần in phiếu (${groupBy.toLowerCase()})` : 'Số lần in phiếu',
          font: { size: 14, color: '#444' }
        },
        gridcolor: '#e6e6e6',
        zeroline: true,
        zerolinecolor: '#444',
        rangemode: 'nonnegative',
        autorange: false,
        range: [
          0,
          Math.max(...(processedData?.y || [10]), 10) + 2 // max + 2 đơn vị
        ],
        showgrid: true,
        showline: true,
        linecolor: '#444',
        linewidth: 1,
        mirror: true
      },
      showlegend: false,
      shapes: [{
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: workingHours.start - 0.5,
        x1: workingHours.end + 0.5,
        y0: 0,
        y1: 1,
        fillcolor: '#f8f8f8',
        opacity: 0.5,
        layer: 'below',
        line: { width: 0 }
      }],
      hovermode: 'closest'
    };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: [
        'sendDataToCloud',
        'editInChartStudio',
        'select2d',
        'lasso2d',
        'toggleSpikelines',
        'zoomIn2d',
        'zoomOut2d',
        'autoScale2d'
      ],
      scrollZoom: false
    };

    Plotly.newPlot(chartElement, plotData, layout, config);

    return () => {
      if (chartElement) {
        Plotly.purge(chartElement);
      }
    };
  }, [processedData, workingHours, groupBy]);

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>⏰ Trung bình số lần in phiếu theo giờ</span>}
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <div ref={chartRef} style={{ width: '100%', height: 420, overflowX: 'auto' }} />
    </Card>
  );
};
export default HourlyTrendChart;