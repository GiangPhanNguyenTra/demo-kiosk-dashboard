import dayjs from 'dayjs';
import { WEEKDAY_MAP } from './constants';

export const getBoxPlotData = (data) => {
  if (!data || !data.length) return [];
  
  const dailyCounts = data.reduce((acc, record) => {
    const date = dayjs(record.print_time).format('YYYY-MM-DD');
    const printTime = new Date(record.print_time);
    const weekday = printTime.toLocaleDateString('vi-VN', { weekday: 'long' });
    const thu = weekday
      .replace('thứ hai', 'Thứ 2')
      .replace('thứ ba', 'Thứ 3')
      .replace('thứ tư', 'Thứ 4')
      .replace('thứ năm', 'Thứ 5')
      .replace('thứ sáu', 'Thứ 6')
      .replace('thứ bảy', 'Thứ 7')
      .replace('chủ nhật', 'Chủ nhật');

    const key = `${date}-${thu}`;
    if (!acc[key]) {
      acc[key] = { thu, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {});

  return Object.values(dailyCounts);
};

export const filterDashboardData = (dashboardData, wardId, dateRange) => {
  // Sửa: So sánh wardId đúng kiểu (số hoặc chuỗi)
  let filtered = dashboardData;
  if (wardId !== undefined && wardId !== null) {
    filtered = filtered.filter(item => 
      String(item.ward_id ?? item.wardId) === String(wardId)
    );
  }

  if (dateRange && dateRange[0] && dateRange[1]) {
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');
    filtered = filtered.filter(item => {
      // Ưu tiên trường date, nếu không có thì lấy 'Ngày'
      let itemDate = item.date ?? item['Ngày'];
      // Nếu là kiểu Date thì chuyển sang string
      if (itemDate instanceof Date) {
        itemDate = dayjs(itemDate).format('YYYY-MM-DD');
      } else {
        itemDate = dayjs(itemDate).format('YYYY-MM-DD');
      }
      return itemDate >= startDate && itemDate <= endDate;
    });
  }

  return filtered;
};

export const getPrintsByTimeData = (filteredData = [], groupBy) => {
  // console.log('[getPrintsByTimeData] input:', filteredData);
  if (!Array.isArray(filteredData)) return [];

  const grouped = filteredData.reduce((acc, item) => {
    let dateStr;
    const date = item.date || item.print_time; // Sử dụng print_time từ DB
    
    if (!date) return acc;

    if (groupBy === 'Tuần') {
      const weekYear = dayjs(date).format('GGGG-[W]WW');
      dateStr = weekYear;
    } else {
      dateStr = dayjs(date).format('YYYY-MM-DD');
    }
    
    acc[dateStr] = (acc[dateStr] || 0) + (item.count || 1);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => dayjs(a).valueOf() - dayjs(b).valueOf())
    .map(([time, count]) => ({
      time,
      count,
      weekStart: groupBy === 'Tuần' ? dayjs(time).startOf('week').format('DD/MM') : null,
      weekEnd: groupBy === 'Tuần' ? dayjs(time).endOf('week').format('DD/MM') : null
    }));
};

export const getHourlyData = (filteredData) => {
  // console.log('[getHourlyData] input:', filteredData);
  if (!filteredData || !Array.isArray(filteredData)) {
    // console.warn('Invalid filteredData:', filteredData);
    return [];
  }

  const hourlyCounts = Array(11).fill(0);  // For hours 7-17 (index 0-10)
  const hourlyActiveDays = Array(11).fill(0);
  const dateHourSeen = new Set();

  filteredData.forEach(item => {
    const hour = parseInt(item.hour);
    if (isNaN(hour) || hour < 7 || hour > 17) {
      // console.warn('Invalid hour:', item.hour, 'in record:', item);
      return;
    }
    
    const hourIndex = hour - 7; // Convert to 0-10 index
    const count = item.count || 1;
    const date = item.date;

    hourlyCounts[hourIndex] += count;

    const key = `${date}-${hour}`;
    if (!dateHourSeen.has(key)) {
      hourlyActiveDays[hourIndex] += 1;
      dateHourSeen.add(key);
    }
  });

  // Tạo mảng kết quả với tất cả giờ từ 7 đến 17
  return Array.from({ length: 11 }, (_, idx) => {
    const hour = idx + 7;
    const activeDays = hourlyActiveDays[idx];
    const totalCount = hourlyCounts[idx];
    
    return {
      hour,
      count: activeDays > 0 ? totalCount / activeDays : 0,
      totalCount,
      activeDays
    };
  });
};

export const getDomainData = (filteredData) => {
  // console.log('[getDomainData] input:', filteredData);
  if (!filteredData || !Array.isArray(filteredData)) return [];

  const counts = {};
  filteredData.forEach(item => {
    if (item.domain) {
      counts[item.domain] = (counts[item.domain] || 0) + (item.count || 1);
    }
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const getTopProcedures = (filteredData, topK) => {
  // console.log('[getTopProcedures] input:', filteredData);
  if (!Array.isArray(filteredData) || !filteredData.length) return [];

  // Group by procedure and sum counts
  const procedures = filteredData.reduce((acc, item) => {
    const procedure = item.procedure || 'Không xác định';
    acc[procedure] = (acc[procedure] || 0) + (item.count || 1);
    return acc;
  }, {});
  
  // Convert to array and sort by count
  const sortedProcs = Object.entries(procedures)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Get top K procedures
  const topProcs = sortedProcs.slice(0, topK);
  
  // Calculate others
  const otherProcs = sortedProcs.slice(topK);
  const otherCount = otherProcs.reduce((sum, proc) => sum + proc.value, 0);

  // Format result
  const result = topProcs.map(proc => ({
    name: proc.name.length > 30 ? proc.name.substring(0, 30) + '...' : proc.name,
    fullName: proc.name,
    value: proc.value
  }));

  // Add "Khác" category if there are other procedures
  if (otherCount > 0) {
    result.push({
      name: `Khác (${otherProcs.length} thủ tục)`,
      fullName: `${otherProcs.length} thủ tục khác`,
      value: otherCount,
      isOther: true,
      details: otherProcs
    });
  }

  return result;
};

export const getAuthTypeData = (filteredData) => {
  // console.log('[getAuthTypeData] input:', filteredData);
  if (!Array.isArray(filteredData)) return [];

  const counts = {
    'CCCD': 0,
    'QR': 0
  };
  
  let total = 0;
  
  filteredData.forEach(record => {
    const type = record.auth_type?.toUpperCase() || 'CCCD';
    if (type === 'CCCD' || type === 'QR') {
      counts[type] += (record.count || 1);
      total += (record.count || 1);
    }
  });

  return Object.entries(counts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      percent: ((value / total) * 100).toFixed(1)
    }));
};

export const getGenderData = (filteredData) => {
  // console.log('[getGenderData] input:', filteredData);
  if (!filteredData || !Array.isArray(filteredData)) return [];

  const counts = {
    'Nam': 0,
    'Nữ': 0
  };
  
  let total = 0;

  filteredData.forEach(record => {
    let gender = record.gender?.toLowerCase() || '';
    
    // Map gender values
    if (gender === 'nam' || gender === 'male') {
      counts['Nam'] += (record.count || 1);
      total += (record.count || 1);
    } else if (gender === 'nữ' || gender === 'nu' || gender === 'female') {
      counts['Nữ'] += (record.count || 1);
      total += (record.count || 1);
    }
  });

  return Object.entries(counts)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      percent: ((value / total) * 100).toFixed(1)
    }));
};

export const getAgeGenderDistribution = (data) => {
  // console.log('[getAgeGenderDistribution] input:', data);
  if (!Array.isArray(data) || data.length === 0) return [];

  // Định nghĩa thứ tự chuẩn của các nhóm tuổi
  const ageOrder = ['<18', '18-30', '31-50', '>50'];
  
  const result = {};
  
  data.forEach(record => {
    const ageGroup = record.age_group?.trim();
    const gender = (record.gender ?? '').toLowerCase();
    
    if (!ageGroup || !gender) return;

    if (!result[ageGroup]) {
      result[ageGroup] = { ageRange: ageGroup, male: 0, female: 0, total: 0 };
    }

    const count = record.count ?? 1;
    if (['nam', 'male'].includes(gender)) {
      result[ageGroup].male += count;
    } else if (['nữ', 'nu', 'female'].includes(gender)) {
      result[ageGroup].female += count;
    }
    result[ageGroup].total += count;
  });

  // Chuyển đổi và sắp xếp theo thứ tự đã định nghĩa
  return ageOrder
    .filter(ageGroup => result[ageGroup]?.total > 0)
    .map(ageGroup => {
      const item = result[ageGroup];
      return {
        ...item,
        malePercent: ((item.male / item.total) * 100).toFixed(1),
        femalePercent: ((item.female / item.total) * 100).toFixed(1),
      };
    });
};


export const getScatterData = (filteredData) => {
  // console.log('[getScatterData] input:', filteredData);
  if (!Array.isArray(filteredData)) return [];

  // Helper: random age from age_group
  const randomAgeFromGroup = (ageGroup) => {
    switch (ageGroup) {
      case '<18': return Math.floor(Math.random() * 6) + 12; // 12-17
      case '18-30': return Math.floor(Math.random() * 13) + 18; // 18-30
      case '31-50': return Math.floor(Math.random() * 20) + 31; // 31-50
      case '>50': return Math.floor(Math.random() * 30) + 51; // 51-80
      default: return 25;
    }
  };

  const expanded = [];
  filteredData.forEach(item => {
    const hour = item['Giờ'] ?? item.hour;
    const gender = item['Giới tính'] ?? item.gender;
    const count = item.count ?? 1;

    // Nếu có age_group và không có age, random ra các bản ghi với tuổi cụ thể, tổng count = count gốc
    if (!item.age && item.age_group) {
      // Chia count ngẫu nhiên cho các tuổi, tổng lại bằng count gốc
      let remaining = count;
      const ageCounts = [];
      // Số lượng tuổi random hóa (có thể là count hoặc ít hơn)
      const n = Math.min(count, 3 + Math.floor(Math.random() * 3)); // random 3-5 nhóm tuổi
      for (let i = 0; i < n; i++) {
        // Nếu là lần cuối, lấy hết phần còn lại
        if (i === n - 1) {
          ageCounts.push({ age: randomAgeFromGroup(item.age_group), count: remaining });
        } else {
          // Random số lượng cho nhóm này (ít nhất 1, nhiều nhất còn lại - (n-i-1))
          const maxForThis = remaining - (n - i - 1);
          const c = Math.max(1, Math.floor(Math.random() * maxForThis) + 1);
          ageCounts.push({ age: randomAgeFromGroup(item.age_group), count: c });
          remaining -= c;
        }
      }
      ageCounts.forEach(({ age, count: c }) => {
        if (!isNaN(hour) && hour >= 7 && hour <= 18 && !isNaN(age) && gender) {
          expanded.push({
            hour,
            age,
            gender,
            count: c
          });
        }
      });
    } else {
      // Nếu có age, giữ nguyên
      const age = item['Tuổi'] ?? item.age;
      if (!isNaN(hour) && hour >= 7 && hour <= 18 && !isNaN(age) && gender) {
        expanded.push({
          hour,
          age,
          gender,
          count
        });
      }
    }
  });

  // Group lại theo hour-age-gender để tính tổng số lần in cho từng nhóm
  const grouped = new Map();
  expanded.forEach(item => {
    const key = `${item.hour}-${item.age}-${item.gender}`;
    if (!grouped.has(key)) {
      grouped.set(key, { hour: item.hour, age: item.age, gender: item.gender, count: 0 });
    }
    grouped.get(key).count += item.count;
  });

  const result = Array.from(grouped.values())
    .sort((a, b) => a.hour - b.hour);

  // console.log('[getScatterData] output:', result);
  return result;
};

// Không cần sửa gì ở đây nếu filteredData là dữ liệu thực tế

// getScatterData sẽ random giá trị tuổi nếu chỉ có age_group mà không có age cụ thể.
// Nếu đã có age, dữ liệu không bị random.