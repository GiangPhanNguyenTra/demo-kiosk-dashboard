import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Menu, 
  Button, 
  Modal, 
  Form, 
  Input, 
  message, 
  Space,
  Typography
} from 'antd';
import { 
  DashboardOutlined, 
  BarChartOutlined, 
  LogoutOutlined,
  KeyOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import BasicDashboard from '../components/dashboard/BasicDashboard';
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const WardDashboard = () => {
  const [selectedMenuItem, setSelectedMenuItem] = useState('dashboard');
  const [dateRange, setDateRange] = useState([null, null]);
  const [groupBy, setGroupBy] = useState('Ngày');
  const [topK, setTopK] = useState(5);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [changePasswordForm] = Form.useForm();
  const [filteredData, setFilteredData] = useState([]);

  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const { ward_id } = useParams();
  // Sửa: Luôn truyền wardId vào hook useDashboardData, không truyền undefined
  const wardId = ward_id ? Number(ward_id) : (user?.role === 'ward' ? user?.ward_id : null);

  // Sửa: Truyền wardId vào useDashboardData để lấy đúng dữ liệu cho xã
  const {
    dashboardData,
    reports: wardReports,
    metadata,
    loading,
    error,
    reportStats
  } = useDashboardData(wardId);

  useEffect(() => {
    // Sửa: Luôn lọc dữ liệu cho đúng wardId, không lấy toàn bộ dashboardData
    if (dashboardData && Array.isArray(dashboardData)) {
      const filtered = dashboardData.filter(item => String(item.ward_id ?? item.wardId) === String(wardId));
      setFilteredData(filtered);
    }
  }, [dashboardData, wardId]);

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

  // Menu items with icons
  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: 'Báo cáo',
    },
  ];

  // Kiểm tra quyền truy cập
  React.useEffect(() => {
    if (user?.role === 'city') {
      if (!wardId || isNaN(wardId) || wardId <= 0) {
        navigate('/city/dashboard', { replace: true });
      }
    } else if (user?.role === 'ward') {
      if (user.ward_id !== wardId) {
        navigate(`/ward/dashboard/${user.ward_id}`, { replace: true });
      }
    }
  }, [user, wardId, navigate]);

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
            AI-Kiosk Ward
          </Title>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {user?.username} - Ward ID: {wardId}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenuItem]}
          items={menuItems}
          onClick={({ key }) => setSelectedMenuItem(key)}
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
            Dashboard Ward - {wardId}
          </Title>
        </Header>

        <Content style={{ margin: '88px 24px 24px 24px', background: '#fff', padding: 24, minHeight: 'calc(100vh - 112px)' }}>
          {selectedMenuItem === 'dashboard' && (
            <BasicDashboard 
              reportStats={reportStats}
              wardReports={wardReports}
              wardId={wardId}
              loading={loading}
            />
          )}

          {selectedMenuItem === 'reports' && (
            <AnalyticsDashboard 
              filteredData={filteredData}
              dateRange={dateRange}
              setDateRange={setDateRange}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              topK={topK}
              setTopK={setTopK}
              loading={loading}
              wardId={wardId || user?.ward_id} // Đảm bảo luôn truyền wardId cho DashboardControls
            />
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

export default WardDashboard;
