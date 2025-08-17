import { WEEKDAY_MAP } from './constants';

export const processRealData = (reports, wardId, metadata = null) => {
  if (!reports || reports.length === 0) {
    console.error('processRealData: No reports data provided');
    return [];
  }

  const filteredReports = reports.filter(report => 
    !wardId || String(report.ward_id) === String(wardId)
  );

  if (filteredReports.length === 0) {
    console.warn(`processRealData: No reports found for ward ${wardId}`);
    return [];
  }

  const transformedData = [];
  
  filteredReports.forEach(report => {
    if (!report.date || !report.count) {
      console.warn('processRealData: Invalid report data', report);
      return;
    }

    // Tạo multiple records từ count (mỗi count = 1 lần in phiếu)
    for (let i = 0; i < report.count; i++) {
      const date = new Date(report.date);
      
      // Sử dụng print_timestamp từ DB nếu có, nếu không thì tạo mới
      let printTime;
      if (report.print_timestamp) {
        printTime = new Date(report.print_timestamp);
      } else {
        // Random giờ từ 7-18h
        const hour = Math.floor(Math.random() * 12) + 7;
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        printTime = new Date(date.getTime() + hour * 3600000 + minute * 60000 + second * 1000);
      }
      
      // Sử dụng age từ DB nếu có, nếu không thì convert từ age_group
      let age = report.age;
      if (!age) {
        age = getAgeFromAgeGroup(report.age_group);
      }
      
      transformedData.push({
        id: `${report.id}_${i}`,
        'Tên thủ tục': report.procedure || 'N/A',
        'Lĩnh vực': report.domain || 'N/A',
        'Thời gian in phiếu': printTime,
        'Ngày': date,
        'Thứ': date.getDay(),
        'Tên thứ': report.weekday_name || getWeekdayName(date.getDay()),
        'Xác thực': report.authentication_method || 'CCCD',
        'Giới tính': report.gender || 'N/A',
        'Tuổi': age,
        'Nhóm tuổi': report.age_group_name || getAgeGroupName(report.age_group),
        'Giờ': printTime.getHours(),
        wardId: report.ward_id,
        // Thêm các trường từ DB
        procedure: report.procedure,
        domain: report.domain,
        gender: report.gender,
        age_group: report.age_group,
        hour: printTime.getHours(),
        date: date,
        timestamp: printTime,
        count: 1
      });
    }
  });

  return transformedData;
};

// Helper functions
function getAgeFromAgeGroup(ageGroup) {
  if (!ageGroup) return 25; // default
  
  switch (ageGroup) {
    case '<18': return Math.floor(Math.random() * 2) + 16; // 16-17
    case '18-30': return Math.floor(Math.random() * 13) + 18; // 18-30
    case '31-50': return Math.floor(Math.random() * 20) + 31; // 31-50
    case '>50': return Math.floor(Math.random() * 20) + 51; // 51-70
    default: return 25;
  }
}

function getAgeGroupName(ageGroup) {
  const mapping = {
    '<18': 'Thanh thiếu niên',
    '18-30': 'Thanh niên',
    '31-50': 'Trung niên',
    '>50': 'Cao tuổi'
  };
  return mapping[ageGroup] || 'Trung niên';
}

function getWeekdayName(dayOfWeek) {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return names[dayOfWeek] || 'Monday';
}

// NEW: Transform raw reports into dashboard data for a given ward
// Removed duplicate processRealData function to avoid redeclaration error.

// Export empty functions để tránh lỗi import
export const generateSampleData = () => {
  console.error('generateSampleData: Function disabled. Use real data instead.');
  return [];
};

export const generateDashboardData = () => {
  console.error('generateDashboardData: Function disabled. Use real data instead.');
  return [];
};
