import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Typography, Card, Alert, Spin } from 'antd';
import DashboardControls from './controls/DashboardControls';
import TimeSeriesChart from './charts/TimeSeriesChart';
import HourlyTrendChart from './charts/HourlyTrendChart';
import PieChartComponent from './charts/PieChartComponent';
import TopProceduresChart from './charts/TopProceduresChart';
import ScatterPlotChart from './charts/ScatterPlotChart';
import FieldFrequencyChart from './charts/FieldFrequencyChart';
import BoxPlotChart from './charts/BoxPlotChart';
import AgeGenderDistChart from './charts/AgeGenderDistChart';
import { 
  getPrintsByTimeData, 
  getDomainData, 
  getHourlyData,
  getWeekdayData,
  getBoxPlotData,
  getTopProcedures,
  getAuthTypeData,
  getGenderData,
  getAgeGenderDistribution,
  getScatterData,
  filterDashboardData
} from '../../utils/dataProcessing';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const { Title } = Typography;

const AnalyticsDashboard = ({ 
  filteredData: rawFilteredData = [],
  dateRange, 
  setDateRange, 
  groupBy = 'Ngày',
  setGroupBy,
  topK = 5,
  setTopK,
  loading = false,
  wardId
}) => {
  // Sửa: Lọc dữ liệu theo wardId đúng kiểu (số hoặc chuỗi)
  const filteredData = useMemo(() => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      // Không lọc theo ngày, trả về toàn bộ dữ liệu cho wardId
      return rawFilteredData.filter(item => 
        !wardId || String(item.ward_id ?? item.wardId) === String(wardId)
      );
    }
    // Đã chọn ngày, lọc theo khoảng ngày
    return filterDashboardData(rawFilteredData, wardId, dateRange);
  }, [rawFilteredData, wardId, dateRange]);

  const [processedData, setProcessedData] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('loading');

  useEffect(() => {
    if (!filteredData?.length) return;

    setProcessingStatus('processing');
    try {
      console.log('[AnalyticsDashboard] filteredData:', filteredData); // Thêm log đầu vào

      const scatterData = getScatterData(filteredData);
      console.log('[AnalyticsDashboard] scatterData:', scatterData); // Thêm log đầu ra

      const data = {
        printsByTimeData: getPrintsByTimeData(filteredData, groupBy),
        hourlyData: getHourlyData(filteredData),
        domainData: getDomainData(filteredData),
        topProceduresData: getTopProcedures(filteredData, topK),
        authTypeData: getAuthTypeData(filteredData),
        genderData: getGenderData(filteredData),
        ageGenderData: getAgeGenderDistribution(filteredData),
        scatterData
      };

      // Log the data
      console.log('Auth Type Data:', data.authTypeData);
      console.log('Gender Data:', data.genderData);

      setProcessedData(data);
      setProcessingStatus('complete');
    } catch (error) {
      console.error('Error processing data:', error);
      setProcessingStatus('error');
    }
  }, [filteredData, groupBy, topK]);

  // Show loading state
  if (loading || processingStatus === 'loading' || processingStatus === 'processing') {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          {processingStatus === 'processing' ? 'Đang xử lý dữ liệu...' : 'Đang tải dữ liệu...'}
        </div>
      </div>
    );
  }

  // Handle no data case - removed early return and replaced with empty data
  const emptyData = {
    printsByTimeData: [],
    hourlyData: Array(24).fill({ hour: 0, count: 0 }), 
    domainData: [{ name: 'Không có dữ liệu', value: 0 }],
    topProceduresData: [{ name: 'Không có dữ liệu', value: 0 }],
    authTypeData: [{ name: 'Không có dữ liệu', value: 0 }],
    genderData: [{ name: 'Không có dữ liệu', value: 0 }],
    ageGenderData: [],
    scatterData: []
  };

  const data = filteredData?.length > 0 ? processedData : emptyData;

  try {
    console.log('Processed data:', processedData);

    return (
      <>
        {/* Dashboard Analytics từ notebook */}
        <div style={{ marginBottom: 16 }}>
          <Title level={3}>📊 Thống kê số lần in phiếu</Title>
        </div>
        
        {/* Controls */}
        <DashboardControls 
          dateRange={dateRange}
          setDateRange={setDateRange}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          wardId={wardId} // Thêm dòng này để truyền wardId xuống DashboardControls
        />

        {/* Main chart: Số lần in theo thời gian */}
        <TimeSeriesChart data={data.printsByTimeData} groupBy={groupBy} />

        {/* Row 1: Hourly trends & Weekday analysis */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <HourlyTrendChart data={data.hourlyData} groupBy={groupBy} />
          </Col>
          <Col span={12}>
            <BoxPlotChart data={filteredData || []} groupBy={groupBy} />
          </Col>
        </Row>

        {/* Row 2: Domain analysis & Top procedures */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <FieldFrequencyChart 
              data={data.domainData}
            />
          </Col>
          <Col span={12}>
            <TopProceduresChart 
              data={data.topProceduresData}
              topK={topK}
              setTopK={setTopK}
            />
          </Col>
        </Row>

        {/* Row 3: Authentication, Gender, Age analysis */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <PieChartComponent 
              data={data.authTypeData} 
              title="Tỷ lệ xác thực"
              type="auth"
              height={300}
            />
          </Col>
          <Col span={8}>
            <AgeGenderDistChart data={data.ageGenderData} />
          </Col>
          <Col span={8}>
            <PieChartComponent 
              data={data.genderData} 
              title="Tỷ lệ giới tính"
              type="gender"
              height={300}
            />
          </Col>
        </Row>

        {/* Row 5: Scatter plot for age & gender by hour */}
        <ScatterPlotChart data={data.scatterData || []} />
      </>
    );
  } catch (error) {
    console.error('Error processing dashboard data:', error);
    return (
      <Alert
        message="Lỗi xử lý dữ liệu"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }
};

export default AnalyticsDashboard;
