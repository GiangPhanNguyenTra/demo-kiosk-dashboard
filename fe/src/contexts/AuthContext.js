import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Changed to named import
import axios from 'axios';

// NOTE: In development, React.StrictMode intentionally runs useEffect twice.
// This explains why you see duplicate log messages. In production, they will appear only once.

// Cấu hình axios base URL
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'; // Default to localhost if not set
axios.defaults.timeout = 100000; // 10 giây timeout

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Cấu hình axios để tự động gửi token
  useEffect(() => {
    // console.log('AuthContext useEffect - token changed:', !!token);
    if (token) {
      // Set Authorization header cho tất cả requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // console.log('✅ Set Authorization header:', `Bearer ${token.substring(0, 20)}...`);
      
      try {
        const decoded = jwtDecode(token); // Use jwtDecode from named import
        // console.log('AuthContext - decoded user:', decoded);
        setUser(decoded);
      } catch (error) {
        // console.error('Invalid token:', error);
        logout();
      }
    } else {
      // Xóa Authorization header
      delete axios.defaults.headers.common['Authorization'];
      // console.log('❌ Removed Authorization header');
    }
    setLoading(false);
    // console.log('AuthContext - loading set to false');
  }, [token]);

  const login = async (username, password) => {
    try {
      // console.log('Login function started with axios');
      setLoading(true);
      
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      // console.log('Making axios request to /login...');
      const response = await axios.post('/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      // console.log('Login API response received, token:', !!access_token);
      
      // Decode token và set user ngay lập tức
      try {
        const decoded = jwtDecode(access_token);
        // console.log('Login - decoded token:', decoded);
        setUser(decoded);
      } catch (decodeError) {
        // console.error('Token decode error:', decodeError);
        setLoading(false);
        return { 
          success: false, 
          error: 'Token không hợp lệ' 
        };
      }
      
      // Set token và lưu vào localStorage
      localStorage.setItem('token', access_token);
      setToken(access_token); // useEffect sẽ set loading = false
      
      // console.log('Login completed successfully with axios');
      return { success: true };
    } catch (error) {
      // console.error('Axios login error:', error);
      setLoading(false);
      return { 
        success: false, 
        error: error.response?.data?.detail || error.message || 'Đăng nhập thất bại' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      await axios.post('/users/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Đổi mật khẩu thất bại' 
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isCity: user?.role === 'city',
    isWard: user?.role === 'ward',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};