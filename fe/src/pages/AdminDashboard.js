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
  Select, 
  message, 
  Statistic, 
  Row, 
  Col,
  Typography,
  Space,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  BarChartOutlined, 
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [wardsByCity, setWardsByCity] = useState({});
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [cityIds, setCityIds] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Giả sử bạn có API /wards?city_id=xxx trả về danh sách ward cho city
    // Hoặc lấy từ users đã có (nếu không có API riêng)
    const wardsMap = {};
    users.forEach(u => {
      if (u.role === 'ward' && u.city_id) {
        if (!wardsMap[u.city_id]) wardsMap[u.city_id] = [];
        wardsMap[u.city_id].push({ ward_id: u.ward_id, ward_name: u.username });
      }
    });
    setWardsByCity(wardsMap);
  }, [users]);

  useEffect(() => {
    // Lấy danh sách city_id từ users có role là city
    const ids = users.filter(u => u.role === 'city' && u.city_id).map(u => u.city_id);
    setCityIds([...new Set(ids)]);
  }, [users]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, reportsRes] = await Promise.all([
        axios.get('/users'),
        axios.get('/reports?limit=1000')
      ]);
      // Log dữ liệu trả về từ API
      // console.log('usersRes:', usersRes);
      // console.log('usersRes.data:', usersRes.data);
      // console.log('reportsRes:', reportsRes);
      // console.log('reportsRes.data:', reportsRes.data);
      setUsers(usersRes.data.users);
      setReports(reportsRes.data.data);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu');
    }
    setLoading(false);
  };

  const handleCreateUser = async (values) => {
    // Kiểm tra username trùng
    const usernameExists = users.some(u => u.username === values.username);
    if (usernameExists) {
      message.error('Username đã tồn tại, vui lòng chọn tên khác!');
      return;
    }
    try {
      await axios.post('/users', values);
      message.success('Tạo user thành công!');
      setCreateModalVisible(false);
      createForm.resetFields();
      fetchData();
    } catch (error) {
      message.error(error.response?.data?.detail || 'Lỗi khi tạo user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`/users/${userId}`);
      message.success('Xóa user thành công!');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa user');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Thống kê
  const userStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    city: users.filter(u => u.role === 'city').length,
    ward: users.filter(u => u.role === 'ward').length,
  };

  const reportStats = {
    total: reports.length,
    byProcedure: reports.reduce((acc, report) => {
      acc[report.procedure] = (acc[report.procedure] || 0) + report.count;
      return acc;
    }, {}),
    byGender: reports.reduce((acc, report) => {
      acc[report.gender] = (acc[report.gender] || 0) + report.count;
      return acc;
    }, {}),
  };

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
          color: role === 'admin' ? '#ff4d4f' : role === 'city' ? '#1890ff' : '#52c41a',
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
      title: 'City ID',
      dataIndex: 'city_id',
      key: 'city_id',
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Bạn có chắc muốn xóa user này?"
            onConfirm={() => handleDeleteUser(record.user_id)}
            okText="Có"
            cancelText="Không"
          >
            <Button type="primary" danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
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
      label: 'Quản lý User',
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} theme="dark" 
      style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          height: '100vh',
          zIndex: 100
          }}>
        <div style={{ padding: 16, textAlign: 'center', color: 'white' }}>
          <Title level={4} style={{ color: 'white', margin: 0 }}>
            AI-Kiosk Admin
          </Title>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {user?.username}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
        />
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            Đăng xuất
          </Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 250 }}>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <Title level={3} style={{ margin: 0, lineHeight: '64px' }}>
            Dashboard Tổng Quan
          </Title>
        </Header>

        <Content style={{ margin: '24px', background: '#fff', padding: 24 }}>
          {/* Thống kê tổng quan */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Tổng số User"
                  value={userStats.total}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Admin"
                  value={userStats.admin}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="City"
                  value={userStats.city}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Ward"
                  value={userStats.ward}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Biểu đồ */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card title="Phân bố User theo Role">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Admin', value: userStats.admin },
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
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Thống kê theo Giới tính">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(reportStats.byGender).map(([gender, count]) => ({ gender, count }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="gender" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Quản lý User */}
          <Card 
            title="Quản lý User" 
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setCreateModalVisible(true)}
              >
                Tạo User mới
              </Button>
            }
          >
            <Table
              columns={userColumns}
              dataSource={users}
              rowKey="user_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Content>
      </Layout>

      {/* Modal tạo user */}
      <Modal
        title="Tạo User mới"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Vui lòng nhập username!' },
              { min: 3, message: 'Username phải có ít nhất 3 ký tự!' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Vui lòng nhập password!' },
              { min: 6, message: 'Password phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Vui lòng chọn role!' }]}
          >
            <Select
              onChange={value => {
                setSelectedRole(value);
                if (value !== 'ward') setSelectedCityId(null);
                createForm.setFieldsValue({ ward_id: undefined });
              }}
            >
              <Option value="admin">Admin</Option>
              <Option value="city">City</Option>
              <Option value="ward">Ward</Option>
            </Select>
          </Form.Item>

          {/* City ID trước Ward ID */}
          <Form.Item
            name="city_id"
            label="City ID"
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  // Nếu chưa chọn role thì không cho chọn city_id
                  if (!selectedRole) {
                    return Promise.reject(new Error('Vui lòng chọn Role trước!'));
                  }
                  // Admin không cần chọn city_id
                  if (selectedRole === 'admin') {
                    return Promise.resolve();
                  }
                  if (selectedRole === 'ward' && !value) {
                    return Promise.reject(new Error('Phải chọn City ID trước khi chọn Ward!'));
                  }
                  if (selectedRole === 'city' && !value) {
                    return Promise.reject(new Error('Phải chọn City ID cho tài khoản City!'));
                  }
                  return Promise.resolve();
                }
              })
            ]}
          >
            {selectedRole === 'city' ? (
              <Select
                showSearch
                placeholder="Chọn City ID"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                onChange={value => setSelectedCityId(value)}
                disabled={!selectedRole || selectedRole === 'admin'}
              >
                {cityIds.map(id => (
                  <Option key={id} value={id}>{id}</Option>
                ))}
              </Select>
            ) : selectedRole === 'admin' ? (
              <Input type="number" disabled placeholder="Không cần nhập City ID cho admin" />
            ) : (
              <Input
                type="number"
                onChange={e => setSelectedCityId(Number(e.target.value))}
                disabled={!selectedRole || selectedRole === 'city'}
                placeholder={!selectedRole ? 'Chọn Role trước' : (selectedRole === 'city' ? 'Không cần nhập City ID cho tài khoản City' : '')}
              />
            )}
          </Form.Item>

          <Form.Item
            name="ward_id"
            label="Ward ID"
          >
            {selectedRole === 'admin' ? (
              <Tooltip title="Tài khoản Admin không cần chọn Ward ID">
                <Input type="number" disabled />
              </Tooltip>
            ) : selectedRole === 'city' ? (
              <Tooltip title="Tài khoản City không cần chọn Ward ID">
                <Input type="number" disabled />
              </Tooltip>
            ) : selectedRole === 'ward' && !selectedCityId ? (
              <Tooltip title="Phải chọn City ID trước khi chọn Ward ID">
                <Input type="number" disabled />
              </Tooltip>
            ) : selectedRole === 'ward' && selectedCityId ? (
              <Select
                showSearch
                placeholder="Chọn Ward thuộc City"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                disabled={!selectedRole}
              >
                {(wardsByCity[selectedCityId] || []).map(w => (
                  <Option key={w.ward_id} value={w.ward_id}>{w.ward_name} (ID: {w.ward_id})</Option>
                ))}
              </Select>
            ) : (
              <Input type="number" disabled={!selectedRole} />
            )}
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Tạo
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                Hủy
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;