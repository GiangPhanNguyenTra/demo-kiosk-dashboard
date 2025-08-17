import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Space, DatePicker, Select, Button, message } from 'antd';
import { CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getPrintsByTimeData,
  getDomainData,
  getTopProcedures,
  getHourlyData,
  getAgeGenderDistribution,
  getAuthTypeData
} from '../../../utils/dataProcessing'; 
import api from '../../../services/api'; // Đảm bảo đã có api.js

const { RangePicker } = DatePicker;
const { Option } = Select;

const DashboardControls = ({
  dateRange,
  setDateRange,
  groupBy,
  setGroupBy,
  filteredData: filteredDataProp,
  wardId // nhận wardId từ props
}) => {
  // Không ràng buộc chọn ngày, cho phép chọn bất kỳ ngày nào
  const disabledDate = () => false;

  // Khi chọn ngày, kiểm tra hợp lệ
  const handleRangeChange = (dates) => {
    setDateRange(dates);
  };

  const [exportFormat, setExportFormat] = React.useState('xlsx');

  // State để lưu dữ liệu thực tế từ API
  const [filteredData, setFilteredData] = useState([]);

  // Lấy dữ liệu thực tế từ API khi component mount hoặc khi dateRange thay đổi
  useEffect(() => {
    // Nếu đã truyền filteredData từ cha thì ưu tiên dùng
    if (filteredDataProp && filteredDataProp.length > 0) {
      setFilteredData(filteredDataProp);
      return;
    }
    // Nếu không, tự fetch dữ liệu từ API (ví dụ)
    const fetchData = async () => {
      try {
        // Gọi API lấy dữ liệu, có thể truyền limit/offset hoặc filter theo dateRange nếu backend hỗ trợ
        const res = await api.get('/reports');
        if (res.data && Array.isArray(res.data.data)) {
          setFilteredData(res.data.data);
        } else {
          setFilteredData([]);
        }
      } catch (err) {
        setFilteredData([]);
      }
    };
    fetchData();
  }, [filteredDataProp, dateRange]);

  // Helper: build all report tables
  const buildReportTables = () => {
    // Chuẩn hóa dữ liệu: loại bỏ các trường bắt đầu bằng dấu chấm (.)
    const normalizeData = (arr) => {
      if (!Array.isArray(arr)) return [];
      return arr.map(obj => {
        const newObj = {};
        Object.keys(obj).forEach(key => {
          if (!key.startsWith('.')) {
            newObj[key] = obj[key];
          }
        });
        return newObj;
      });
    };

    // Lọc dữ liệu theo khoảng ngày được chọn
    let filteredByDate = filteredData;
    if (
      dateRange &&
      dateRange[0] &&
      dateRange[1]
    ) {
      const startDate = dayjs(dateRange[0]).format('YYYY-MM-DD');
      const endDate = dayjs(dateRange[1]).format('YYYY-MM-DD');
      filteredByDate = filteredData.filter(item => {
        let itemDate = item.date ?? item['Ngày'];
        if (itemDate instanceof Date) {
          itemDate = dayjs(itemDate).format('YYYY-MM-DD');
        } else {
          itemDate = dayjs(itemDate).format('YYYY-MM-DD');
        }
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    // Data sheet
    const dataSheet = normalizeData(filteredByDate || []);

    // Số lượt in theo ngày/tuần
    const rawSoLuotIn = getPrintsByTimeData(filteredByDate, groupBy).map(row => ({
      ...(groupBy === 'Tuần'
        ? { 'Tuần': row.time, 'Từ': row.weekStart, 'Đến': row.weekEnd }
        : { 'Ngày': row.time }),
      'Số lượt in': row.count
    }));
    console.log('[Export] rawSoLuotIn:', rawSoLuotIn);
    const soLuotIn = normalizeData(rawSoLuotIn);

    // Lĩnh vực
    const rawLinhVuc = getDomainData(filteredByDate).map(row => ({
      'Lĩnh vực': row.name,
      'Tần suất': row.value
    }));
    console.log('[Export] rawLinhVuc:', rawLinhVuc);
    const linhVuc = normalizeData(rawLinhVuc);

    // Top thủ tục
    const rawTopThuTuc = getTopProcedures(filteredByDate, 8).map(row => ({
      'Tên thủ tục': row.name,
      'Tần suất': row.value
    }));
    console.log('[Export] rawTopThuTuc:', rawTopThuTuc);
    const topThuTuc = normalizeData(rawTopThuTuc);

    // In theo giờ
    const rawInTheoGio = getHourlyData(filteredByDate).map(row => ({
      'Giờ': row.hour,
      'Trung bình': row.count,
      'Tổng số lượt': row.totalCount,
      'Số ngày có in': row.activeDays
    }));
    console.log('[Export] rawInTheoGio:', rawInTheoGio);
    const inTheoGio = normalizeData(rawInTheoGio);

    // Tuổi & Giới tính
    const tuoiGioiTinhArr = getAgeGenderDistribution(filteredByDate);
    console.log('[Export] rawTuoiGioiTinh:', tuoiGioiTinhArr);
    const tuoiGioiTinh = tuoiGioiTinhArr.length > 0
      ? normalizeData(tuoiGioiTinhArr.map(row => ({
          'Nhóm tuổi': row.ageRange,
          'Nam': row.male,
          'Nữ': row.female,
          'Tổng': row.total
        })))
      : null;

    // Xác thực
    const xacThucArr = getAuthTypeData(filteredByDate);
    console.log('[Export] rawXacThuc:', xacThucArr);
    const xacThuc = xacThucArr.length > 0
      ? normalizeData(xacThucArr.map(row => ({
          'Loại xác thực': row.name,
          'Số lượng': row.value,
          'Tỷ lệ (%)': row.percent
        })))
      : null;

    return {
      dataSheet,
      soLuotIn,
      linhVuc,
      topThuTuc,
      inTheoGio,
      tuoiGioiTinh,
      xacThuc
    };
  };

  // Export handler
  const handleExportReport = async () => {
    try {
      message.loading({ content: 'Đang xuất báo cáo...', key: 'export' });

      const token = localStorage.getItem('token');
      
      // Debug: log wardId được truyền vào
      console.log('DashboardControls - wardId prop:', wardId);
      console.log('DashboardControls - wardId type:', typeof wardId);
      
      // Xây dựng params một cách rõ ràng
      const params = {
        format: exportFormat
      };
      
      // Thêm date range nếu có
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dayjs(dateRange[0]).format('YYYY-MM-DD');
        params.end_date = dayjs(dateRange[1]).format('YYYY-MM-DD');
        params.group_by = groupBy;
      }
      
      // QUAN TRỌNG: Chỉ thêm ward_id nếu thực sự có giá trị hợp lệ
      if (wardId !== null && wardId !== undefined && wardId !== '' && !isNaN(wardId)) {
        const wardIdNum = parseInt(wardId);
        if (wardIdNum > 0) {
          params.ward_id = wardIdNum;
          console.log('✅ Exporting with ward_id:', params.ward_id);
        } else {
          console.log('❌ Invalid ward_id, exporting all data');
        }
      } else {
        console.log('⚪ No ward_id provided, exporting all data for current user role');
      }

      const queryString = new URLSearchParams(params).toString();
      const url = `${api.defaults.baseURL.replace(/\/$/, "")}/reports/export?${queryString}`; 
      console.log('🔗 Export URL:', url);
      console.log('📋 Export params:', params);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const disposition = response.headers.get('Content-Disposition');
      let filename = exportFormat === 'csv' ? 'dashboard_inphieu.zip' : 'dashboard_inphieu.xlsx';
      
      // Tạo tên file có ý nghĩa
      if (params.ward_id) {
        filename = exportFormat === 'csv' 
          ? `bao_cao_xa_${params.ward_id}_${dayjs().format('YYYYMMDD')}.zip` 
          : `bao_cao_xa_${params.ward_id}_${dayjs().format('YYYYMMDD')}.xlsx`;
      } else {
        filename = exportFormat === 'csv' 
          ? `bao_cao_tong_hop_${dayjs().format('YYYYMMDD')}.zip` 
          : `bao_cao_tong_hop_${dayjs().format('YYYYMMDD')}.xlsx`;
      }
      
      if (disposition && disposition.includes('filename=')) {
        filename = decodeURIComponent(disposition.split('filename=')[1].replace(/"/g, ''));
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(link.href);

      const successMsg = params.ward_id 
        ? `Xuất báo cáo xã ${params.ward_id} thành công!`
        : 'Xuất báo cáo tổng hợp thành công!';
      message.success({ content: successMsg, key: 'export' });
      
    } catch (error) {
      console.error('❌ Export error:', error);
      message.error({ content: `Xuất báo cáo thất bại: ${error.message}`, key: 'export' });
    }
  };

  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={16} align="middle">
        <Col span={12}>
          <Space>
            <CalendarOutlined />
            <RangePicker
              value={dateRange}
              onChange={handleRangeChange}
              disabledDate={disabledDate}
              allowClear={false}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 260 }}
            />
            <Select
              value={groupBy}
              onChange={setGroupBy}
              style={{ width: 120 }}
              placeholder="Nhóm theo"
            >
              <Option value="Ngày">Theo ngày</Option>
              <Option value="Tuần">Theo tuần</Option>
            </Select>
          </Space>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Space>
            <Select
              value={exportFormat}
              onChange={setExportFormat}
              style={{ width: 130 }}
              placeholder="Định dạng"
            >
              <Option value="xlsx">Excel (.xlsx)</Option>
              <Option value="csv">CSV (.zip)</Option>
            </Select>
            <Button 
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
              size="default"
            >
              Xuất báo cáo
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

export default DashboardControls;