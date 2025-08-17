import React, { useEffect, useRef, useMemo } from 'react';
import { Card, Slider } from 'antd';
import Plotly from 'plotly.js-dist';

const TopProceduresChart = ({ data, topK, setTopK }) => {
  const chartRef = useRef(null);

  // Hàm màu sắc Plotly
  const getPlotlyColor = (index) => {
    const plotlyColors = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ];
    return plotlyColors[index % plotlyColors.length];
  };

  const processData = useMemo(() => {
    if (!data || !data.length) return { labels: [], parents: [], values: [], colors: [] };

    // Sắp xếp thủ tục theo giá trị 
    const allProcedures = data
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Chia thành nhóm thủ tục hàng đầu và nhóm khác
    const topProcedures = allProcedures.slice(0, topK+1);
    // "Khác" là toàn bộ thủ tục của xã trừ ra số thủ tục top được chọn
    const otherProcedures = allProcedures.slice(topK+1);
    const otherValue = otherProcedures.reduce((sum, proc) => sum + proc.value, 0);

    let labels = [...topProcedures.map(p => p.name)];
    let values = [...topProcedures.map(p => p.value)];
    let colors = [...topProcedures.map((_, i) => getPlotlyColor(i))];

    // Gộp tất cả các khối "Khác" lại thành 1 khối duy nhất
    // Nếu labels đã có khối "Khác", cộng dồn value vào khối "Khác" cuối cùng
    let khacIdx = labels.findIndex(l => l && l.startsWith('Khác'));
    if (khacIdx !== -1) {
      // Nếu có khối "Khác" đã tồn tại, cộng dồn value
      values[khacIdx] += otherValue;
      labels[khacIdx] = `Khác`;
      colors[khacIdx] = '#6c757d';
    } else if (otherProcedures.length > 0) {
      // Nếu chưa có khối "Khác", thêm mới
      labels.push(`Khác`);
      values.push(otherValue);
      colors.push('#6c757d');
    }

    return { 
      labels,
      values,
      colors,
      otherCount: otherProcedures.length,
      otherValue,
      allProcedures
    };
  }, [data, topK]);

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement || !processData.labels.length) return;

    const plotData = [{
      type: "treemap",
      labels: processData.labels,
      values: processData.values,
      parents: new Array(processData.labels.length).fill(""),
      textinfo: "label+value",
      textfont: {
        color: '#fff',
        family: 'Arial',
        size: 14
      },
      marker: {
        colors: processData.colors,
        line: { width: 0, color: 'white' }
      },
      fixedlayout: true
    }];

    const layout = {
      margin: { t: 60, l: 10, r: 10, b: 20 },
      height: 420,
      paper_bgcolor: 'white',
      plot_bgcolor: 'white',
      title: {
        text: `Top ${topK} thủ tục phổ biến + Khác`,
        font: { size: 18, family: 'Arial', color: '#444' },
        xref: 'container',
        x: 0.5,
        y: 0.9,
        xanchor: 'center',
        yanchor: 'top'
      },
      pathbar: { visible: false }
    };

    const config = {
      displayModeBar: true,
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: [
        'sendDataToCloud',
        'editInChartStudio',
        'select2d',
        'lasso2d'
      ]
    };

    Plotly.newPlot(chartElement, plotData, layout, config);

    return () => chartElement && Plotly.purge(chartElement);
  }, [processData]);

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card
      title={
        <span style={{ fontWeight: 500, fontSize: 16, marginTop: 10 }}>🔥 Top thủ tục phổ biến</span>
      }
      style={{ marginBottom: 1,marginTop: 1 }}
      bodyStyle={{ padding: 12 }}
      extra={null}
    >
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#666' }}>Số thủ tục hàng đầu:</span>
        <Slider
          min={1}
          max={8}
          step={1}
          value={Math.min(topK, Math.min(8, processData.allProcedures.length))}
          onChange={setTopK}
          style={{ width: 250 }}
          marks={{
            1: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>1</div> },
            2: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>2</div> },
            3: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>3</div> },
            4: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>4</div> },
            5: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>5</div> },
            6: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>6</div> },
            7: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>7</div> },
            8: { label: <div style={{ color: '#666', fontSize: 11, marginTop: 10 }}>8</div> },
          }}
          disabled={processData.allProcedures.length <= 1}
          tooltip={{
            formatter: (value) => `Top ${value} thủ tục`,
            placement: 'bottom'
          }}
          trackStyle={{ backgroundColor: '#1890ff', height: 4 }}
          railStyle={{ backgroundColor: '#e1e1e1', height: 4 }}
          dotStyle={{
            borderColor: '#1f77b4',
            backgroundColor: '#fff',
            width: 8,
            height: 8,
            marginLeft: -4,
            bottom: -2,
            borderWidth: 2
          }}
          activeDotStyle={{
            borderColor: '#1890ff',
            backgroundColor: '#1890ff',
            width: 8,
            height: 8,
            marginLeft: -4,
            bottom: -2
          }}
        />
      </div>
      <div ref={chartRef} style={{ width: '100%', height: 420 }}></div>
    </Card>
  );
};

export default TopProceduresChart;