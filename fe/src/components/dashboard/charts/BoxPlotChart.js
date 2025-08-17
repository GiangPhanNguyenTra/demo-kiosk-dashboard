import React from 'react';
import { Card } from 'antd';
import Plot from 'react-plotly.js';

const BoxPlotChart = ({ data: filteredData, groupBy }) => {

  const createBoxplotData = () => {
    if (!filteredData || filteredData.length === 0) return [];

    // Debug log to check incoming data structure
    console.log('BoxPlotChart received data:', filteredData.slice(0, 2));

    // Group by printing date (handle both 'date' and 'Ngày' fields)
    const reportCounts = {};
    
    filteredData.forEach(item => {
      // Try both date fields
      const dateValue = item.date || item['Ngày'];
      if (!dateValue) {
        console.warn('Item missing both date fields:', item);
        return;
      }

      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date value:', dateValue, 'from item:', item);
        return;
      }

      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!reportCounts[dateStr]) {
        reportCounts[dateStr] = {
          count: 0,
          weekday: date.getDay() === 0 ? 6 : date.getDay() - 1
        };
      }
      // Use item.count if available, otherwise default to 1
      reportCounts[dateStr].count += (item.count || 1);
    });

    console.log('Report counts:', Object.entries(reportCounts).map(([d, info]) => ({
      date: d,
      count: info.count,
      weekdayIndex: info.weekday
    })));

    // Map weekday index to Vietnamese weekday names
    const weekdayMap = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const dailyPrints = Object.entries(reportCounts)
      .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
      .map(([dateStr, info]) => ({
        date: dateStr,
        count: info.count,
        weekday: weekdayMap[info.weekday]
      }));

    dailyPrints.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group counts by weekday for boxplot display
    const weekdayData = {
      'Thứ 2': [], 'Thứ 3': [], 'Thứ 4': [],
      'Thứ 5': [], 'Thứ 6': [], 'Thứ 7': [],
      'Chủ nhật': []
    };

    dailyPrints.forEach(({ date, weekday, count }) => {
      weekdayData[weekday].push(count);
    });

    // Debug logs
    console.log('Daily prints (sorted):', dailyPrints.map(d => `${d.date} (${d.weekday}): ${d.count}`));
    Object.entries(weekdayData).forEach(([weekday, counts]) => {
      const max = counts.length ? Math.max(...counts) : 0;
      const dates = dailyPrints.filter(d => d.weekday === weekday && d.count === max).map(d => d.date);
      console.log(`${weekday} - Max: ${max} on dates:`, dates);
    });

    // Function to calculate statistics for tooltip
    const calculateStats = (values) => {
      if (!values || values.length === 0) return null;
      const validValues = values.filter(v => v != null);
      if (validValues.length === 0) return null;
      const sorted = [...validValues].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;
      const getPercentile = (arr, p) => {
        const idx = p * (arr.length - 1);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        const weight = idx - lower;
        if (upper === lower) return arr[lower];
        return arr[lower] * (1 - weight) + arr[upper] * weight;
      };
      const median = getPercentile(sorted, 0.5);
      const q1 = getPercentile(sorted, 0.25);
      const q3 = getPercentile(sorted, 0.75);
      const iqr = q3 - q1;
      const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
      const std = Math.sqrt(variance);
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = sorted.filter(v => v < lowerBound || v > upperBound);
      
      return {
        mean: mean.toFixed(2),
        median: median.toFixed(2),
        q1: q1.toFixed(2),
        q3: q3.toFixed(2),
        std: std.toFixed(2),
        outliers,
        min: Math.min(...sorted),
        max: Math.max(...sorted),
        count: sorted.length
      };
    };

    const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    const plotData = weekdays.map(weekday => {
      const values = weekdayData[weekday];
      console.log(`${weekday} values:`, values);
      const stats = calculateStats(values) || { mean: 0, median: 0, q1: 0, q3: 0, std: 0, outliers: [], min: 0, max: 0, count: 0 };
      return {
        y: values.length > 0 ? values : [0],
        type: 'box',
        name: weekday,
        boxmean: true,
        boxpoints: 'outliers',
        marker: { color: 'rgb(8,81,156)', size: 4 },
        line: { color: 'rgb(8,81,156)', width: 1.5 },
        fillcolor: 'rgba(8,81,156,0.6)',
        width: 0.5,
        meanline: { visible: true, color: 'rgb(255,255,255)', width: 2 },
        hoveron: 'boxes+points',
        customdata: [stats],
        hovertemplate: 
          '<b>%{x}</b><br>' +
          'Số lượt in: %{y}<br>' +
          'Trung bình: %{customdata[0].mean}<br>' +
          'Trung vị: %{customdata[0].median}<br>' +
          'Q1 (25%): %{customdata[0].q1}<br>' +
          'Q3 (75%): %{customdata[0].q3}<br>' +
          'Độ lệch chuẩn: %{customdata[0].std}<br>' +
          'Số ngày: %{customdata[0].count}<br>' +
          '<extra></extra>'
      };
    });
    return plotData;
  };

  return (
    filteredData && filteredData.length > 0 ? (
      <Card
        title={<span style={{ fontWeight: 500, fontSize: 16 }}>📊 Phân bố số lượt in theo ngày trong tuần</span>}
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: 12 }}
        extra={<div style={{ fontSize: 10, color: '#666' }}>Hover vào box để xem chi tiết</div>}
      >
        <div style={{ height: 420, position: 'relative' }}>
          <Plot
            data={createBoxplotData()}
            layout={{
              height: 420,
              title: {
                text: `Phân bố số lượt in theo ngày trong tuần`,
                font: { size: 18, family: 'Arial', color: '#444' },
                xref: 'container',
                x: 0.5,
                y: 0.9,
                xanchor: 'center',
                yanchor: 'top'
              },
              margin: { t: 80, r: 10, b: 50, l: 50 },
              // Sửa yaxis: luôn bắt đầu từ 0, kết thúc ở giá trị lớn nhất
              yaxis: {
                title: { text: `Số lượt in${groupBy ? ` (${groupBy.toLowerCase()})` : ''}`, font: { size: 14, color: '#444' } },
                gridcolor: '#e6e6e6',
                zerolinecolor: '#444',
                autorange: false,
                range: [
                  0,
                  Math.max(
                    ...createBoxplotData()
                      .flatMap(box => box.y)
                      .filter(v => typeof v === 'number' && !isNaN(v)),
                    10 // fallback nếu không có dữ liệu
                  )
                ]
              },
              xaxis: { title: { text: `Ngày trong tuần`, font: { size: 14 } }, categoryorder: 'array', categoryarray: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'], zeroline: false, gridcolor: '#e6e6e6' },
              boxmode: 'group',
              plot_bgcolor: '#f8f8f8',
              paper_bgcolor: '#f8f8f8',
              showlegend: false,
              hovermode: 'closest',
            }}
            config={{
              displayModeBar: true,
              displaylogo: false,
              modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
              responsive: true
            }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
          />
        </div>
      </Card>
    ) : null
  );
};

export default BoxPlotChart;
