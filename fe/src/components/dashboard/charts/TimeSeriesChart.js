import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from 'antd';
import Plotly from 'plotly.js-dist';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekOfYear);

const TimeSeriesChart = ({ data, groupBy }) => {
  const chartRef = useRef(null);

  // Update data processing with better date handling
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const formatDate = (date) => {
      if (groupBy === 'Tuần') {
        const weekNumber = dayjs(date).week();
        const yearNumber = dayjs(date).year();
        return `Tuần ${weekNumber}/${yearNumber}`;
      } else if (groupBy === 'Tháng') {
        return dayjs(date).format('MM/YYYY');
      } else if (groupBy === 'Năm') {
        return dayjs(date).format('YYYY');
      } else {
        return dayjs(date).format('DD/MM/YYYY');
      }
    };

    return {
      x: data.map(item => formatDate(item.time)),
      y: data.map(item => item.count),
      labels: data.map(item => {
        if (groupBy === 'Tuần') {
          const startOfWeek = dayjs(item.time).startOf('week').format('DD/MM');
          const endOfWeek = dayjs(item.time).endOf('week').format('DD/MM');
          return `${startOfWeek} - ${endOfWeek}`;
        } else if (groupBy === 'Tháng') {
          return dayjs(item.time).format('MM/YYYY');
        } else if (groupBy === 'Năm') {
          return dayjs(item.time).format('YYYY');
        } else {
          return dayjs(item.time).format('DD/MM/YYYY');
        }
      })
    };
  }, [data, groupBy]);

  // Vẽ biểu đồ với useEffect
  useEffect(() => {
    if (!processedData) return;

    const chartElement = chartRef.current;

    const plotData = [{
      type: 'bar',
      x: processedData.x,
      y: processedData.y,
      marker: {
        color: '#1f77b4',
        line: {
          color: 'white',
          width: 1
        }
      },
      hovertemplate: `
        %{customdata}<br>
        Số lần in=%{y}<br>
        <extra></extra>
      `,
      customdata: processedData.labels
    }];

    // Tính toán số lượng nhãn cần hiển thị để tránh chồng lấn
    let showTickLabels = processedData.x;
    let nticks = Math.min(processedData.x.length, 12); // tối đa 12 nhãn
    let tickvals = [];
    let ticktext = [];
    if (processedData.x.length > nticks) {
      // Chỉ hiển thị các nhãn cách đều
      const step = Math.ceil(processedData.x.length / nticks);
      for (let i = 0; i < processedData.x.length; i += step) {
        tickvals.push(processedData.x[i]);
        ticktext.push(processedData.x[i]);
      }
    } else {
      tickvals = processedData.x;
      ticktext = processedData.x;
    }

    const layout = {
      margin: { t: 80, l: 60, r: 30, b: 100 },
      height: 500,
      paper_bgcolor: '#f8f8f8',
      plot_bgcolor: '#f8f8f8',
      font: {
        size: 12,
        color: '#666'
      },
      title: {
        text: `Số lần in phiếu theo ${groupBy.toLowerCase()}`,
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9, // giống FieldFrequencyChart
        xanchor: 'center',
        yanchor: 'top'
      },
      xaxis: {
        title: {
          text: groupBy === 'Tuần' ? 'Tuần trong năm'
            : groupBy === 'Tháng' ? 'Tháng'
            : groupBy === 'Năm' ? 'Năm'
            : 'Ngày',
          font: { size: 12, color: '#666' }
        },
        gridcolor: '#e6e6e6', // thống nhất grid
        zeroline: false,
        tickangle: 0, // nằm ngang
        tickvals: tickvals,
        ticktext: ticktext,
        tickfont: { 
          size: 10
        },
        automargin: true
      },
      yaxis: {
        title: {
          text: 'Số lần in',
          font: { size: 12, color: '#666' }
        },
        gridcolor: '#e6e6e6', // thống nhất grid
        zeroline: false
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
        filename: 'time_series_chart',
        height: 800,
        width: 1200,
        scale: 2
      }
    };

    if (chartElement) {
      Plotly.newPlot(chartElement, plotData, layout, config);
    }

    return () => {
      if (chartElement) {
        Plotly.purge(chartElement);
      }
    };
  }, [processedData, groupBy]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>📈 Số lần in phiếu theo {groupBy.toLowerCase()}</span>}
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: 12 }}
    >
      <div ref={chartRef} style={{ width: '100%', height: 500 }}></div>
    </Card>
  );
};

export default TimeSeriesChart;
