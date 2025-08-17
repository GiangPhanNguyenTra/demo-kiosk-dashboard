import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message, 
  Statistic, 
  Row, 
  Col,
  Typography,
  Space
} from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  BarChartOutlined, 
  LogoutOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const CityDashboard = () => {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const currentWardId = params.ward_id ? Number(params.ward_id) : null;
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [changePasswordForm] = Form.useForm();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch data when user changes (after login)
  useEffect(() => {
    if (user && user.city_id) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Đảm bảo gọi đúng port backend (nếu backend chạy ở 8000, sửa lại baseURL trong api.js)
      // Nếu backend chạy ở 9000, sửa lại baseURL trong api.js và AuthContext.js cho đúng
      // console.log('Fetching data for city user:', user);
      const [usersRes, reportsRes] = await Promise.all([
        api.get('/users'),
        api.get('/reports', { params: { limit: 1000 } })
      ]);
      // console.log('Users response:', usersRes.data);
      // console.log('Reports response:', reportsRes.data);
      setUsers(usersRes.data.users || []);
      setReports(reportsRes.data.data || []);
    } catch (error) {
      // Nếu gặp lỗi net::ERR_INVALID_HTTP_RESPONSE, kiểm tra lại baseURL của api.js
      // và đảm bảo backend đang chạy đúng port, không bị lỗi/crash.
      // console.error('Error fetching data:', error);
      message.error('Lỗi khi tải dữ liệu: ' + (error.message || 'Không thể kết nối đến server'));
    }
    setLoading(false);
  };

  const handleChangePassword = async (values) => {
    const result = await changePassword(values.oldPassword, values.newPassword);
    if (result.success) {
      message.success('Đổi mật khẩu thành công!');
      setChangePasswordModalVisible(false);
      changePasswordForm.resetFields();
    } else {
      message.error(result.error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Thống kê cho city
  const cityUsers = users.filter(u => u.city_id === user?.city_id);
  const cityReports = reports.filter(r => r.city_id === user?.city_id);

  const userStats = {
    total: cityUsers.length,
    ward: cityUsers.filter(u => u.role === 'ward').length,
    city: cityUsers.filter(u => u.role === 'city').length,
  };

  const reportStats = {
    total: cityReports.length,
    byProcedure: cityReports.reduce((acc, report) => {
      acc[report.procedure] = (acc[report.procedure] || 0) + report.count;
      return acc;
    }, {}),
    byGender: cityReports.reduce((acc, report) => {
      acc[report.gender] = (acc[report.gender] || 0) + report.count;
      return acc;
    }, {}),
    byWard: cityReports.reduce((acc, report) => {
      acc[report.ward_id] = (acc[report.ward_id] || 0) + report.count;
      return acc;
    }, {}),
  };

  // Chỉ giữ giới tính Nam và Nữ cho biểu đồ
  const genderCategories = [
    { key: 'Nam', label: 'Nam' },
    { key: 'Nữ', label: 'Nữ' }
  ];

  // Gom nhóm và đếm số lượng từng giới tính từ cityReports
  const genderCountMap = cityReports.reduce((acc, r) => {
    const key = r.gender;
    if (key === 'Nam' || key === 'Nữ') {
      acc[key] = (acc[key] || 0) + (r.count || 1);
    }
    return acc;
  }, {});

  const genderChartData = genderCategories.map(({ key, label }) => ({
    gender: label,
    count: genderCountMap[key] || 0
  }));

  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'user_id',
      key: 'user_id',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <span style={{
          color: role === 'city' ? '#1890ff' : '#52c41a',
          fontWeight: 'bold'
        }}>
          {role.toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Ward ID',
      dataIndex: 'ward_id',
      key: 'ward_id',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.role === 'ward' ? (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => navigate(`/ward/dashboard/${record.ward_id}`)}
              >
                Xem dashboard
              </Button>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'users',
      icon: <UserOutlined />,
      label: 'Quản lý User Ward',
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={250} 
        theme="dark"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          zIndex: 100
        }}
      >
        <div style={{ padding: 16, textAlign: 'center', color: 'white' }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            AI-Kiosk City
          </Title>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {user?.username} - City ID: {user?.city_id}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              icon={<KeyOutlined />} 
              onClick={() => setChangePasswordModalVisible(true)}
              style={{ width: '100%' }}
            >
              Đổi mật khẩu
            </Button>
            <Button 
              type="primary" 
              danger 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{ width: '100%' }}
            >
              Đăng xuất
            </Button>
          </Space>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 250 }}>
        <Header style={{ background: '#fff', padding: '0 24px', position: 'fixed', top: 0, right: 0, left: 250, zIndex: 99 }}>
          <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
            Dashboard City - {user?.city_id}
          </Title>
        </Header>

        <Content style={{ margin: '88px 24px 24px 24px', background: '#fff', padding: 24, minHeight: 'calc(100vh - 112px)' }}>
          {/* Thống kê tổng quan */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Tổng số User trong City"
                  value={userStats.total}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="User Ward"
                  value={userStats.ward}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="Tổng báo cáo"
                  value={reportStats.total}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Biểu đồ */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card title="Phân bố User trong City">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'City', value: userStats.city },
                        { name: 'Ward', value: userStats.ward },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.slice(0, 2).map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
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
                  <BarChart data={genderChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="gender" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Quản lý User Ward */}
          <Card title="Quản lý User Ward trong City">
            <Table
              columns={userColumns}
              dataSource={cityUsers}
              rowKey="user_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          {/* Nếu đang ở dashboard của xã, hiển thị nút xuất báo cáo cho xã đó */}
          {currentWardId && (
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                onClick={async () => {
                  try {
                    const res = await api.get('/reports/export', {
                      params: { ward_id: currentWardId },
                      responseType: 'blob'
                    });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    const disposition = res.headers['content-disposition'];
                    let filename = 'bao_cao.xlsx';
                    if (disposition) {
                      const match = disposition.match(/filename="?([^"]+)"?/);
                      if (match) filename = match[1];
                    }
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    message.error('Lỗi khi xuất báo cáo xã này');
                  }
                }}
              >
                Xuất báo cáo xã này
              </Button>
            </div>
          )}
        </Content>
      </Layout>

      {/* Modal đổi mật khẩu */}
      <Modal
        title="Đổi mật khẩu"
        open={changePasswordModalVisible}
        onCancel={() => setChangePasswordModalVisible(false)}
        footer={null}
      >
        <Form
          form={changePasswordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="oldPassword"
            label="Mật khẩu cũ"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu cũ!' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Đổi mật khẩu
              </Button>
              <Button onClick={() => setChangePasswordModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default CityDashboard;