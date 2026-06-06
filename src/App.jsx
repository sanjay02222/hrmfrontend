import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Header from "./components/Header";
import AdminDashboardView from "./components/pages/AdminDashboardView";
import SuperAdminDashboardView from "./components/pages/SuperAdminDashboardView";
import EmployeeDashboardView from "./components/pages/EmployeeDashboardView";
import LoginView from "./components/pages/LoginView";
import "./App.css";
import "./styles/print.css";
import { authService } from "./services/authService";
import { apiService } from "./services/apiService";

import "./styles/PopupAnnouncement.css";
import PopupAnnouncement from "./components/PopupAnnouncement";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

function App() {

  // Theme state
  const [theme, setTheme] = useState(getPreferredTheme);
  useEffect(() => {
    document.body.classList.toggle("dark-mode", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event) => {
      const hasStoredTheme = localStorage.getItem("theme");
      if (!hasStoredTheme) {
        setTheme(event.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggleTheme = () =>
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));

  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [loading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginRoute =
    !currentUser &&
    (location.pathname === "/employee" || location.pathname === "/admin" || location.pathname === "/superadmin");
  const showFooter = !isLoginRoute;

  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    const fetchPopupSettings = async () => {
      try {
        const data = await apiService.popups.get();
        if (data && data.status) {
          setPopupData({
            status: true,
            title: data.title,
            text_content: data.textContent,
            image_url: data.imageUrl ? apiService.getImageUrl(data.imageUrl) : "",
          });
          setShowPopup(true);
        }
      } catch (error) {
        console.error("Failed to fetch popup settings:", error);
      }
    };

    fetchPopupSettings();
  }, []);

  const handleClosePopup = () => setShowPopup(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setCurrentUser(null);
      navigate("/employee");
    }
  };

  const handleLogin = async (credentials, role) => {
    try {
      const user = await authService.loginWithRole(
        credentials.username,
        credentials.password,
        role,
      );
      setCurrentUser(user);

      if (user?.role === "admin") {
        navigate("/admin/homepage");
      } else if (user?.role === "superadmin") {
        navigate("/superadmin/homepage");
      } else {
        navigate("/employee/homepage");
      }
      return user;
    } catch (error) {
      console.error("App: Login failed:", error);
      throw error;
    }
  };

  // Proper async login handler example (if needed elsewhere)
  // const handleLogin = async (credentials, role) => {
  //   try {
  //     console.log("App: handleLogin called for role:", role);
  //     const user = await authService.loginWithRole(
  //       credentials.username,
  //       credentials.password,
  //       role,
  //     );
  //     console.log("App: Login successful, user:", user);
  //     setCurrentUser(user);
  //     // Redirect based on role
  //     if (user.role === "admin") {
  //       navigate("/admin");
  //     } else if (user.role === "superadmin") {
  //       navigate("/superadmin");
  //     } else {
  //       navigate("/employee");
  //     }
  //     return user;
  //   } catch (error) {
  //     console.error("App: Login failed:", error);
  //     throw error;
  //   }
  // };


  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div className="loader" style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1a4a7c',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '500' }}>Initializing System...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  return (
    <div className="app-container">
      <Header theme={theme} toggleTheme={toggleTheme} />
      {showPopup && popupData && (
        <PopupAnnouncement data={popupData} onClose={handleClosePopup} />
      )}
      <main className={`main-content${isLoginRoute ? ' login-main-content' : ''}`}>
        <Routes>
          <Route
            path="/admin/*"
            element={
              currentUser?.role === "admin" ? (
                <AdminDashboardView onLogout={handleLogout} user={currentUser} />
              ) : (
                <LoginView onLogin={handleLogin} role="admin" />
              )
            }
          />
          <Route
            path="/superadmin/*"
            element={
              currentUser?.role === "superadmin" ? (
                <SuperAdminDashboardView onLogout={handleLogout} user={currentUser} />
              ) : (
                <LoginView onLogin={handleLogin} role="superadmin" />
              )
            }
          />
          <Route
            path="/employee/*"
            element={
              currentUser?.role === "employee" ? (
                <EmployeeDashboardView onLogout={handleLogout} user={currentUser} />
              ) : (
                <LoginView onLogin={handleLogin} role="employee" />
              )
            }
          />
          <Route path="/" element={<Navigate to="/employee" />} />
          <Route path="/login" element={<Navigate to="/employee" replace />} />
        </Routes>
      </main>
      {showFooter && (
        <footer className="app-footer">
          &copy; {new Date().getFullYear()} Grace International. All rights reserved.
        </footer>
      )}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar theme={theme === 'dark' ? 'dark' : 'light'} />
    </div>
  );
}

export default App;
