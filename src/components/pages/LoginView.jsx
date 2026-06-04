import { useEffect, useState } from "react";
import "../../styles/LoginSimple.css";
import { apiService } from "../../services/apiService";
import {
  UserIdIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
} from "../../assets/Icons";
import Loader from "../Loader";

export default function LoginView({ onLogin, role }) {
  const isSuperAdmin = role === "superadmin";
  const [credentials, setCredentials] = useState({
    username: role === "superadmin" ? "mausam" : role === "admin" ? "mausam" : "",
    password: role === "superadmin" ? "mausam123" : role === "admin" ? "mausam123" : "",
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notices, setNotices] = useState([]);
  const [noticeError, setNoticeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [quickStats, setQuickStats] = useState({
    totalBranches: 4,
    totalEmployees: 0,
    presentToday: 0,
    pendingReviews: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        // Super Admin: show a richer, latest feed across the organization.
        // Employee/Admin: keep the compact notice preview.
        const noticeData = isSuperAdmin
          ? await apiService.notices.getAll()
          : await apiService.notices.getActive();

        if (!Array.isArray(noticeData)) {
          setNotices([]);
          setNoticeError("");
          return;
        }

        if (isSuperAdmin) {
          const activeNotices = noticeData.filter(
            (n) => n?.isActive !== false,
          );
          activeNotices.sort(
            (a, b) =>
              new Date(b?.createdAt || 0).getTime() -
              new Date(a?.createdAt || 0).getTime(),
          );
          setNotices(activeNotices.slice(0, 6));
        } else {
          setNotices(noticeData.slice(0, 2));
        }

        setNoticeError("");
      } catch (loadError) {
        console.error("LoginView: Error loading notices:", loadError);
        setNotices([]);
        setNoticeError(
          isSuperAdmin
            ? "Branch notices are unavailable right now."
            : "Admin notices are unavailable right now.",
        );
      }
    };

    loadNotices();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const loadExecutiveStats = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [employeesData, attendanceData, leaveData, noticesData] =
          await Promise.allSettled([
            apiService.employees.getAll(),
            apiService.attendance.getAll(),
            apiService.leaveRequests.getAll(),
            apiService.notices.getAll(),
          ]);

        const employees =
          employeesData.status === "fulfilled" && Array.isArray(employeesData.value)
            ? employeesData.value
            : [];
        const attendance =
          attendanceData.status === "fulfilled" && Array.isArray(attendanceData.value)
            ? attendanceData.value
            : [];
        const leaveRequests =
          leaveData.status === "fulfilled" && Array.isArray(leaveData.value)
            ? leaveData.value
            : [];
        const noticeItems =
          noticesData.status === "fulfilled" && Array.isArray(noticesData.value)
            ? noticesData.value
            : [];

        const presentToday = attendance.filter(
          (record) => record?.status === "Present" && String(record?.date || "").startsWith(today),
        ).length;
        const pendingReviews = leaveRequests.filter((request) =>
          ["pending", "submitted", "in-review"].includes(
            String(request?.status || "").toLowerCase(),
          ),
        ).length;

        setQuickStats({
          totalBranches: 4,
          totalEmployees: employees.length,
          presentToday,
          pendingReviews,
        });

        const feedFromNotices = noticeItems
          .filter((item) => item?.title || item?.content)
          .sort(
            (a, b) =>
              new Date(b?.createdAt || 0).getTime() -
              new Date(a?.createdAt || 0).getTime(),
          )
          .slice(0, 2)
          .map((item) => ({
            id: item.id || `${item.title}-${item.createdAt}`,
            text: `${getBranchMeta(item).label} published a new notice`,
            time: formatNoticeDateTime(item.createdAt),
          }));

        const fallbackActions = [
          {
            id: "activity-kathmandu",
            text: "Kathmandu admin updated attendance records",
            time: "Just now",
          },
          {
            id: "activity-nepalgunj",
            text: "Nepalgunj branch added 2 new employees",
            time: "Today",
          },
          {
            id: "activity-pokhara",
            text: "Pokhara admin edited employee details",
            time: "Today",
          },
        ];

        setRecentActivities([...feedFromNotices, ...fallbackActions].slice(0, 4));
      } catch (statsError) {
        console.error("LoginView: Failed to load executive stats:", statsError);
      }
    };

    loadExecutiveStats();
  }, [isSuperAdmin]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedCredentials = {
      username: credentials.username.trim(),
      password: credentials.password,
    };

    try {
      console.log("LoginView: Initiating login for", normalizedCredentials.username, "as", role);
      await onLogin(normalizedCredentials, role);
      console.log("LoginView: Login process initiated successfully");
    } catch (error) {
      console.error("LoginView: Login error:", error);
      setError(
        role === "employee"
          ? "Invalid credentials. Use your Employee ID as username. If the account was just created, try the default password employee123."
          : "Invalid credentials. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentHour = currentTime.getHours();
  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
        ? "Good Afternoon"
        : "Good Evening";

  const quickSummaryItems = [
    { label: "Notices", value: `${notices.length} Updates`, tone: "general" },
  ];

  const formatNoticeDateTime = (createdAt) => {
    if (!createdAt) return "Recent";
    try {
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return "Recent";
      return d.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Recent";
    }
  };

  const getBranchMeta = (notice) => {
    const raw = [
      notice?.branch,
      notice?.location,
      notice?.city,
      notice?.region,
      notice?.author,
      notice?.createdBy,
      notice?.title,
      notice?.content,
      notice?.type,
      notice?.created_at,
    ]
      .filter(Boolean)
      .join(" ")
      .toString()
      .toLowerCase();

    const matchers = [
      { key: "butwal", label: "Butwal Branch", tokens: ["butwal"] },
      { key: "kathmandu", label: "Kathmandu Branch", tokens: ["kathmandu"] },
      { key: "pokhara", label: "Pokhara Branch", tokens: ["pokhara"] },
      {
        key: "nepalgunj",
        label: "Nepalgunj Branch",
        tokens: ["nepalgunj", "nepal gunj", "ng"],
      },
    ];

    for (const m of matchers) {
      if (m.tokens.some((t) => raw.includes(t))) return { key: m.key, label: m.label };
    }

    return { key: "kathmandu", label: "Kathmandu Branch" };
  };

  return (
    <div className={`login-container ${isSuperAdmin ? "superadmin-premium" : ""}`}>
      <div className="login-layout">
        <div className="login-info-panel">
          {isSuperAdmin ? (
            <div className={`superadmin-premium-branding ${isSuperAdmin ? 'animate-branding' : ''}`}>
              <div className="branding-logo-container">
                <div className="logo-glow"></div>
                🔐
              </div>
              <div className="branding-text-group">
                <div className="time-greeting">{greeting}</div>
                <h1 className="branding-greeting">CEO Mausam Kunwar Sir</h1>
                <div className="branding-divider"></div>
                <p className="branding-subtitle">
                  Centralized Executive Supervision &nbsp;|&nbsp; Multi-Branch Authority
                </p>
              </div>

              <div className="branding-section-divider"></div>

              <div className="branch-presence-panel">
                <div className="branch-names-line">
                  Kathmandu &nbsp;|&nbsp; Butwal &nbsp;|&nbsp; Pokhara &nbsp;|&nbsp; Nepalgunj
                </div>
              </div>

              <div className="branding-time-block">
                <div className="time-block-title">Headquarters Time</div>
                <div className="time-block-zone">NPT (GMT +5:45)</div>
                <div className="time-block-clock">{formattedTime}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="login-clock-panel">
                <div className="clock-greeting">{greeting}</div>
                <div className="clock-support-text">
                  Welcome back to Global Eye HR Portal
                </div>
                <div className="clock-time">{formattedTime}</div>
                <div className="clock-date">{formattedDate}</div>
              </div>

              <div className="quick-summary-row">
                {quickSummaryItems.map((item) => (
                  <article
                    key={item.label}
                    className={`quick-summary-card ${item.tone}`}
                  >
                    <span className="quick-summary-label">{item.label}</span>
                    <strong className="quick-summary-value">{item.value}</strong>
                  </article>
                ))}
              </div>

              <div className="notice-board-panel">
                <div className="notice-board-header">
                  <div>
                    <h3>Admin Notice & Photo Portal</h3>
                    <p>Latest updates posted from the admin panel</p>
                  </div>
                </div>

                <div className="notice-board-list">
                  {noticeError ? (
                    <div className="notice-board-empty">{noticeError}</div>
                  ) : notices.length > 0 ? (
                    notices.map((notice) => (
                      <article key={notice.id} className="notice-card">
                        {notice.photo && (
                          <img
                            className="notice-card-image"
                            src={apiService.getImageUrl(notice.photo)}
                            alt={notice.title}
                          />
                        )}
                        <div className="notice-card-body">
                          <div className="notice-card-meta">
                            <span>{notice.type || "General"}</span>
                            <span>
                              {notice.createdAt
                                ? new Date(notice.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    },
                                  )
                                : "Recent"}
                            </span>
                          </div>
                          <h4>{notice.title}</h4>
                          <p>{notice.content}</p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="notice-board-empty">
                      No admin notice or photo has been posted yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="login-card">
          {!isSuperAdmin && (
            <div className="login-header">
              <h2>
                {role === "admin"
                  ? "Admin Portal"
                  : "Employee Portal"}
              </h2>
              <p className="login-subtitle">
                Global Eye HR Management System
              </p>
            </div>
          )}

          {isSuperAdmin && (
            <div className="login-header">
              <h2>Executive Access</h2>
            </div>
          )}

          <div className="login-form-panel" style={{ position: 'relative' }}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.7)',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '22px',
                backdropFilter: 'blur(2px)'
              }}>
                <Loader size="medium" message="Authenticating..." />
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" style={{ opacity: loading ? 0.5 : 1 }}>
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label htmlFor="username">
                  {role === "superadmin"
                    ? "Super Admin ID"
                    : role === "admin"
                    ? "Username"
                    : "Employee ID"}
                </label>
                <div className="input-shell">
                  <span className="input-icon" aria-hidden="true">
                    <UserIdIcon />
                  </span>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    placeholder={
                      role === "superadmin"
                        ? "Enter your super admin ID"
                        : role === "admin"
                        ? "Enter your username"
                        : "Enter your employee ID"
                    }
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-shell">
                  <span className="input-icon" aria-hidden="true">
                    <LockIcon />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="login-action-panel">
                <button
                  type="submit"
                  className={`btn-login ${isSuperAdmin ? "btn-login-executive" : ""} ${loading ? "loading" : ""}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="btn-loading-spinner"></span>
                      <span>Authenticating...</span>
                    </>
                  ) : role === "superadmin" ? (
                    "Enter Supervision Center"
                  ) : role === "admin" ? (
                    "Sign In to Admin Portal"
                  ) : (
                    "Sign In to Employee Portal"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="login-footer login-footer-panel">
          <p className="login-footer-heading">
            {isSuperAdmin
              ? "Executive Support"
              : role === "admin"
                ? "Quick Access"
                : "Login Help"}
          </p>
          <p>
            {isSuperAdmin ? (
              <span>
                Need help accessing your account? Contact system support.
              </span>
            ) : (
              <span>
                Use your Employee ID as the username. New employee accounts may start
                with <strong>employee123</strong>.
              </span>
            )}
          </p>
          <p className="login-footer-note">
            {isSuperAdmin
              ? "All branch notices and updates are visible for CEO review."
              : role === "admin"
                ? "Branch admin access is restricted to assigned branch records, attendance, and employee details."
                : "You can update your temporary password after your first successful login."}
          </p>
        </div>
      </div>
      <div className="login-support-footer">
        <p>Need help logging in? Contact 9743474046</p>
      </div>
    </div>
  );
}
