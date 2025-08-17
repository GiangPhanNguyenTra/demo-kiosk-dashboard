// Dashboard Constants
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

// Weekday mapping (static, không thay đổi)
export const WEEKDAY_MAP = {
  0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4',
  4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7'
};

// Menu items (static UI config)
export const MENU_ITEMS = [
  {
    key: 'dashboard',
    icon: 'DashboardOutlined',
    label: 'Dashboard',
  },
  {
    key: 'reports',
    icon: 'BarChartOutlined',
    label: 'Báo cáo',
  },
];

// Report table columns (static UI config)
export const REPORT_COLUMNS = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: 'Ngày',
    dataIndex: 'date',
    key: 'date',
    sorter: (a, b) => new Date(a.date) - new Date(b.date),
    defaultSortOrder: 'descend',
    width: 120,
  },
  {
    title: 'Thủ tục',
    dataIndex: 'procedure',
    key: 'procedure',
  },
  {
    title: 'Số lượng',
    dataIndex: 'count',
    key: 'count',
  },
  {
    title: 'Nhóm tuổi',
    dataIndex: 'age_group',
    key: 'age_group',
  },
  {
    title: 'Giới tính',
    dataIndex: 'gender',
    key: 'gender',
  },
];
