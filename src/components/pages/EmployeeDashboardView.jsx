import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/EmployeeDashboard.css";
import "../../styles/LoginSimple.css";
import { authService } from "../../services/authService";
import { apiService } from "../../services/apiService";
import { toast } from "react-toastify";
import Loader from "../Loader";

export default function EmployeeDashboardView({ onLogout, user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionUser = user || authService.getCurrentUser();
  const effectiveUser = user || sessionUser;
  const effectiveUserId = effectiveUser?.id;

  // Sync activeTab with URL
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "leave", "security", "profile"];
    return validTabs.includes(path) ? path : "homepage";
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "leave", "security", "profile"];
    if (validTabs.includes(path) && path !== activeTab) {
      setActiveTab(path);
    } else if (location.pathname === "/employee" || location.pathname === "/employee/") {
      navigate("/employee/homepage", { replace: true });
    }
  }, [location.pathname, activeTab, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    navigate(`/employee/${tab}`);
  };

  const [notices, setNotices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(effectiveUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);

  // Form states
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    leaveType: "Casual Leave",
    reason: "",
  });

  // Check-in/Check-out states
  const [checkInStatus, setCheckInStatus] = useState(null);
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: effectiveUser?.name || "",
    email: effectiveUser?.email || "",
    department: effectiveUser?.department || "",
    phone: effectiveUser?.phone || "",
    branch: effectiveUser?.branch || "",
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profilePhotoMessage, setProfilePhotoMessage] = useState(null);
  const [attendanceMessage, setAttendanceMessage] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceStartDate, setAttendanceStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]
  );
  const [attendanceEndDate, setAttendanceEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const requiresPasswordChange = Boolean(
    effectiveUser?.mustChangePassword ||
    effectiveUser?.requirePasswordChange ||
    effectiveUser?.forcePasswordChange ||
    effectiveUser?.isFirstLogin,
  );

  useEffect(() => {
    // Load initial data - authentication is handled by App component
    // NOTE: user.id is the UUID for API calls, user.employeeId is for display/login only
    if (effectiveUserId) {
      loadInitialData();
    }
  }, [effectiveUserId ?? null]);

  useEffect(() => {
    if (requiresPasswordChange) {
      setShowPasswordModal(true);
    }
  }, [requiresPasswordChange]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!effectiveUserId) {
        throw new Error("User session not found");
      }

      // Load all data in parallel
      console.log("EmployeeDashboard: Loading data for user:", effectiveUser);
      console.log("EmployeeDashboard: Using UUID for API calls:", effectiveUserId);
      console.log(
        "EmployeeDashboard: Employee ID for display:",
        effectiveUser?.employeeId,
      );

      const results = await Promise.allSettled([
        apiService.employees.getById(effectiveUserId),
        apiService.notices.getActive(),
        apiService.attendance.getByEmployee(effectiveUserId),
        apiService.leaveRequests.getByEmployee(effectiveUserId),
        apiService.globalSettings.get(),
        apiService.holidays.getAll(),
      ]);

      const profileData = results[0].status === "fulfilled" ? results[0].value : effectiveUser;
      const noticesData = results[1].status === "fulfilled" ? results[1].value : [];
      const attendanceData = results[2].status === "fulfilled" ? results[2].value : [];
      const leaveRequestsData = results[3].status === "fulfilled" ? results[3].value : [];
      const holidaysData = results[5].status === "fulfilled" ? results[5].value : [];

      setCurrentProfile(profileData || effectiveUser);
      setProfileForm({
        name: profileData?.name || effectiveUser?.name || "",
        email: profileData?.email || effectiveUser?.email || "",
        department: profileData?.department || effectiveUser?.department || "",
        phone: profileData?.phone || effectiveUser?.phone || "",
        branch: profileData?.branch || effectiveUser?.branch || "",
      });
      setProfilePhotoPreview(profileData?.photo || "");
      setNotices(Array.isArray(noticesData) ? noticesData : []);
      setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      setLeaveRequests(Array.isArray(leaveRequestsData) ? leaveRequestsData : []);
      setHolidays(Array.isArray(holidaysData) ? holidaysData : []);

      if (results[4].status === "fulfilled") {
        setGlobalSettings(results[4].value);
      }

      // Check if already checked in today - using local date
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      console.log("EmployeeDashboard: Checking attendance for date:", today);

      const todayAttendance = Array.isArray(attendanceData)
        ? attendanceData?.find((record) => {
          // Handle different date formats (string or Date object)
          const recordDate = record.date instanceof Date
            ? record.date.toISOString().split("T")[0]
            : String(record.date).split("T")[0];
          return recordDate === today;
        })
        : null;

      setCurrentAttendance(todayAttendance);
      if (todayAttendance) {
        setCheckInStatus(todayAttendance.checkOutTime ? "completed" : "checked-in");
      } else {
        setCheckInStatus(null);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      if (!effectiveUserId) return;
      setLoadingAttendance(true);
      const data = await apiService.attendance.getByEmployee(effectiveUserId, {
        startDate: attendanceStartDate,
        endDate: attendanceEndDate
      });
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      loadAttendance();
    }
  }, [activeTab, attendanceStartDate, attendanceEndDate]);

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setAttendanceMessage(null);
      if (!effectiveUserId) {
        throw new Error("User session not found");
      }
      console.log("EmployeeDashboard: Handling check-in for", effectiveUserId);

      // Check-in API expects the employee ID (UUID) and an empty data object
      await apiService.attendance.checkIn(effectiveUserId, {});

      // Refresh all data
      await loadInitialData();
      const msg = "Thank you! Check-in successful. Have a great day at work.";
      setAttendanceMessage({ type: "success", text: msg });
      toast.success(msg);
    } catch (error) {
      console.error("Error checking in:", error);
      const rawMessage = String(error?.message || "");
      const restricted =
        rawMessage.toLowerCase().includes("branch network") ||
        rawMessage.toLowerCase().includes("approved branch") ||
        rawMessage.toLowerCase().includes("allowed ip") ||
        rawMessage.toLowerCase().includes("network ip") ||
        rawMessage.includes("403");
      const errorMessage = restricted
        ? "Attendance is allowed only from your branch network."
        : error.message || "Failed to check in. Please try again.";
      setError(`Check-in Error: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentAttendance?.id) {
      toast.warning("No active attendance record found to check out.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAttendanceMessage(null);
      console.log(
        "EmployeeDashboard: Handling check-out for attendance ID:",
        currentAttendance.id,
      );

      // Check-out API expects the attendance ID and an empty data object
      await apiService.attendance.checkOut(currentAttendance.id, {});

      // Refresh all data
      await loadInitialData();
      const msg = "Thank you! Check-out successful. Goodbye and take care.";
      setAttendanceMessage({ type: "success", text: msg });
      toast.success(msg);
    } catch (error) {
      console.error("Error checking out:", error);
      const rawMessage = String(error?.message || "");
      const restricted =
        rawMessage.toLowerCase().includes("branch network") ||
        rawMessage.toLowerCase().includes("approved branch") ||
        rawMessage.toLowerCase().includes("allowed ip") ||
        rawMessage.toLowerCase().includes("network ip") ||
        rawMessage.includes("403");
      const errorMessage = restricted
        ? "You are not connected to the approved branch network IP."
        : error.message || "Failed to check out. Please try again.";
      setError(`Check-out Error: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRequest = async (e) => {
    e.preventDefault();
    if (leaveForm.startDate && leaveForm.endDate && leaveForm.reason) {
      try {
        if (!effectiveUserId) {
          throw new Error("User session not found");
        }
        setLeaveLoading(true);
        const leaveData = {
          employeeId: effectiveUserId, // Use UUID for backend
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          leaveType: leaveForm.leaveType,
          reason: leaveForm.reason,
        };

        await apiService.leaveRequests.create(leaveData);

        // Refresh leave requests
        const updatedLeaveRequests =
          await apiService.leaveRequests.getByEmployee(effectiveUserId);
        setLeaveRequests(updatedLeaveRequests || []);

        setLeaveForm({
          startDate: "",
          endDate: "",
          leaveType: "Casual Leave",
          reason: "",
        });

        toast.success("Leave request submitted successfully!");
      } catch (error) {
        console.error("Error submitting leave request:", error);
        toast.error("Failed to submit leave request. Please try again.");
      } finally {
        setLeaveLoading(false);
      }
    }
  };

  const handleLeaveFormChange = (e) => {
    const { name, value } = e.target;
    setLeaveForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordFormChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfilePhotoFile(file);
    setProfilePhotoMessage(null);
    const previewUrl = URL.createObjectURL(file);
    setProfilePhotoPreview(previewUrl);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!profileForm.name.trim() || !profileForm.department.trim()) {
      setProfileMessage({
        type: "error",
        text: "Name and department are required.",
      });
      return;
    }

    try {
      if (!effectiveUserId) {
        throw new Error("User session not found");
      }
      setProfileLoading(true);
      setProfileMessage(null);
      setProfilePhotoMessage(null);

      const updateData = {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        department: profileForm.department.trim(),
        phone: profileForm.phone.trim(),
      };

      // Only include branch if it's not empty
      if (profileForm.branch.trim()) {
        updateData.branch = profileForm.branch.trim();
      }

      // Explicitly ensure photo is NOT sent here to prevent base64 leakage
      delete updateData.photo;

      const updatedEmployee = await apiService.employees.update(effectiveUserId, updateData);

      let uploadedPhoto = currentProfile?.photo || "";
      if (profilePhotoFile) {
        try {
          const photoResponse = await apiService.employees.uploadPhoto(
            effectiveUserId,
            profilePhotoFile,
          );
          uploadedPhoto =
            photoResponse?.photoUrl ||
            photoResponse?.photo ||
            photoResponse?.employee?.photo ||
            uploadedPhoto;
          setProfilePhotoMessage({
            type: "success",
            text: "Profile photo updated successfully.",
          });
        } catch (photoError) {
          console.error("Error uploading employee photo:", photoError);
          setProfilePhotoMessage({
            type: "error",
            text: "Your details were saved, but the profile photo could not be uploaded.",
          });
        }
      }

      const mergedProfile = {
        ...currentProfile,
        ...updatedEmployee,
        ...updateData,
        photo: uploadedPhoto,
      };
      setCurrentProfile(mergedProfile);
      setProfilePhotoFile(null);
      authService.setCurrentUser({
        ...effectiveUser,
        ...mergedProfile,
      });
      setProfileMessage({
        type: "success",
        text: "Your details were updated successfully.",
      });
    } catch (profileError) {
      console.error("Error updating profile:", profileError);
      setProfileMessage({
        type: "error",
        text: "Failed to update your details. Please try again.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!effectiveUser) {
      setPasswordMessage({
        type: "error",
        text: "User session not found. Please sign in again.",
      });
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage({
        type: "error",
        text: "Please enter your current password and a new password.",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "New password should be at least 6 characters long.",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordMessage(null);
      await authService.changeEmployeePassword(
        effectiveUser,
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage({
        type: "success",
        text: "Password changed successfully.",
      });
      setShowPasswordModal(false);
    } catch (passwordError) {
      console.error("Error changing password:", passwordError);
      setPasswordMessage({
        type: "error",
        text: passwordError.message || "Failed to change password.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Helper to format time string (HH:mm) to 12h display
  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return "-";
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== "string") return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMonthAttendance = attendance.filter((record) => {
    const recordDate = new Date(record.date);
    return (
      !Number.isNaN(recordDate.getTime()) &&
      recordDate.getMonth() === now.getMonth() &&
      recordDate.getFullYear() === now.getFullYear()
    );
  });

  const scheduledCheckInMinutes = globalSettings?.checkInTime
    ? parseTimeToMinutes(globalSettings.checkInTime)
    : 9 * 60 + 15; // default fallback

  let upcomingDaysOffCount = 0;
  const weekOffsList = globalSettings?.weekOffs || [];
  const iterDate = new Date(); // Start from today
  iterDate.setHours(0, 0, 0, 0);
  const currentIntMonth = iterDate.getMonth();

  while (iterDate.getMonth() === currentIntMonth) {
    const dayName = iterDate.toLocaleDateString('en-US', { weekday: 'long' });
    const isWeekOff = weekOffsList.includes(dayName);

    const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`;
    const isHoliday = holidays.some(h => {
      const s = String(h.startDate || "").slice(0, 10);
      const e = String(h.endDate || "").slice(0, 10);
      return dateStr >= s && dateStr <= e;
    });

    if (isWeekOff || isHoliday) {
      upcomingDaysOffCount++;
    }
    iterDate.setDate(iterDate.getDate() + 1);
  }

  const reviewedLeaveRequests = leaveRequests
    .filter((request) => request.status && request.status !== "Pending")
    .slice(0, 3);
  const lateArrivalsCount = attendance.filter((record) => {
    return record.checkInTime && record.checkInTime > "10:14";
  }).length;
  const earlyDepartureCount = attendance.filter((record) => {
    return record.checkOutTime && record.checkOutTime < "16:45";
  }).length;
  const latestNotice = notices[0];
  const todayWorkedHours = currentAttendance?.workHours
    ? `${String(currentAttendance.workHours).replace(/hrs?|hours?/i, "").trim()} hours`
    : checkInStatus === "checked-in"
      ? "Session active"
      : "0 hours";
  const attendanceHeadline =
    checkInStatus === "completed"
      ? "Attendance completed"
      : checkInStatus === "checked-in"
        ? "Currently checked in"
        : "Ready to start your day";
  const dashboardSummary = [
    {
      label: "Today's Status",
      value:
        checkInStatus === "completed"
          ? "Completed"
          : checkInStatus === "checked-in"
            ? "Checked In"
            : "Not Started",
      tone:
        checkInStatus === "completed"
          ? "positive"
          : checkInStatus === "checked-in"
            ? "info"
            : "neutral",
    },
    {
      label: "Worked Today",
      value: todayWorkedHours,
      tone: "info",
    },
    {
      label: "Monthly Attendance",
      value: `${currentMonthAttendance.length} days`,
      tone: "neutral",
    },
    {
      label: "Late / Early",
      value: `${lateArrivalsCount}L / ${earlyDepartureCount}E`,
      tone: (lateArrivalsCount > 0 || earlyDepartureCount > 0) ? "warning" : "positive",
    },
    {
      label: "Upcoming Days Off",
      value: `${upcomingDaysOffCount} days`,
      tone: upcomingDaysOffCount > 0 ? "info" : "neutral",
    },
    {
      label: "Latest Notice",
      value: latestNotice?.title || "No new notice",
      tone: "info",
    },
  ];

  // Loading and Error States
  if (loading) {
    return (
      <div className="card">
        <div style={{ padding: "60px 0" }}>
          <Loader size="large" message="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div
            style={{ fontSize: "18px", color: "#dc2626", marginBottom: "10px" }}
          >
            {error}
          </div>
          <button className="btn btn-login" onClick={loadInitialData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className="employee-header">
        <div className="employee-header-left">
          <button
            className="hamburger-btn"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="employee-header-copy">
            <h2>Employee Dashboard</h2>
            <div className="employee-header-meta">
              <span>Welcome back, {currentProfile?.name || user?.name}</span>
              <span className="employee-header-id">ID {currentProfile?.employeeId || user?.employeeId}</span>
            </div>
          </div>
        </div>
        <div className="employee-header-actions">
          <div className="employee-status-chip">
            {checkInStatus === "completed" ? "Attendance Completed" : checkInStatus === "checked-in" ? "Session Active" : "Ready to Check In"}
          </div>
          <button
            className="dashboard-btn dashboard-btn-logout"
            onClick={async () => { try { await onLogout(); } catch (error) { console.error("Logout error:", error); } }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className={`employee-tabs ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">✕</button>
        <button className={`tab-btn ${activeTab === "homepage" ? "active" : ""}`} onClick={() => handleTabChange("homepage")}>Homepage</button>
        <button className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`} onClick={() => handleTabChange("attendance")}>Attendance</button>
        <button className={`tab-btn ${activeTab === "leave" ? "active" : ""}`} onClick={() => handleTabChange("leave")}>Leave Request</button>
        <button className={`tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => handleTabChange("security")}>Security</button>
        <button className={`tab-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => handleTabChange("profile")}>My Details</button>
      </div>

      {/* Homepage Tab */}
      {activeTab === "homepage" && (
        <div className="employee-tab">
          <div className="homepage-hero">
            <div className="welcome-banner welcome-banner-split">
              <div className="welcome-copy">
                <div className="welcome-heading-block">
                  <h3>Welcome, {currentProfile?.name || user?.name}</h3>
                </div>
                <div className="welcome-support-row">
                  <span>{attendanceHeadline}</span>
                  <span>{currentProfile?.department || user?.department || "Employee"}</span>
                </div>
              </div>
              <div className="employee-portrait-card">
                {currentProfile?.photo ? (
                  <img
                    src={apiService.getImageUrl(currentProfile.photo)}
                    alt={currentProfile?.name || "Employee"}
                    className="employee-portrait-image"
                  />
                ) : (
                  <div className="employee-photo-fallback employee-portrait-image">
                    {(currentProfile?.name || user?.name || "E")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="employee-portrait-overlay">
                  <span className="employee-portrait-label">Office Profile</span>
                  <h4>{currentProfile?.name || user?.name}</h4>
                  <p>{currentProfile?.department || user?.department || "Employee"}</p>
                </div>
              </div>

              {/* Check-in/Check-out Section */}
              <div className="check-in-section homepage-attendance-section" style={{ padding: "20px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
                <h4 style={{ marginTop: 0, marginBottom: "15px" }}>Daily Attendance</h4>
                <div className="attendance-status-container">
                  <div className="attendance-info" style={{ marginBottom: "15px" }}>
                    {checkInStatus === null ? (
                      <p style={{ margin: 0, color: "#4b5563" }}>You haven't checked in yet today.</p>
                    ) : checkInStatus === "checked-in" ? (
                      <p style={{ margin: 0, color: "#059669" }}>
                        ✓ <strong>Checked In</strong> at <strong>{formatDisplayTime(currentAttendance?.checkInTime)}</strong>
                      </p>
                    ) : (
                      <div className="attendance-summary">
                        <p style={{ margin: "0 0 10px 0", color: "#1f2937" }}>✓ <strong>Attendance Completed</strong></p>
                        <div className="time-chips" style={{ display: "flex", gap: "10px" }}>
                          <span style={{ padding: "4px 10px", background: "#ecfdf5", color: "#065f46", borderRadius: "20px", fontSize: "12px", border: "1px solid #d1fae5" }}>In: {formatDisplayTime(currentAttendance?.checkInTime)}</span>
                          <span style={{ padding: "4px 10px", background: "#f3f4f6", color: "#374151", borderRadius: "20px", fontSize: "12px", border: "1px solid #e5e7eb" }}>Out: {formatDisplayTime(currentAttendance?.checkOutTime)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {attendanceMessage && (
                    <div style={{
                      margin: "0 0 15px 0",
                      padding: "10px",
                      backgroundColor: attendanceMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                      color: attendanceMessage.type === "success" ? "#065f46" : "#991b1b",
                      borderRadius: "6px",
                      fontSize: "14px",
                      border: `1px solid ${attendanceMessage.type === "success" ? "#d1fae5" : "#fee2e2"}`
                    }}>
                      {attendanceMessage.text}
                    </div>
                  )}

                  <div className="attendance-actions" style={{ display: "flex", gap: "12px" }}>
                    <button
                      className="btn btn-check-in"
                      onClick={handleCheckIn}
                      disabled={checkInStatus !== null || loading}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: checkInStatus !== null ? "#9ca3af" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: checkInStatus !== null ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Check In
                    </button>
                    <button
                      className="btn btn-check-out"
                      onClick={handleCheckOut}
                      disabled={checkInStatus !== "checked-in" || loading}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: checkInStatus !== "checked-in" ? "#9ca3af" : "#dc2626",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontWeight: "600",
                        cursor: (checkInStatus !== "checked-in" || loading) ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      Check Out
                    </button>
                  </div>
                  {checkInStatus === "checked-in" && (
                    <p style={{ marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
                      Remember to check out before leaving for accurately tracking work hours.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-summary-grid">
            {dashboardSummary.map((item) => (
              <article key={item.label} className={`dashboard-summary-card ${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="profile-overview-card">
            <div className="profile-overview-header">
              <h4>Employee Details</h4>
              <button className="dashboard-btn dashboard-btn-secondary" onClick={() => setActiveTab("profile")}>
                Change Details
              </button>
            </div>
            <div className="profile-overview-grid">
              <div>
                <span>Name</span>
                <strong>{currentProfile?.name || "-"}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{currentProfile?.email || "-"}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{currentProfile?.department || currentProfile?.role || "-"} {currentProfile?.branch ? `(${currentProfile?.branch})` : ""}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{currentProfile?.phone || "-"}</strong>
              </div>
              <div>
                <span>Branch</span>
                <strong>{currentProfile?.branch || "-"}</strong>
              </div>
              <div>
                <span>Added Date</span>
                <strong>{currentProfile?.createdAt ? new Date(currentProfile.createdAt).toLocaleDateString() : "-"}</strong>
              </div>
            </div>
          </div>

          <div className="security-panel dashboard-panel">
            <div className="security-panel-header">
              <div>
                <h4>Account Security</h4>
                <p>
                  Update the temporary password created by admin to keep your account secure.
                </p>
              </div>
              <button className="dashboard-btn dashboard-btn-secondary" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </button>
            </div>
            {requiresPasswordChange && (
              <div className="password-banner">
                You are using an admin-created temporary password. Please change it now.
              </div>
            )}
            {passwordMessage && !showPasswordModal && (
              <div className={`password-message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}
          </div>

          {/* Notices Section */}
          <div className="notices-section">
            <h4>Company Notices</h4>
            <div className="notices-list">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <div>
                      <h5>{notice.title}</h5>
                      <p>{notice.content}</p>
                      {notice.photo && (
                        <img
                          src={apiService.getImageUrl(notice.photo)}
                          alt={notice.title}
                          className="notice-inline-photo"
                        />
                      )}
                      <small style={{ color: "#6b7280" }}>
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "#6b7280" }}>No notices available</p>
              )}
            </div>
          </div>

          <div className="leave-updates-section">
            <h4>Leave Request Updates</h4>
            <div className="leave-updates-list">
              {reviewedLeaveRequests.length > 0 ? (
                reviewedLeaveRequests.map((request) => (
                  <article key={request.id} className="leave-update-card">
                    <div className="leave-update-header">
                      <strong>{request.leaveType || "Leave Request"}</strong>
                      <span className={`leave-update-status ${String(request.status || "").toLowerCase()}`}>
                        {request.status}
                      </span>
                    </div>
                    <p>
                      {new Date(request.startDate).toLocaleDateString()} to{" "}
                      {new Date(request.endDate).toLocaleDateString()}
                    </p>
                    <small>
                      Remarks: {request.adminRemarks || request.rejectionRemarks || request.remarks || "No remarks added"}
                    </small>
                  </article>
                ))
              ) : (
                <p style={{ color: "#6b7280" }}>
                  Approved or rejected leave requests will appear here with admin remarks.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === "attendance" && (
        <div className="employee-tab">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h3 style={{ margin: 0 }}>Attendance History</h3>
            <div className="attendance-filters no-print" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>From:</label>
                <input
                  type="date"
                  value={attendanceStartDate}
                  onChange={(e) => setAttendanceStartDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <label style={{ fontSize: '13px', fontWeight: '500' }}>To:</label>
                <input
                  type="date"
                  value={attendanceEndDate}
                  onChange={(e) => setAttendanceEndDate(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          <div className="table-container" style={{ position: 'relative', minHeight: loadingAttendance ? '200px' : 'auto' }}>
            {loadingAttendance && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.7)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px'
              }}>
                <Loader size="medium" message="Filtering records..." />
              </div>
            )}
            <table style={{ opacity: loadingAttendance ? 0.5 : 1 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Added Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Work Hours</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length > 0 ? (
                  attendance.map((record) => (
                    <tr key={record.id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{currentProfile?.createdAt ? new Date(currentProfile.createdAt).toLocaleDateString() : "-"}</td>
                      <td>{formatDisplayTime(record.checkInTime)}</td>
                      <td>{formatDisplayTime(record.checkOutTime)}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              color:
                                record.status === "Present"
                                  ? "#28a745"
                                  : "#dc2626",
                              fontWeight: "bold",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                record.status === "Present"
                                  ? "#f0fdf4"
                                  : "#fef2f2",
                            }}
                          >
                            {record.status}
                          </span>
                          {record.checkInTime && record.checkInTime > "10:14" && (
                            <span style={{ fontSize: "10px", color: "#d97706", fontWeight: "600" }}>● Late Arrival</span>
                          )}
                          {record.checkOutTime && record.checkOutTime < "16:45" && (
                            <span style={{ fontSize: "10px", color: "#e11d48", fontWeight: "600" }}>● Early Departure</span>
                          )}
                        </div>
                      </td>
                      <td>{record.workHours ? `${String(record.workHours).replace(/hrs?|hours?/i, "").trim()}h` : "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#6b7280",
                      }}
                    >
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Request Tab */}
      {activeTab === "leave" && (
        <div className="employee-tab">
          <h3>Leave Management</h3>

          {/* Leave Request Form */}
          <div className="leave-form-section">
            <h4>Apply for Leave</h4>
            <form onSubmit={handleLeaveRequest}>
              <div className="form-grid">
                <div>
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={leaveForm.startDate}
                    onChange={handleLeaveFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={leaveForm.endDate}
                    onChange={handleLeaveFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="leaveType">Leave Type</label>
                  <select
                    id="leaveType"
                    name="leaveType"
                    value={leaveForm.leaveType}
                    onChange={handleLeaveFormChange}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: "12px" }}>
                <label htmlFor="reason">Reason</label>
                <textarea
                  id="reason"
                  name="reason"
                  placeholder="Enter reason for leave..."
                  value={leaveForm.reason}
                  onChange={handleLeaveFormChange}
                  required
                ></textarea>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button
                  className={`btn btn-login ${leaveLoading ? "loading" : ""}`}
                  type="submit"
                  disabled={leaveLoading}
                >
                  {leaveLoading ? "Submitting..." : "Submit Leave Request"}
                </button>
              </div>
            </form>
          </div>

          {/* Leave Requests History */}
          <div className="leave-history-section" style={{ marginTop: "24px" }}>
            <h4>Leave Requests History</h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Leave Type</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.length > 0 ? (
                    leaveRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          {new Date(request.startDate).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(request.endDate).toLocaleDateString()}
                        </td>
                        <td>{request.leaveType}</td>
                        <td>{request.reason}</td>
                        <td>
                          <span
                            style={{
                              color:
                                request.status === "Approved"
                                  ? "#28a745"
                                  : request.status === "Rejected"
                                    ? "#dc2626"
                                    : "#f59e0b",
                              fontWeight: "bold",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor:
                                request.status === "Approved"
                                  ? "#f0fdf4"
                                  : request.status === "Rejected"
                                    ? "#fef2f2"
                                    : "#fef3c7",
                            }}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td>
                          {request.approvalRemarks || request.rejectionRemarks ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#666",
                                fontStyle: "italic",
                              }}
                            >
                              {request.approvalRemarks || request.rejectionRemarks}
                            </span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#999" }}>
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#6b7280",
                        }}
                      >
                        No leave requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="employee-tab">
          <h3>My Details</h3>
          <div className="profile-editor-panel">
            <div className="profile-editor-intro">
              <h4>Update Your Details</h4>
              <p>Keep your employee information accurate so the office can reach you when needed.</p>
            </div>
            {profileMessage && (
              <div className={`password-message ${profileMessage.type}`}>
                {profileMessage.text}
              </div>
            )}
            {profilePhotoMessage && (
              <div className={`password-message ${profilePhotoMessage.type}`}>
                {profilePhotoMessage.text}
              </div>
            )}
            <form onSubmit={handleProfileUpdate}>
              <div className="form-grid">
                <div>
                  <label htmlFor="profileName">Full Name</label>
                  <input
                    type="text"
                    id="profileName"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="profileEmail">Email</label>
                  <input
                    type="email"
                    id="profileEmail"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileFormChange}
                  />
                </div>
                <div>
                  <label htmlFor="profileDepartment">Department</label>
                  <input
                    type="text"
                    id="profileDepartment"
                    name="department"
                    value={profileForm.department}
                    onChange={handleProfileFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="profilePhone">Phone</label>
                  <input
                    type="text"
                    id="profilePhone"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileFormChange}
                  />
                </div>
                <div>
                  <label htmlFor="profileBranch">Branch</label>
                  <input
                    type="text"
                    id="profileBranch"
                    name="branch"
                    value={profileForm.branch}
                    onChange={handleProfileFormChange}
                    disabled
                  />
                </div>
              </div>
              <div className="profile-photo-editor">
                <div className="profile-photo-preview-shell">
                  {profilePhotoPreview || currentProfile?.photo ? (
                    <img
                      src={profilePhotoPreview || apiService.getImageUrl(currentProfile?.photo)}
                      alt="Profile Preview"
                      className="profile-photo-preview"
                    />
                  ) : (
                    <div className="employee-photo-fallback profile-photo-preview">
                      {(currentProfile?.name || user?.name || "E")
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-photo-input-group">
                  <label htmlFor="profilePhoto">Employee Photo</label>
                  <input
                    type="file"
                    id="profilePhoto"
                    name="profilePhoto"
                    accept="image/*"
                    onChange={handleProfilePhotoChange}
                  />
                  <p>Upload a new photo anytime to keep your profile updated.</p>
                </div>
              </div>
              <div className="profile-static-row">
                <div>
                  <span>Employee ID</span>
                  <strong>{currentProfile?.employeeId || user?.employeeId}</strong>
                </div>
                <div>
                  <span>Branch</span>
                  <strong>{profileForm.branch || "-"}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{currentProfile?.status || "Active"}</strong>
                </div>
              </div>
              <button className="btn btn-login" type="submit" disabled={profileLoading}>
                {profileLoading ? "Saving Details..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="employee-tab">
          <h3>Account Security</h3>
          <div className="security-panel">
            <h4>Change Password</h4>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              Use your current password first, then choose a new password that only you know.
            </p>
            {passwordMessage && (
              <div className={`password-message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-grid">
                <div>
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
              </div>
              <button className="btn btn-login" type="submit" disabled={passwordLoading}>
                {passwordLoading ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "#6b7280",
                lineHeight: "1",
                padding: "0"
              }}
              aria-label="Close"
            >
              &times;
            </button>
            <h3>Change Your Password</h3>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              {requiresPasswordChange
                ? "Admin has created a temporary password for you. Please change it before continuing."
                : "For your account security, update your password here."}
            </p>
            {passwordMessage && (
              <div className={`password-message ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-grid">
                <div>
                  <label htmlFor="modalCurrentPassword">Current Password</label>
                  <input
                    type="password"
                    id="modalCurrentPassword"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modalNewPassword">New Password</label>
                  <input
                    type="password"
                    id="modalNewPassword"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="modalConfirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="modalConfirmPassword"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFormChange}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                {!requiresPasswordChange && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                )}
                <button className="btn btn-login" type="submit" disabled={passwordLoading}>
                  {passwordLoading ? "Updating Password..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
