import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // thông tin user
  const [loading, setLoading] = useState(true); // trạng thái khi load app
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  // 🟢 Lấy thông tin user nếu có token
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (error) {
          console.error("Auth check failed:", error);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  // 🟢 Đăng nhập
  const login = async (email, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
    return user;
  };

  // 🟢 Đăng ký
  const register = async (name, email, password) => {
    const res = await axios.post(`${API_URL}/auth/register`, { name, email, password });
    const { token, user } = res.data;

    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
    return user;
  };

  // 🔴 Đăng xuất
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
