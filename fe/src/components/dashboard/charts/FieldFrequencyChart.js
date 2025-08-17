import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from 'antd';
import Plotly from 'plotly.js-dist';
import { getPlotlyColor } from './chartColors'; // dùng chung cho các charts

const FieldFrequencyChart = ({ data }) => {
  const chartRef = useRef(null);

  // Xử lý dữ liệu với useMemo
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Xử lý và sắp xếp dữ liệu
    const allFields = [...data]
      .filter(item => item.value > 0 && item.name !== 'Khác')
      .sort((a, b) => b.value - a.value);

    // Tách thành 2 nhóm: top fields và others
    const topFields = allFields.slice(0, 5); // Hiển thị top 5 lĩnh vực
    const otherFields = allFields.slice(5);
    
    // Tính tổng cho nhóm others
    const otherValue = otherFields.reduce((sum, item) => sum + (item.value || 0), 0);

    // Tạo dữ liệu cuối cùng bao gồm cả nhóm others
    const sortedData = [
      ...topFields,
      ...(otherFields.length > 0 ? [{
        name: `Khác (${otherFields.length} lĩnh vực)`,
        value: otherValue,
        isOther: true,
        details: otherFields
      }] : [])
    ];

    // Tính tổng để tính phần trăm
    const total = sortedData.reduce((sum, item) => sum + item.value, 0);

    return sortedData.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
      color: item.isOther ? '#6c757d' : getPlotlyColor(index)
    }));
  }, [data]);

  // Vẽ biểu đồ với useEffect
  useEffect(() => {
    if (!processedData || processedData.length === 0) return;

    // Store ref value to avoid React hooks warning
    const chartElement = chartRef.current;

    const values = processedData.map(item => item.value);
    const labels = processedData.map(item => item.name);
    const colors = processedData.map(item => item.color);

    const plotData = [{
      type: 'bar',
      orientation: 'h',
      x: values,
      y: labels,
      marker: {
        color: colors,
        line: {
          color: 'white',
          width: 1
        }
      },
      hovertemplate: `
        <span style="color:#fff">
         %{y}<br>
        Tần suất=%{x}<br>
        <extra></extra>
      `
    }];

    const layout = {
      margin: { t: 80, l: 120, r: 30, b: 50 }, // tăng khoảng cách phía trên để tiêu đề không bị che
      height: 480, // tăng chiều cao để hình không bị che tiêu đề
      paper_bgcolor: '#f8f8f8',
      plot_bgcolor: '#f8f8f8',
      font: {
        size: 12,
        color: '#666'
      },
      title: {
        text: 'Tần suất theo lĩnh vực',
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9,
        xanchor: 'center',
        yanchor: 'top'
      },
      xaxis: {
        title: {
          text: 'Số lần in',
          font: { size: 12, color: '#666' }
        },
        gridcolor: '#e6e6e6', // thống nhất grid
        zeroline: false
      },
      yaxis: {
        gridcolor: '#e6e6e6', // thống nhất grid
        zeroline: false,
        automargin: true
      }
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
        'hoverClosestCartesian',
        'hoverCompareCartesian',
        'toggleSpikelines'
      ],
      toImageButtonOptions: {
        format: 'png',
        filename: 'field_frequency_chart',
        height: 600,
        width: 1000,
        scale: 2
      }
    };

    if (chartElement) {
      Plotly.newPlot(chartElement, plotData, layout, config);
    }

    return () => {
      // Use stored reference in cleanup
      if (chartElement) {
        Plotly.purge(chartElement);
      }
    };
  }, [processedData]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>📚 Tần suất theo lĩnh vực</span>}
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <div ref={chartRef} style={{ width: '100%', height: 480 }}></div>
    </Card>
  );
};

export default FieldFrequencyChart;
