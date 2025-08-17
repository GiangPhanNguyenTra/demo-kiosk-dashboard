import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8000', // Đổi sang port mới nếu backend đổi port
  timeout: 100000
});

// Add request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// const API_BASE_URL = 'http://localhost:8000';

// class ApiService {
//   constructor() {
//     this.token = localStorage.getItem('token');
//   }

//   setToken(token) {
//     this.token = token;
//     if (token) {
//       localStorage.setItem('token', token);
//     } else {
//       localStorage.removeItem('token');
//     }
//   }

//   getToken() {
//     return this.token;
//   }

//   getBaseUrl() {
//     return API_BASE_URL;
//   }

//   async request(endpoint, options = {}) {
//     const token = this.token || localStorage.getItem('token'); // fallback to localStorage
//     const url = `${API_BASE_URL}${endpoint}`;
//     const config = {
//       headers: {
//         'Content-Type': 'application/json',
//         ...(token && { Authorization: `Bearer ${token}` }), // use token if available
//         ...options.headers,
//       },
//       ...options,
//     };

//     try {
//       const response = await fetch(url, config);
//       if (!response.ok) {
//         // Try to get error details from response
//         let errorMessage = `HTTP error! status: ${response.status}`;
//         try {
//           const errorData = await response.json();
//           if (errorData.detail) {
//             errorMessage = errorData.detail;
//           }
//         } catch (jsonError) {
//           // If can't parse JSON, use status code message
//           console.warn('Could not parse error response as JSON:', jsonError);
//         }
//         throw new Error(errorMessage);
//       }
//       return await response.json();
//     } catch (error) {
//       // console.error('API request failed:', error);
//       throw error;
//     }
//   }

//   // Auth endpoints
//   async login(username, password) {
//     const formData = new FormData();
//     formData.append('username', username);
//     formData.append('password', password);

//     return this.request('/login', {
//       method: 'POST',
//       headers: {},
//       body: formData,
//     });
//   }

//   async changePassword(oldPassword, newPassword) {
//     return this.request('/users/change-password', {
//       method: 'POST',
//       body: JSON.stringify({
//         old_password: oldPassword,
//         new_password: newPassword,
//       }),
//     });
//   }

//   // Users endpoints
//   async getUsers() {
//     return this.request('/users');
//   }

  
//   // Reports endpoints
//   async getReports(limit = 1000, offset = 0) {
//     return this.request(`/reports?limit=${limit}&offset=${offset}`);
//   }

//   // Extract metadata from reports data
//   extractMetadataFromReports(reports) {
//     const metadata = {
//       domains: [...new Set(reports.map(r => r.domain).filter(Boolean))],
//       procedures: [...new Set(reports.map(r => r.procedure).filter(Boolean))],
//       age_groups: [...new Set(reports.map(r => r.age_group).filter(Boolean))],
//       genders: [...new Set(reports.map(r => r.gender).filter(Boolean))],
//       count_range: {
//         min_count: Math.min(...reports.map(r => r.count || 0)),
//         max_count: Math.max(...reports.map(r => r.count || 0))
//       },
//       date_range: {
//         min_date: Math.min(...reports.map(r => new Date(r.date).getTime())),
//         max_date: Math.max(...reports.map(r => new Date(r.date).getTime()))
//       },
//       total_stats: {
//         total_records: reports.length
//       }
//     };
    
//     // Convert timestamp back to date string
//     metadata.date_range.min_date = new Date(metadata.date_range.min_date).toISOString().split('T')[0];
//     metadata.date_range.max_date = new Date(metadata.date_range.max_date).toISOString().split('T')[0];
    
//     return metadata;
//   }

//   // Dashboard specific methods
//   async getDashboardData(wardId, limit = 1000) {
//     try {
//       const response = await this.getReports(limit);
//       const reports = response.data || [];
      
//       // Extract metadata from reports
//       const metadata = this.extractMetadataFromReports(reports);
      
//       // Transform reports data to match dashboard format
//       return this.transformReportsToChartData(reports, wardId, metadata);
//     } catch (error) {
//       // console.error('Failed to get dashboard data:', error);
//       return [];
//     }
//   }

//   transformReportsToChartData(reports, wardId, metadata = null) {
//     return reports
//       .filter(report => report.ward_id === wardId)
//       .map(report => ({
//         id: report.id,
//         'Tên thủ tục': report.procedure,
//         'Lĩnh vực': report.domain,
//         'Thời gian in phiếu': report.print_time,
//         'Ngày': report.date,
//         'Thứ': new Date(report.date).getDay(),
//         'Xác thực': report.auth_type,
//         'Giới tính': report.gender,
//         'Tuổi': report.age_group,
//         'Giờ': new Date(report.print_time).getHours(),
//         wardId: report.ward_id,
//         count: report.count || 1,
//         domain: report.domain,
//         gender: report.gender,
//         age_group: report.age_group,
//         print_time: report.print_time,
//         date: report.date,
//         auth_type: report.auth_type
//       }));
//   }

//   mapProcedureToDomain(procedure, metadata = null) {
//     // Nếu có metadata domains, sử dụng random domain từ metadata
//     if (metadata && metadata.domains && metadata.domains.length > 0) {
//       return metadata.domains[Math.floor(Math.random() * metadata.domains.length)];
//     }
    
//     // Fallback: sử dụng mapping cố định
//     const domainMap = {
//       'Cấp bản sao Giấy khai sinh': 'Hộ tịch',
//       'Đăng ký khai tử': 'Hộ tịch', 
//       'Đăng ký kết hôn': 'Hộ tịch',
//       'Đổi CMND sang CCCD': 'Căn cước công dân',
//       'Cấp sổ hộ khẩu': 'Hộ khẩu',
//       'Cấp giấy chứng nhận độc thân': 'Hộ tịch',
//       'Xác nhận tình trạng hôn nhân': 'Hộ tịch',
//       'Đăng ký thường trú': 'Hộ khẩu',
//       'Đăng ký tạm trú': 'Hộ khẩu',
//       'Cấp giấy xác nhận địa chỉ': 'Hành chính'
//     };
//     return domainMap[procedure] || 'Khác';
//   }

//   mapAgeGroupToAge(ageGroup) {
//     const ageMap = {
//       '<18': Math.floor(Math.random() * 17) + 1,
//       '18-30': Math.floor(Math.random() * 13) + 18,
//       '31-50': Math.floor(Math.random() * 20) + 31,
//       '>50': Math.floor(Math.random() * 30) + 51
//     };
//     return ageMap[ageGroup] || 25;
//   }

//   getRandomAuthType() {
//     const authTypes = ['CCCD', 'QR']; 
//     return authTypes[Math.floor(Math.random() * authTypes.length)];
//   }
// }

// const apiService = new ApiService();
// export default apiService;
