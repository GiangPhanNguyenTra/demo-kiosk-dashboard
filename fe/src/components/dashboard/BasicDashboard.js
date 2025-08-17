import React from 'react';
import { Row, Col, Card, Statistic, Table, Alert, Spin } from 'antd';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { COLORS, REPORT_COLUMNS } from '../../utils/constants';

const BasicDashboard = ({ reportStats, wardReports, wardId, loading }) => {
  // console.log('BasicDashboard props:', { reportStats, wardReports, wardId, loading });

  // Process report stats
  const stats = React.useMemo(() => {
    if (!wardReports || !Array.isArray(wardReports)) {
      return {
        total: 0,
        totalCount: 0,
        byProcedure: {},
        byGender: {}
      };
    }

    const total = wardReports.length;
    const totalCount = wardReports.reduce((sum, report) => sum + (report.count || 0), 0);

    // Group by procedure
    const byProcedure = wardReports.reduce((acc, report) => {
      if (report.procedure) {
        acc[report.procedure] = (acc[report.procedure] || 0) + (report.count || 1);
      }
      return acc;
    }, {});

    // Group by gender
    const byGender = wardReports.reduce((acc, report) => {
      if (report.gender) {
        acc[report.gender] = (acc[report.gender] || 0) + (report.count || 1);
      }
      return acc;
    }, {});

    return { total, totalCount, byProcedure, byGender };
  }, [wardReports]);

  // Prepare chart data
  const procedureData = Object.entries(stats.byProcedure)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const genderData = Object.entries(stats.byGender)
    .map(([gender, count]) => ({ gender, count }));

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!wardReports || wardReports.length === 0) {
    return (
      <Alert
        message="Không có dữ liệu"
        description="Chưa có báo cáo nào cho ward này"
        type="info"
        showIcon
      />
    );
  }

  return (
    <>
      {/* Thống kê tổng quan */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Tổng số báo cáo"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Tổng số lượng"
              value={stats.totalCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Ward ID"
              value={wardId || 'N/A'}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Phân bố theo Thủ tục">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={procedureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {procedureData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Thống kê theo Giới tính">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={genderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="gender" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Bảng báo cáo */}
      <Card title="Danh sách báo cáo của Ward">
        <Table
          columns={REPORT_COLUMNS}
          dataSource={wardReports}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );
};

export default BasicDashboard;