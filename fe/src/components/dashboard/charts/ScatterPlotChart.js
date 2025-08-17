import React, { useMemo } from 'react';
import { Card, Alert } from 'antd';
import Plot from 'react-plotly.js';
import { getPlotlyColor } from './chartColors';

const ScatterPlotChart = ({ data }) => {
  console.log('[ScatterPlotChart] raw data:', data);

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.warn('[ScatterPlotChart] Data is not array or missing:', data);
      return { male: [], female: [] };
    }

    // Phân loại dữ liệu theo giới tính
    const maleData = data.filter(d => d.gender === 'Nam');
    const femaleData = data.filter(d => d.gender === 'Nữ');

    console.log('[ScatterPlotChart] maleData:', maleData);
    console.log('[ScatterPlotChart] femaleData:', femaleData);

    return {
      male: maleData.map(d => ({
        x: d.hour,
        y: d.age,
        size: d.count,
        text: `${d.count} lần in`
      })),
      female: femaleData.map(d => ({
        x: d.hour,
        y: d.age,
        size: d.count,
        text: `${d.count} lần in`
      }))
    };
  }, [data]);

  // Check if we have any data to display
  const hasData = processedData.male.length > 0 || processedData.female.length > 0;
  console.log('[ScatterPlotChart] processedData:', processedData, 'hasData:', hasData);

  return (
    <Card
      title={<span style={{ fontWeight: 500, fontSize: 16 }}>🚻 Phân bố tuổi & giới tính theo khung giờ</span>}
      style={{ marginBottom: 5 }}
      bodyStyle={{ padding: 5 }}
    >
      <div style={{ width: '100%', height: 900, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginTop: 8, position: 'relative' }}>
        {hasData ? (
          <div style={{ width: '100%', height: 900, position: 'relative', zIndex: 1 }}>
            <Plot
              data={[
                {
                  x: processedData.male.map(d => d.x),
                  y: processedData.male.map(d => d.y),
                  mode: 'markers',
                  type: 'scatter',
                  name: 'Nam',
                  marker: {
                    color: getPlotlyColor(0),
                    size: processedData.male.map(d => Math.max(Math.sqrt(d.size) * 15, 8)),
                    opacity: 0.7,
                    line: {
                      color: getPlotlyColor(0),
                      width: 1
                    },
                    sizemode: 'area',
                    sizeref: 0.1
                  },
                  hovertemplate:
                    'Giờ: %{x}:00<br>' +
                    'Tuổi: %{y} tuổi<br>' +
                    'Số lượng: %{text}<br>' +
                    '<extra></extra>',
                  text: processedData.male.map(d => d.text)
                },
                {
                  x: processedData.female.map(d => d.x),
                  y: processedData.female.map(d => d.y),
                  mode: 'markers',
                  type: 'scatter',
                  name: 'Nữ',
                  marker: {
                    color: getPlotlyColor(1),
                    size: processedData.female.map(d => Math.max(Math.sqrt(d.size) * 15, 8)),
                    opacity: 0.7,
                    line: {
                      color: getPlotlyColor(1),
                      width: 1
                    },
                    sizemode: 'area',
                    sizeref: 0.1
                  },
                  hovertemplate:
                    'Giờ: %{x}:00<br>' +
                    'Tuổi: %{y} tuổi<br>' +
                    'Số lượng: %{text}<br>' +
                    '<extra></extra>',
                  text: processedData.female.map(d => d.text)
                }
              ]}
              layout={{
                autosize: true,
                height: 900, // tăng chiều cao
                title: {
                  text: 'Phân bố tuổi & giới tính theo khung giờ',
                  font: { size: 18, family: 'Arial', color: '#444' },
                  xref: 'container',
                  x: 0.5,
                  y: 0.93,
                  xanchor: 'center',
                  yanchor: 'top'
                },
                margin: { t: 110, r: 5, b: 120, l: 80 }, // tăng margin để bong bóng không bị cắt
                xaxis: {
                  title: {
                    text: 'Giờ trong ngày',
                    font: { size: 14 }
                  },
                  ticksuffix: ':00',
                  gridcolor: '#e6e6e6',
                  zeroline: false,
                  // Chỉ lấy các giờ có dữ liệu
                  range: (() => {
                    const allHours = [
                      ...processedData.male.map(d => d.x),
                      ...processedData.female.map(d => d.x)
                    ].filter(h => typeof h === 'number' && !isNaN(h));
                    if (allHours.length === 0) return [7, 17];
                    const minHour = Math.min(...allHours);
                    const maxHour = Math.max(...allHours);
                    return [minHour - 0.5, maxHour + 0.5];
                  })(),
                  dtick: 1
                },
                yaxis: {
                  title: {
                    text: 'Độ tuổi',
                    font: { size: 14 }
                  },
                  gridcolor: '#e6e6e6',
                  zeroline: false,
                  range: (() => {
                    const allAges = [
                      ...processedData.male.map(d => d.y),
                      ...processedData.female.map(d => d.y)
                    ].filter(a => typeof a === 'number' && !isNaN(a));
                    if (allAges.length === 0) return [10, 75];
                    const minAge = Math.min(...allAges);
                    const maxAge = Math.max(...allAges);
                    // Mở rộng thêm 5 đơn vị mỗi bên để bong bóng không bị cắt
                    return [Math.max(0, minAge - 2), maxAge + 2];
                  })(),
                },
                plot_bgcolor: '#f8f8f8',
                paper_bgcolor: '#f8f8f8',
                showlegend: true,
                legend: {
                  orientation: 'v',
                  xanchor: 'left',
                  x: 1.0,
                  y: 0.5,
                  yanchor: 'middle',
                  font: {
                    size: 12
                  }
                },
                hovermode: 'closest',
                annotations: [],
              }}

              config={{
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
                ]
              }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <Alert
            message="Không có dữ liệu để hiển thị biểu đồ"
            description="Dữ liệu có thể chưa được tải hoặc không có thông tin về giờ, tuổi và giới tính."
            type="info"
            showIcon
            style={{ marginTop: 32 }}
          />
        )}
      </div>
    </Card>
  );
};

export default ScatterPlotChart;