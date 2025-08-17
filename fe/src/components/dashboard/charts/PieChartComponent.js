import React, { useEffect, useRef } from 'react';
import { Card } from 'antd';
import Plotly from 'plotly.js-dist';
import { getPlotlyColor } from './chartColors'; // dùng chung cho các charts

const PieChartComponent = ({ data, title, height = 300, type }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    // Format data for pie chart
    const values = data?.length ? data.map(d => d.value || 0) : [1];
    const labels = data?.length ? data.map(d => {
      if (type === 'auth') {
        return d.name === 'CCCD' ? 'CCCD điện tử' : d.name;
      }
      return d.name || 'N/A';
    }) : ['No data'];

    const plotData = [{
      type: 'pie',
      values: values,
      labels: labels,
      textinfo: 'label+percent',
      hovertemplate: '%{label}<br>Số lượng: %{value}<br>Tỷ lệ: %{percent}<extra></extra>',
      textposition: 'auto',
      automargin: true,
      marker: {
        colors: labels.map((label, idx) => getPlotlyColor(idx)),
        line: { color: '#fff', width: 2 }
      }
    }];

    const layout = {
      height: height + 120,
      margin: { t: 80, b: 30, l: 30, r: 120 }, // tăng margin phải để đủ chỗ cho chú thích
      title: {
        text: title,
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9,
        xanchor: 'center',
        yanchor: 'top'
      },
      showlegend: true,
      legend: {
        orientation: 'v',
        y: 0.5,
        yanchor: 'middle',
        x: 1.05,
        xanchor: 'left',
        font: { size: 12 }
      }
    };

    const config = {
      responsive: true,
      displaylogo: false,
      locale: 'vi',
      displayModeBar: true, // Enable mode bar
      modeBarButtonsToShow: [ // Show specific buttons
        'zoom2d',
        'pan2d',
        'select2d',
        'zoomIn2d',
        'zoomOut2d',
        'autoScale2d',
        'resetScale2d',
        'toImage',
        'downloadCsv',
        'downloadImage'
      ],
      toImageButtonOptions: {
        format: 'png',
        filename: `${title}-chart`,
        height: height,
        width: height,
        scale: 2
      }
    };

    Plotly.newPlot(chartElement, plotData, layout, config);

    return () => chartElement && Plotly.purge(chartElement);
  }, [data, height, type, title]);

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>{title}</span>}
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <div ref={chartRef} style={{ opacity: data?.length ? 1 : 0.5, minHeight: height + 120 }} />
    </Card>
  );
};

export default PieChartComponent;
