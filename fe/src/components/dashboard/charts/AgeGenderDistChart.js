import React, { useEffect, useRef } from 'react';
import { Card } from 'antd';
import Plotly from 'plotly.js-dist';
import { getPlotlyColor } from './chartColors'; // dùng chung cho các charts

const AgeGenderDistChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement || !data?.length) return;

    const ageLabels = ['<18', '18-30', '31-50', '>50'];
    // Chọn các mốc chuyển tiếp giữa các nhóm tuổi
    const ageTickVals = [-0.5, 0.5, 1.5, 2.5, 3.5]; // vị trí giữa các cột, 0 nằm sát gốc
    const ageTickText = ['0', '18', '30', '50', ''];
    const femaleTrace = {
      x: ageLabels,
      y: data.map(d => d.female),
      name: 'Nữ',
      type: 'bar',
      marker: {
        color: getPlotlyColor(1),
      },
      hovertemplate:
        'Giới tính=Nữ<br>' +
        'Tuổi=%{x}<br>' +
        'Số lượng=%{y}<extra></extra>'
    };
    const maleTrace = {
      x: ageLabels,
      y: data.map(d => d.male),
      name: 'Nam',
      type: 'bar',
      marker: {
        color: getPlotlyColor(0),
      },
      hovertemplate:
        'Giới tính=Nam<br>' +
        'Tuổi=%{x}<br>' +
        'Số lượng=%{y}<extra></extra>'
    };

    

    const plotData = [femaleTrace, maleTrace];

    const layout = {
      barmode: 'stack',
      height: 420,
      margin: { t: 80, r: 30, l: 50, b: 50 }, // tăng margin phải để đủ chỗ cho chú thích
      xaxis: {
        title: 'Độ tuổi',
        titlefont: { size: 12 },
        tickfont: { size: 10 },
        showgrid: false,
        gridcolor: '#e6e6e6',
        tickvals: ageTickVals,
        ticktext: ageTickText,
        range: [-0.5, ageLabels.length - 0.5]
      },
      yaxis: {
        title: 'Số lượng',
        titlefont: { size: 12 },
        tickfont: { size: 10 },
        showgrid: true,
        gridcolor: '#e6e6e6',
      },
      showlegend: true,
      legend: {
        orientation: 'v',
        xanchor: 'left',
        x: 1.0,
        y: 0.5,
        yanchor: 'middle',
        font: { size: 12 }
      },
      plot_bgcolor: '#f8f8f8',
      bargap: 0,
      bargroupgap: 0,
      title: {
        text: 'Phân bố độ tuổi theo giới tính',
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9, // giống FieldFrequencyChart
        xanchor: 'center',
        yanchor: 'top'
      }
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };

    Plotly.newPlot(chartElement, plotData, layout, config);
    return () => chartElement && Plotly.purge(chartElement);
  }, [data]);

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>👥 Phân bố độ tuổi theo giới tính</span>}
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <div ref={chartRef} style={{ width: '100%', height: 420 }} />
    </Card>
  );
};

export default AgeGenderDistChart;
