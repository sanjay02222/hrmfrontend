import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  GELogo,
  CalendarIcon,
  CloudSunIcon,
  LocationPinIcon,
  UserPortalIcon,
  AdminPanelIcon,
} from "../assets/Icons";
import "../styles/Header.css";


// Accept theme and toggleTheme as props
export default function Header({ theme, toggleTheme }) {
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [networkConnected, setNetworkConnected] = useState(false);
  const isSuperAdminRoute = location.pathname === "/superadmin";

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkConnected(navigator.onLine);
    };

    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  const formatNepaliBsDate = (date) => {
    try {
      const formatter = new Intl.DateTimeFormat(
        "ne-NP-u-ca-bikram-sambat-nu-deva",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      return formatter.format(date);
    } catch {
      try {
        const fallbackFormatter = new Intl.DateTimeFormat("en-NP-u-ca-bikram-sambat", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return fallbackFormatter.format(date);
      } catch {
        return date.toLocaleDateString();
      }
    }
  };

  const formattedDate = formatNepaliBsDate(currentDate);
  const officeOpen = currentDate.getHours() >= 10 && currentDate.getHours() < 17;

  return (
    <header
      className={`header-wrapper ${
        isSuperAdminRoute ? "superadmin-route" : ""
      }`}
    >
      <div className="header-top">
        <div className="header-top-container">
          <div className="header-status-strip">
            <div className="header-status-items">
              <div
                className={`status-pill status-pill-network ${
                  networkConnected ? "connected" : "disconnected"
                }`}
              >
                <span
                  className={`network-dot ${
                    networkConnected ? "connected" : "disconnected"
                  }`}
                ></span>
                <span>
                  {networkConnected
                    ? "Network Connected"
                    : "Network Disconnected"}
                </span>
              </div>

              <span className="status-divider" aria-hidden="true"></span>

              <div className="status-pill status-pill-weather">
                <CloudSunIcon />
                <span>Partly Cloudy</span>
              </div>

              <span className="status-divider" aria-hidden="true"></span>

              <div
                className={`status-pill status-pill-office ${
                  officeOpen ? "open" : "closed"
                }`}
              >
                <span>{officeOpen ? "Office Open" : "Office Closed"}</span>
              </div>
            </div>

            <div className="top-date-text">
              <CalendarIcon />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="header-main-shell">
        <div className="header-main">
          <div className="header-left">
            <div className="brand-mark">
              <GELogo />
            </div>

            <div className="brand-info">
              <h1 className="brand-name">GLOBAL EYE</h1>
              <p className="brand-tagline">Education Consultancy Pvt. Ltd.</p>
              <div className="brand-divider" aria-hidden="true"></div>
              <div className="brand-address-row">
                <LocationPinIcon />
                <span className="brand-address">Kathmandu, Butwal, Pokhara and Nepalgunj</span>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <nav className="header-nav">
            <NavLink
              to="/employee"
              className={({ isActive }) =>
                `header-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">
                <UserPortalIcon />
              </span>
              <span className="nav-text">Employee Portal</span>
              <span className="nav-text-short">EP</span>
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `header-nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">
                <AdminPanelIcon />
              </span>
              <span className="nav-text">Admin Portal</span>
              <span className="nav-text-short">AP</span>
            </NavLink>
            <NavLink
              to="/superadmin"
              className={({ isActive }) =>
                `header-nav-item superadmin-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="nav-icon">
                <AdminPanelIcon />
              </span>
              <span className="nav-text">Super Admin Portal</span>
              <span className="nav-text-short">SP</span>
            </NavLink>
            </nav>
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              <span className="theme-toggle-icon" aria-hidden="true">
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
