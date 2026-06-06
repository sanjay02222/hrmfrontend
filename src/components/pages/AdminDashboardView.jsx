import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "../../styles/EmployeeDashboard.css";
import "../../styles/AdminDashboard.css";
import { apiService } from "../../services/apiService";
import { authService } from "../../services/authService";
import Loader from "../Loader";
import { PrintIcon, ExportIcon, NoticeIcon } from "../../assets/Icons";
import HolidaySettings from "../settings/HolidaySettings";
import NoticeSettings from "../settings/NoticeSettings";

const BRANCHES = ["Butwal", "Kathmandu", "Pokhara", "Nepalgunj"];

const normalizeBranch = (value) => String(value || "").trim().toLowerCase();

const validBranch = (value, fallback = "Kathmandu") =>
  BRANCHES.find((branch) => normalizeBranch(branch) === normalizeBranch(value)) || fallback;

const formatTime = (value) => {
  if (!value) return "-";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(value);
  const suffix = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

function AdminProfileEditor({ adminProfile, adminBranch, adminId, onProfileUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [form, setForm] = useState({
    name: adminProfile.name,
    role: adminProfile.role,
    branch: adminBranch,
    photo: adminProfile.photo,
    photoFile: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef();

  const handleEdit = () => {
    setEditMode(true);
    setMessage(null);
  };

  const handleCancel = () => {
    setEditMode(false);
    setForm({
      name: adminProfile.name,
      role: adminProfile.role,
      branch: adminBranch,
      photo: adminProfile.photo,
      photoFile: null,
    });
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasswordCancel = () => {
    setPasswordMode(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMessage(null);
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (!adminId) throw new Error("Admin ID is missing.");
      await authService.changeAdminPassword({ id: adminId }, passwordForm.currentPassword, passwordForm.newPassword);
      setMessage({ type: "success", text: "Password updated successfully." });
      setPasswordMode(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err?.message || "Failed to change password." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Only image files are allowed." });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({ ...prev, photo: previewUrl, photoFile: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.role.trim()) {
      setMessage({ type: "error", text: "Name and post are required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (!adminId) {
        setMessage({ type: "error", text: "Admin ID missing. Please refresh and try again." });
        return;
      }

      await authService.updateManagedAdmin(adminId, {
        name: form.name.trim(),
        role: form.role.trim(),
      });

      let finalPhoto = form.photo;
      if (form.photoFile) {
        const result = await apiService.auth.updateAdminPhoto(
          adminId,
          form.photoFile,
        );
        if (result?.photoUrl) {
          finalPhoto = result.photoUrl;
        }
      }

      setForm((prev) => ({
        ...prev,
        photo: finalPhoto,
        photoFile: null,
      }));

      setMessage({ type: "success", text: "Profile updated successfully." });
      setEditMode(false);

      if (onProfileUpdate)
        onProfileUpdate({
          name: form.name.trim(),
          role: form.role.trim(),
          branch: adminBranch,
          photo: finalPhoto || "",
        });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to update profile. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {!editMode && !passwordMode ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
            <div>
              {form.photo ? (
                <img
                  src={apiService.getImageUrl(form.photo)}
                  alt={form.name}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    objectFit: "cover",
                    boxShadow: "0 2px 8px #0001",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 32,
                    color: "#888",
                  }}
                >
                  {form.name
                    ?.split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{form.name}</div>
              <div style={{ color: "#374151", margin: "4px 0" }}>{form.role}</div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                Branch: <b>{form.branch}</b>
              </div>
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                Role: <b>Admin</b>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-login" onClick={handleEdit} style={{ minWidth: 120 }}>
              Edit Details
            </button>
            <button className="btn btn-secondary" onClick={() => { setPasswordMode(true); setMessage(null); }} style={{ minWidth: 120 }}>
              Change Password
            </button>
          </div>

          {message && (
            <div className={`password-message ${message.type}`} style={{ marginTop: 16 }}>
              {message.text}
            </div>
          )}
        </>
      ) : passwordMode ? (
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h4 style={{ margin: 0 }}>Change Password</h4>
          
          <label style={{ fontWeight: 500 }}>
            Current Password
            <input
              type="password"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              required
              disabled={loading}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
            />
          </label>

          <label style={{ fontWeight: 500 }}>
            New Password
            <input
              type="password"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              required
              disabled={loading}
              placeholder="Min 6 characters"
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
            />
          </label>

          <label style={{ fontWeight: 500 }}>
            Confirm New Password
            <input
              type="password"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              required
              disabled={loading}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 4 }}
            />
          </label>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button className="btn btn-login" type="submit" disabled={loading} style={{ minWidth: 120 }}>
              {loading ? "Saving..." : "Update Password"}
            </button>

            <button className="btn btn-secondary" type="button" onClick={handlePasswordCancel} disabled={loading} style={{ minWidth: 120 }}>
              Cancel
            </button>
          </div>

          {message && (
            <div className={`password-message ${message.type}`} style={{ marginTop: 8 }}>
              {message.text}
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div>
              {form.photo ? (
                <img
                  src={apiService.getImageUrl(form.photo)}
                  alt={form.name}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    objectFit: "cover",
                    boxShadow: "0 2px 8px #0001",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 32,
                    color: "#888",
                  }}
                >
                  {form.name
                    ?.split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ marginTop: 8 }}
                onChange={handlePhotoChange}
                disabled={loading}
              />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontWeight: 500 }}>
                Full Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                  }}
                />
              </label>

              <label style={{ fontWeight: 500 }}>
                Post / Position
                <input
                  type="text"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                  }}
                />
              </label>

              <label style={{ fontWeight: 500, color: "#6b7280" }}>
                Branch
                <input
                  type="text"
                  name="branch"
                  value={form.branch}
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                    background: "#f3f4f6",
                  }}
                />
              </label>

              <label style={{ fontWeight: 500, color: "#6b7280" }}>
                Role
                <input
                  type="text"
                  name="roleDisplay"
                  value="Admin"
                  readOnly
                  disabled
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    marginTop: 4,
                    background: "#f3f4f6",
                  }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button
              className="btn btn-login"
              type="submit"
              disabled={loading}
              style={{ minWidth: 120 }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{ minWidth: 120 }}
            >
              Cancel
            </button>
          </div>

          {message && (
            <div className={`password-message ${message.type}`} style={{ marginTop: 8 }}>
              {message.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export default function AdminDashboardView({ onLogout, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const adminBranch = validBranch(user?.branch, "Kathmandu");

  // Sync activeTab with URL
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "employees", "leave", "security", "profile", "holidays", "notices"];
    return validTabs.includes(path) ? path : "homepage";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState("all");

  useEffect(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "employees", "leave", "security", "profile", "holidays", "notices"];
    if (validTabs.includes(path) && path !== activeTab) {
      setActiveTab(path);
    } else if (location.pathname === "/admin" || location.pathname === "/admin/") {
      navigate("/admin/homepage", { replace: true });
    }
  }, [location.pathname, activeTab, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    navigate(`/admin/${tab}`);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [holidaysList, setHolidaysList] = useState([]);
  const [formData, setFormData] = useState({
    employeeId: "",
    name: "",
    role: "",
    branch: adminBranch,
    email: "",
    phone: "",
    password: "",
  });

  // Re-initialize formData.branch if adminBranch changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, branch: adminBranch }));
  }, [adminBranch]);

  const nplToday = (() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { 
        timeZone: 'Asia/Kathmandu',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const getDayStatus = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;

      const isHoliday = holidaysList?.some(h => {
        const start = String(h.startDate || "").slice(0, 10);
        const end = String(h.endDate || "").slice(0, 10);
        return dateStr >= start && dateStr <= end;
      });
      if (isHoliday) return "Holiday";

      const dayName = d.toLocaleDateString("en-US", { timeZone: "Asia/Kathmandu", weekday: "long" });
      const isWeekOff = globalSettings?.weekOffs?.includes?.(dayName);
      if (isWeekOff) return "Week Off";
    } catch {
      return null;
    }
    return null;
  };

  // Re-evaluates when holidays/settings finish loading
  const todayStatus = useMemo(() => getDayStatus(nplToday), [nplToday, holidaysList, globalSettings]);

  const [detailsListStartDate, setDetailsListStartDate] = useState(nplToday);
  const [detailsListEndDate, setDetailsListEndDate] = useState(nplToday);

  // Convert any ISO/UTC timestamp or plain date string to Nepal YYYY-MM-DD
  const toNplDate = useCallback((value) => {
    if (!value) return null;
    try {
      const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(d);
    } catch {
      return null;
    }
  }, []);
 
  const getDatesInRange = useCallback((start, end) => {
    if (!start || !end) return [];
    const dates = [];
    try {
      let curr = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      while (curr <= last) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        curr.setDate(curr.getDate() + 1);
      }
    } catch (e) {
      console.error("Error generating date range:", e);
    }
    return dates;
  }, []);


  // Attendance Date Filters
  const [reportStartDate, setReportStartDate] = useState(nplToday);
  const [reportEndDate, setReportEndDate] = useState(nplToday);
  const [attendanceReport, setAttendanceReport] = useState({ attendances: [], absentEmployees: [], stats: {} });
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [allowedBranchIp, setAllowedBranchIp] = useState("");
  const [savedAllowedBranchIp, setSavedAllowedBranchIp] = useState("");
  const [networkLoading, setNetworkLoading] = useState(false);

  // Modal states for Editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    employeeId: "",
    department: "",
    email: "",
    phone: "",
    status: "Active",
  });
  const [newPassword, setNewPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Leave Modal State
  const [leaveModal, setLeaveModal] = useState({
    isOpen: false,
    type: null, // 'approve' or 'reject'
    requestId: null,
    remarks: "",
  });

  const handleOpenLeaveModal = (id, type) => {
    setLeaveModal({
      isOpen: true,
      type,
      requestId: id,
      remarks: type === "approve" ? "Approved by branch admin" : "Rejected by branch admin",
    });
  };

  const handleLeaveActionSubmit = async (e) => {
    e.preventDefault();
    const { requestId, type, remarks } = leaveModal;
    if (!requestId) return;

    setEditLoading(true);
    try {
      if (type === "approve") {
        await apiService.leaveRequests.approve(requestId, {
          approvedBy: user?.name || "Branch Admin",
          approvalRemarks: remarks,
        });
        toast.success("Leave request approved.");
      } else {
        await apiService.leaveRequests.reject(requestId, {
          rejectionRemarks: remarks,
          approvedBy: user?.name || "Branch Admin",
        });
        toast.success("Leave request rejected.");
      }
      setLeaveModal({ isOpen: false, type: null, requestId: null, remarks: "" });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || `Failed to ${type} leave.`);
    } finally {
      setEditLoading(false);
    }
  };

  const isValidIPv4 = (value) => {
    const input = String(value || "").trim();
    const regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
    return regex.test(input);
  };

  const loadBranchNetworkRestriction = async () => {
    try {
      setNetworkLoading(true);
      const data = await apiService.branchNetwork.getByBranch(adminBranch);
      const resolvedIp =
        data?.allowedIpAddress ||
        data?.allowedIP ||
        data?.officeNetwork ||
        (Array.isArray(data?.allowedIPs) && data.allowedIPs.length ? data.allowedIPs[0] : "") ||
        "";
      setSavedAllowedBranchIp(String(resolvedIp || "").trim());
      setAllowedBranchIp(String(resolvedIp || "").trim());
    } catch (networkError) {
      console.error(networkError);
      toast.error("Failed to load branch network restriction.");
    } finally {
      setNetworkLoading(false);
    }
  };

  const fetchAttendanceReport = async () => {
    setIsReportLoading(true);
    try {
      const data = await apiService.attendance.getReport({
        dateFilter: "custom",
        startDate: reportStartDate,
        endDate: reportEndDate,
        branch: adminBranch,
      });
      
      setAttendanceReport({
        attendances: data.attendances || [],
        absentEmployees: data.absentEmployees || [],
        stats: data.stats || {}
      });
    } catch (err) {
      console.error("Failed to fetch attendance report:", err);
      toast.error("Failed to load attendance report.");
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance" || activeTab === "homepage") {
      fetchAttendanceReport();
    }
  }, [activeTab, reportStartDate, reportEndDate, adminBranch]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [employeeRes, attendanceRes, leaveRes, settingsRes, holidaysRes] = await Promise.allSettled([
        apiService.employees.getAll(),
        apiService.attendance.getAll(),
        apiService.leaveRequests.getAll(),
        apiService.globalSettings.get(),
        apiService.holidays.getAll(),
      ]);

      setGlobalSettings(settingsRes.status === "fulfilled" ? settingsRes.value : null);
      setHolidaysList(holidaysRes.status === "fulfilled" ? holidaysRes.value || [] : []);

      setEmployees(
        (employeeRes.status === "fulfilled" ? employeeRes.value : []).filter(
          (item) => {
            const branch = validBranch(item?.branch, null);
            return branch === adminBranch || (!item?.branch && adminBranch === "Kathmandu");
          },
        ),
      );

      setAttendance(
        (attendanceRes.status === "fulfilled" ? attendanceRes.value : []).filter(
          (item) => validBranch(item?.employee?.branch || item?.branch, "") === adminBranch,
        ),
      );

      setLeaveRequests(
        (leaveRes.status === "fulfilled" ? leaveRes.value : []).filter(
          (item) => validBranch(item?.employee?.branch || item?.branch, "") === adminBranch,
        ),
      );
    } catch (loadError) {
      setError("Failed to load branch dashboard data.");
      console.error(loadError);
    } finally {
      setLoading(false);
    }
  };

  const tableRef = useRef(null);

  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const downloadCsv = (filename, rows, headers) => {
    const escapeCell = (cell) => {
      const str = cell === null || cell === undefined ? "" : String(cell);
      const needsQuotes = /[",\n]/.test(str);
      const safe = str.replaceAll('"', '""');
      return needsQuotes ? `"${safe}"` : safe;
    };

    const headerLine = headers.map(escapeCell).join(",");
    const bodyLines = rows.map((r) =>
      headers.map((h) => escapeCell(r?.[h])).join(","),
    );
    const csv = [headerLine, ...bodyLines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportAttendanceToCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = attendance.map((row) => ({
      employee: row?.employee?.name || row?.name || "-",
      branch: adminBranch,
      status: row?.status || "-",
      checkIn: row?.checkInTime || "",
      checkOut: row?.checkOutTime || "",
    }));

    downloadCsv(
      `attendance_${adminBranch}_${today}.csv`,
      rows,
      ["employee", "branch", "status", "checkIn", "checkOut"],
    );
  };

  const exportEmployeesToCsv = () => {
    const rows = employees.map((emp) => ({
      name: emp?.name || "-",
      employeeId: emp?.employeeId || "-",
      role: emp?.department || emp?.role || "-",
      branch: adminBranch,
      status: emp?.status || "Active",
    }));

    downloadCsv(
      `registered_employees_${adminBranch}_${today}.csv`,
      rows,
      ["name", "employeeId", "role", "email", "phone", "status"],
    );
  };

  const exportDetailedListToCsv = () => {
    const isRange = detailsListStartDate !== detailsListEndDate;
    const dateLabel = isRange ? `${detailsListStartDate}_to_${detailsListEndDate}` : detailsListStartDate;

    const rows = detailedListRecords.map((record) => {
      const { emp, date, status, att } = record;
      return {
        name: emp?.name || "-",
        employeeId: emp?.employeeId || "-",
        role: emp?.department || emp?.role || "-",
        addedDate: toNplDate(emp?.createdAt) || "-",
        branch: validBranch(emp?.branch),
        date: date,
        status: selectedMetric === "all" ? (emp?.status || "Active") : status,
        checkIn: att?.checkInTime ? formatTime(att.checkInTime) : "-",
      };
    });

    downloadCsv(
      `detailed_list_${selectedMetric}_${dateLabel}.csv`,
      rows,
      ["name", "employeeId", "role", "addedDate", "branch", "date", "status", "checkIn"],
    );
  };

  const handlePrintDetailedList = () => {
    window.print();
  };

  useEffect(() => {
    loadData();
    loadBranchNetworkRestriction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminBranch]);

  const handleEditClick = (emp) => {
    setEditingEmployee(emp);
    setEditFormData({
      name: emp.name || "",
      employeeId: emp.employeeId || "",
      department: emp.department || emp.role || "",
      email: emp.email || "",
      phone: emp.phone || "",
      status: emp.status || "Active",
    });
    setIsEditModalOpen(true);
  };

  const handlePasswordResetClick = (emp) => {
    setEditingEmployee(emp);
    setNewPassword("");
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmployee || !newPassword.trim()) return;

    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setEditLoading(true);
    try {
      await authService.setEmployeeCredentials(
        { id: editingEmployee.id, employeeId: editingEmployee.employeeId },
        newPassword.trim(),
        { mustChangePassword: true },
      );
      toast.success(`Password updated for ${editingEmployee.name}.`);
      setIsPasswordModalOpen(false);
      setEditingEmployee(null);
      setNewPassword("");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update password.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditLoading(true);
    try {
      await apiService.employees.update(editingEmployee.id, {
        name: editFormData.name.trim(),
        employeeId: editFormData.employeeId.trim(),
        department: editFormData.department.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        status: editFormData.status,
      });
      toast.success("Employee updated successfully.");
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update employee.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee ${name}?`)) return;

    try {
      setLoading(true);
      await apiService.employees.delete(id);
      toast.success("Employee deleted successfully.");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to delete employee.");
    } finally {
      setLoading(false);
    }
  };

  const renderEditModal = () => {
    if (isEditModalOpen) {
      return (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-content superadmin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600 }}
          >
            <div className="modal-header">
              <h3>Update Employee Profile</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    value={editFormData.employeeId}
                    onChange={(e) => setEditFormData((p) => ({ ...p, employeeId: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role / Post</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData((p) => ({ ...p, department: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-login" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Update Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (isPasswordModalOpen) {
      return (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div
            className="modal-content superadmin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <div className="modal-header">
              <h3>Reset Employee Password</h3>
              <button className="close-btn" onClick={() => setIsPasswordModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="modal-form">
              <div className="form-group full-width" style={{ marginBottom: "1.5rem" }}>
                <label>New Temporary Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-login" disabled={editLoading}>
                  {editLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    if (leaveModal.isOpen) {
      const isApprove = leaveModal.type === "approve";
      return (
        <div className="modal-overlay" onClick={() => setLeaveModal({ ...leaveModal, isOpen: false })}>
          <div
            className="modal-content superadmin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <div className="modal-header">
              <h3>{isApprove ? "Approve Leave Request" : "Reject Leave Request"}</h3>
              <button
                className="close-btn"
                onClick={() => setLeaveModal({ ...leaveModal, isOpen: false })}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleLeaveActionSubmit} className="modal-form">
              <div className="form-group full-width" style={{ marginBottom: "1.5rem" }}>
                <label>{isApprove ? "Approval Remarks" : "Rejection Remarks"}</label>
                <textarea
                  value={leaveModal.remarks}
                  onChange={(e) => setLeaveModal({ ...leaveModal, remarks: e.target.value })}
                  placeholder={`Enter ${leaveModal.type}al remarks...`}
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    minHeight: "100px",
                    fontSize: "0.95rem",
                  }}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLeaveModal({ ...leaveModal, isOpen: false })}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${isApprove ? "btn-login" : "action-btn delete"}`}
                  disabled={editLoading}
                  style={!isApprove ? { minWidth: "120px", height: "42px" } : {}}
                >
                  {editLoading ? "Processing..." : isApprove ? "Approve Leave" : "Reject Leave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleSaveOrUpdateBranchIp = async () => {
    const ip = String(allowedBranchIp || "").trim();
    if (!ip) {
      toast.error("Allowed Branch IP Address is required.");
      return;
    }
    if (!isValidIPv4(ip)) {
      toast.error("Please enter a valid IPv4 address.");
      return;
    }

    try {
      setNetworkLoading(true);
      await apiService.branchNetwork.upsert({
        branch: adminBranch,
        allowedIpAddress: ip,
      });
      setSavedAllowedBranchIp(ip);
      setAllowedBranchIp(ip);
      toast.success(savedAllowedBranchIp ? "Allowed branch IP updated." : "Allowed branch IP saved.");
    } catch (networkError) {
      console.error(networkError);
      toast.error(networkError?.message || "Failed to save allowed branch IP.");
    } finally {
      setNetworkLoading(false);
    }
  };

  const handleRemoveRestriction = async () => {
    try {
      setNetworkLoading(true);
      await apiService.branchNetwork.deleteByBranch(adminBranch);
      setSavedAllowedBranchIp("");
      setAllowedBranchIp("");
      toast.success("Branch network restriction removed.");
    } catch (networkError) {
      console.error(networkError);
      toast.error(networkError?.message || "Failed to remove branch restriction.");
    } finally {
      setNetworkLoading(false);
    }
  };

  const today = nplToday;

  // Selected date derivations for the homepage Detailed List (supporting range)
  const selectedDateAttendance = useMemo(() => {
    return attendance.filter((item) => {
       const rowDate = toNplDate(item?.date);
       return rowDate >= detailsListStartDate && rowDate <= detailsListEndDate;
    });
  }, [attendance, detailsListStartDate, detailsListEndDate, toNplDate]);

  const branchSelectedDateAttendance = useMemo(() => {
    return selectedDateAttendance.filter(row => validBranch(row?.employee?.branch || row?.branch, adminBranch) === adminBranch);
  }, [selectedDateAttendance, adminBranch]);

  const branchEmployees = useMemo(() => {
    return employees.filter(emp => validBranch(emp.branch, adminBranch) === adminBranch);
  }, [employees, adminBranch]);

  const selectedDateOnLeave = useMemo(() => {
    return branchEmployees.filter((emp) => {
      return leaveRequests.some(leave => 
        leave.status === "Approved" && 
        (leave.employee?.id === emp.id || leave.employeeId === emp.id) &&
        // If they were on leave for ANY day in the range
        !(toNplDate(leave.endDate) < detailsListStartDate || toNplDate(leave.startDate) > detailsListEndDate)
      );
    });
  }, [branchEmployees, leaveRequests, detailsListStartDate, detailsListEndDate, toNplDate]);

  const selectedDateAbsent = useMemo(() => {
    return branchEmployees.filter((emp) => {
      const isPresent = branchSelectedDateAttendance.some(
        (row) => (row?.employee?.id || row?.employeeId) === emp?.id,
      );
      const isOnLeave = selectedDateOnLeave.some(onLeaveEmp => onLeaveEmp.id === emp.id);
      return !isPresent && !isOnLeave;
    });
  }, [branchEmployees, branchSelectedDateAttendance, selectedDateOnLeave]);

  const totalEmployees = branchEmployees.length;

  const presentEmployees = useMemo(() => {
    return branchSelectedDateAttendance.filter((item) => item?.status === "Present");
  }, [branchSelectedDateAttendance]);

  const lateEmployees = useMemo(() => {
    return presentEmployees.filter(
      (item) => String(item?.checkInTime || "") > "10:14",
    );
  }, [presentEmployees]);

  const earlyDepartureEmployees = useMemo(() => {
    return presentEmployees.filter(
      (item) => item?.checkOutTime && String(item?.checkOutTime) < "16:45",
    );
  }, [presentEmployees]);

  const isRangeHolidayOrWeekOff = !!getDayStatus(detailsListStartDate);

  const onLeaveEmployeesSelectedRange = useMemo(() => {
    return branchEmployees.filter((emp) => {
      return leaveRequests.some(leave => 
        leave.status === "Approved" && 
        (leave.employee?.id === emp.id || leave.employeeId === emp.id) &&
        !(toNplDate(leave.endDate) < detailsListStartDate || toNplDate(leave.startDate) > detailsListEndDate)
      );
    });
  }, [branchEmployees, leaveRequests, detailsListStartDate, detailsListEndDate, toNplDate]);

  const absentEmployeesSelectedRange = useMemo(() => {
    return branchEmployees.filter((emp) => {
      const isPresent = branchSelectedDateAttendance.some(
        (row) => (row?.employee?.id || row?.employeeId) === emp?.id,
      );
      const isOnLeave = onLeaveEmployeesSelectedRange.some(onLeaveEmp => onLeaveEmp.id === emp.id);
      return !isPresent && !isOnLeave;
    });
  }, [branchEmployees, branchSelectedDateAttendance, onLeaveEmployeesSelectedRange]);

  const detailedListRecords = useMemo(() => {
    const dateRange = getDatesInRange(detailsListStartDate, detailsListEndDate);
    const records = [];

    branchEmployees.forEach(emp => {
      const addedDate = toNplDate(emp.createdAt) || "1970-01-01";
      dateRange.forEach(date => {
        if (date < addedDate) return;
        const att = attendance.find(a => (a?.employee?.id || a?.employeeId) === emp.id && toNplDate(a?.date) === date);
        const dayStat = getDayStatus(date);
        const isLeave = leaveRequests.some(l => 
          l.status === 'Approved' && 
          (l.employee?.id === emp.id || l.employeeId === emp.id) &&
          date >= toNplDate(l.startDate) && date <= toNplDate(l.endDate)
        );

        let status = "Absent";
        if (att) {
          status = String(att.checkInTime || "") > "10:15" ? "Late" : "Present";
        } else if (isLeave) {
          status = "Leave";
        } else if (dayStat) {
          status = dayStat;
        }

        const matchesMetric = () => {
          if (selectedMetric === 'all') return true;
          if (selectedMetric === 'present') return status === 'Present' || status === 'Late';
          if (selectedMetric === 'late') return status === 'Late';
          if (selectedMetric === 'absent') return status === 'Absent';
          if (selectedMetric === 'leave') return status === 'Leave';
          if (selectedMetric === 'early_dept') return att?.checkOutTime && String(att.checkOutTime) < "16:45";
          return false;
        };

        if (matchesMetric()) {
          records.push({ emp, date, status, att });
        }
      });
    });
    return records.sort((a, b) => b.date.localeCompare(a.date) || a.emp.name.localeCompare(b.emp.name));
  }, [
    branchEmployees,
    detailsListStartDate,
    detailsListEndDate,
    attendance,
    getDayStatus,
    leaveRequests,
    selectedMetric,
    toNplDate,
    getDatesInRange
  ]);

  const attendanceReportRecords = useMemo(() => {
    const rangeDates = getDatesInRange(reportStartDate, reportEndDate);
    const records = [];

    // Admin dashboard is always filtered by adminBranch
    employees.forEach(emp => {
      const addedDate = toNplDate(emp.createdAt) || "1970-01-01";
      rangeDates.forEach(date => {
        if (date < addedDate) return;
        const att = attendance.find(a => (a?.employee?.id || a?.employeeId) === emp.id && toNplDate(a?.date) === date);
        const dayStat = getDayStatus(date);
        const isLeave = leaveRequests.some(l => 
          l.status === 'Approved' && 
          (l.employee?.id === emp.id || l.employeeId === emp.id) &&
          date >= toNplDate(l.startDate) && date <= toNplDate(l.endDate)
        );

        let status = "Absent";
        if (att) {
          status = String(att.checkInTime || "") > "10:15" ? "Late" : "Present";
        } else if (isLeave) {
          status = "Leave";
        } else if (dayStat) {
          status = dayStat;
        }

        records.push({ emp, date, status, att });
      });
    });
    return records.sort((a, b) => b.date.localeCompare(a.date) || a.emp.name.localeCompare(b.emp.name));
  }, [
    employees,
    attendance,
    leaveRequests,
    reportStartDate,
    reportEndDate,
    getDayStatus,
    toNplDate,
    getDatesInRange
  ]);

  const [adminProfile, setAdminProfile] = useState({
    name: user?.name || "Branch Admin",
    role: user?.roleTitle || "Branch Admin",
    branch: adminBranch,
    photo: user?.photo || "",
  });

  useEffect(() => {
    setAdminProfile({
      name: user?.name || "Branch Admin",
      role: user?.roleTitle || "Branch Admin",
      branch: adminBranch,
      photo: user?.photo || "",
    });
  }, [user, adminBranch]);

  const employeeRows = useMemo(
    () =>
      employees.map((emp) => ({
        id: emp.id,
        name: emp.name || "-",
        employeeId: emp.employeeId || "-",
        role: emp.department || emp.role || "-",
        branch: validBranch(emp.branch, adminBranch),
      })),
    [employees, adminBranch],
  );

  const handleEmployeeCreate = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.employeeId.trim() || !formData.role.trim()) {
      toast.error("Name, Employee ID and role/post are required.");
      return;
    }

    if (!formData.password.trim()) {
      toast.error("Temporary password is required.");
      return;
    }

    const emailValue = formData.email.trim();
    if (emailValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        toast.error("Please enter a valid email address.");
        return;
      }
    }

    const branch = adminBranch;
    try {
      const createPayload = {
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
        department: formData.role.trim(),
        branch,
        ...(emailValue ? { email: emailValue } : {}),
        phone: formData.phone.trim(),
        status: "Active",
      };
      const created = await apiService.employees.create(createPayload);

      const createdEmployee = created?.employee || created || {};
      let createdEmployeeId =
        createdEmployee?.id ||
        createdEmployee?._id ||
        created?.data?.id ||
        created?.data?._id ||
        created?.employee?.id ||
        created?.employee?._id;

      if (!createdEmployeeId) {
        try {
          const refreshedEmployees = await apiService.employees.getAll();
          const matched = Array.isArray(refreshedEmployees)
            ? refreshedEmployees.find(
                (emp) =>
                  String(emp?.employeeId || "").trim().toLowerCase() ===
                    String(createPayload.employeeId).trim().toLowerCase() &&
                  validBranch(emp?.branch, "") === branch,
              )
            : null;
          createdEmployeeId = matched?.id || matched?._id;
        } catch (lookupError) {
          console.error("Could not resolve created employee from list:", lookupError);
        }
      }

      if (!createdEmployeeId) {
        throw new Error(
          "Employee record created but could not resolve employee id for credential setup.",
        );
      }

      let credentialsReady = false;
      try {
        await authService.setEmployeeCredentials(
          { id: createdEmployeeId, employeeId: createPayload.employeeId },
          formData.password.trim(),
          { mustChangePassword: true },
        );
        credentialsReady = true;
      } catch (credentialError) {
        console.error("Credential setup failed after employee creation:", credentialError);
      }

      if (credentialsReady) {
        toast.success("Employee created with login credentials.");
      } else {
        toast.warning("Employee created, but login credential setup could not be completed.");
      }

      setFormData({
        employeeId: "",
        name: "",
        role: "",
        branch: adminBranch,
        email: "",
        phone: "",
        password: "",
      });

      loadData();
    } catch (createError) {
      console.error(createError);
      toast.error(createError?.message || "Failed to create employee.");
    }
  };

  if (loading) {
    return (
      <div className="card">
        <Loader size="large" message="Loading branch dashboard..." />
      </div>
    );
  }

  return (
    <div className="card">
      {renderEditModal()}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className="employee-header">
        <div className="employee-header-left">
          <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="employee-header-copy">
            <h2 style={{ fontSize: "24px", margin: 0 }}>Admin Dashboard</h2>
            <div className="employee-header-meta" style={{ fontSize: "13px", gap: "10px" }}>
              <span>Welcome back, {adminProfile.name}</span>
              <span className="employee-header-id">Branch: {adminBranch}</span>
            </div>
          </div>
        </div>
        <div className="employee-header-actions">
          <div className="employee-status-chip">Branch Admin</div>
          <button className="dashboard-btn dashboard-btn-logout" onClick={onLogout} style={{ padding: "6px 14px", fontSize: "13px" }}>
            Logout
          </button>
        </div>
      </div>

      <div className={`employee-tabs ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">✕</button>
        <button className={`tab-btn ${activeTab === "homepage" ? "active" : ""}`} onClick={() => handleTabChange("homepage")}>Homepage</button>
        <button className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`} onClick={() => handleTabChange("attendance")}>Attendance</button>
        <button className={`tab-btn ${activeTab === "employees" ? "active" : ""}`} onClick={() => handleTabChange("employees")}>Employees</button>
        <button className={`tab-btn ${activeTab === "leave" ? "active" : ""}`} onClick={() => handleTabChange("leave")}>Leave Request</button>
        <button className={`tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => handleTabChange("security")}>Security</button>
        <button className={`tab-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => handleTabChange("profile")}>My Details</button>
        <button className={`tab-btn ${activeTab === "holidays" ? "active" : ""}`} onClick={() => handleTabChange("holidays")}>Holidays & Week-offs</button>
        <button className={`tab-btn ${activeTab === "notices" ? "active" : ""}`} onClick={() => handleTabChange("notices")}>Notices</button>
      </div>

      {error && <div className="password-message error">{error}</div>}

      {activeTab === "homepage" && (
        <div className="employee-tab">
          <div className="homepage-hero">
            <div className="welcome-banner welcome-banner-split">
              <div className="welcome-copy">
                <div className="welcome-heading-block">
                  <h3>Welcome, {adminProfile.name}</h3>
                </div>
                <div className="welcome-support-row">
                  <span>Branch Admin</span>
                  <span>{adminBranch}</span>
                </div>
              </div>

              <div className="employee-portrait-card">
                {adminProfile.photo ? (
                  <img
                    src={apiService.getImageUrl(adminProfile.photo)}
                    alt={adminProfile.name}
                    className="employee-portrait-image"
                  />
                ) : (
                  <div className="employee-photo-fallback employee-portrait-image">
                    {(adminProfile.name || "A")
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div className="employee-portrait-overlay">
                  <span className="employee-portrait-label">Admin Profile</span>
                  <h4>{adminProfile.name}</h4>
                  <p>
                    {adminProfile.role} - {adminBranch}
                  </p>
                </div>
              </div>

              <div className="check-in-section homepage-attendance-section">
                <div className="attendance-card-header">
                  <div>
                    <h4>Today's Branch Attendance Report</h4>
                  </div>
                </div>

                {todayStatus && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 20px",
                    marginBottom: "12px",
                    borderRadius: "10px",
                    background: todayStatus === "Holiday"
                      ? "linear-gradient(135deg, #fef9c3, #fef3c7)"
                      : "linear-gradient(135deg, #e0f2fe, #dbeafe)",
                    border: todayStatus === "Holiday" ? "1.5px solid #fde68a" : "1.5px solid #93c5fd",
                    color: todayStatus === "Holiday" ? "#92400e" : "#1e40af",
                    fontWeight: "600",
                    fontSize: "14px",
                  }}>
                    <span style={{ fontSize: "22px" }}>{getDayStatus(detailsListStartDate) === "Holiday" ? "🎉" : "📅"}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{detailsListStartDate === detailsListEndDate ? "Today" : detailsListStartDate} is a {getDayStatus(detailsListStartDate)}</div>
                      <div style={{ fontSize: "12px", fontWeight: 400, marginTop: "2px", opacity: 0.85 }}>
                        {getDayStatus(detailsListStartDate) === "Holiday"
                          ? "Attendance was not being tracked as it is a public holiday."
                          : "Attendance was not being tracked as it is a scheduled week off."}
                      </div>
                    </div>
                  </div>
                )}

                <div className="dashboard-summary-grid">
                  <article className="dashboard-summary-card neutral" style={{flex:1, cursor: "pointer"}} onClick={() => setSelectedMetric("all")}>
                    <span>Total Employees</span>
                    <strong>{totalEmployees}</strong>
                  </article>
                  <article className="dashboard-summary-card positive" style={{flex:1, cursor: "pointer"}} onClick={() => setSelectedMetric("present")}>
                    <span>{detailsListStartDate === detailsListEndDate ? "Present Today" : "Present (Period)"}</span>
                    <strong>{detailedListRecords.filter(r => r.status === 'Present' || r.status === 'Late').length}</strong>
                  </article>
                  <article className="dashboard-summary-card warning" style={{flex:1, cursor: "pointer"}} onClick={() => setSelectedMetric("late")}>
                    <span>{detailsListStartDate === detailsListEndDate ? "Late Today" : "Late (Period)"}</span>
                    <strong>{detailedListRecords.filter(r => r.status === 'Late').length}</strong>
                  </article>
                  <article className="dashboard-summary-card danger" style={{flex:1, backgroundColor: "#fff1f2", color: "#e11d48", borderLeft: "4px solid #f43f5e", cursor: "pointer"}} onClick={() => setSelectedMetric("early_dept")}>
                    <span>{detailsListStartDate === detailsListEndDate ? "Early Dept." : "Early (Period)"}</span>
                    <strong>{detailedListRecords.filter(r => r.att?.checkOutTime && String(r.att.checkOutTime) < "16:45").length}</strong>
                  </article>
                  <article className="dashboard-summary-card leave" style={{ flex: 1, backgroundColor: "#fdf4ff", color: "#a21caf", borderLeft: "4px solid #d946ef", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer" }} onClick={() => setSelectedMetric("leave")}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{detailsListStartDate === detailsListEndDate ? "On Leave Today" : "On Leave (Period)"}</span>
                    <strong style={{ fontSize: "1.75rem", fontWeight: "700" }}>{detailedListRecords.filter(r => r.status === 'Leave').length}</strong>
                  </article>
                  <article className="dashboard-summary-card info" style={{flex:1, cursor: "pointer"}} onClick={() => setSelectedMetric("absent")}>
                    <span>{detailsListStartDate === detailsListEndDate ? (getDayStatus(detailsListStartDate) || "Absent Today") : "Absent (Period)"}</span>
                    <strong>{detailedListRecords.filter(r => r.status === 'Absent').length}</strong>
                  </article>
                </div>
              </div>
            </div>
          </div>

          <div className="role-detail-grid">
            <section className="profile-overview-card" style={{ gridColumn: 'span 2' }}>
              <div className="profile-overview-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>
                  <h4 style={{ margin: 0 }}>Detailed List ({selectedMetric === "all" ? "All Employees" : selectedMetric})</h4>
                  <div className="no-print" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="date"
                        value={detailsListStartDate}
                        onChange={(e) => setDetailsListStartDate(e.target.value)}
                        className="form-control"
                        style={{ height: 32, fontSize: "12px", width: 130 }}
                      />
                      <span style={{ fontSize: "11px", color: "#64748b" }}>to</span>
                      <input 
                        type="date"
                        value={detailsListEndDate}
                        onChange={(e) => setDetailsListEndDate(e.target.value)}
                        className="form-control"
                        style={{ height: 32, fontSize: "12px", width: 130 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary icon-btn-round"
                        onClick={handlePrintDetailedList}
                        title="Print Detailed List"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        <PrintIcon />
                        <span>Print</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-login icon-btn-round"
                        onClick={exportDetailedListToCsv}
                        title="Export CSV"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        <ExportIcon />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="print-only-header">
                <h2>Grace International - Detailed Employee List ({adminBranch})</h2>
                <p>Generated on: {new Date().toLocaleString()}</p>
              </div>
              <div className="table-container printable" ref={tableRef}>
                <table>
                  <thead><tr><th>Name</th><th>Employee ID</th><th>Role/Post</th><th>Added Date</th><th>Branch</th><th>Date</th><th>Status</th><th>Check In</th></tr></thead>
                  <tbody>
                    {detailedListRecords.length ? detailedListRecords.map((record, index) => {
                      const { emp, date, status, att } = record;
                      return (
                        <tr key={`${emp.id}-${date}-${index}`}>
                          <td>{emp.name || "-"}</td>
                          <td>{emp.employeeId || "-"}</td>
                          <td>{emp.department || emp.role || "-"}</td>
                          <td>{toNplDate(emp.createdAt) || "-"}</td>
                          <td>{validBranch(emp.branch)}</td>
                          <td>{date}</td>
                          <td>{selectedMetric === "all" ? (emp.status || "Active") : status}</td>
                          <td>{formatTime(att?.checkInTime)}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>No records found for the selected criteria.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="employee-tab">
          <div className="print-only-header">
            <h2>Grace International - Branch Attendance Report ({adminBranch})</h2>
            <p>Generated on: {new Date().toLocaleString()}</p>
          </div>
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0", gap: "15px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: "block" }}>Start Date</label>
                <input 
                  type="date" 
                  value={reportStartDate} 
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: "block" }}>End Date</label>
                <input 
                  type="date" 
                  value={reportEndDate} 
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                />
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                className="btn btn-secondary icon-btn-round" 
                onClick={() => window.print()}
                title="Print Attendance"
                style={{ height: "38px" }}
              >
                <PrintIcon />
                <span>Print</span>
              </button>
              <button 
                className="btn btn-login icon-btn-round" 
                onClick={exportAttendanceToCsv}
                title="Export Attendance"
                style={{ height: "38px" }}
              >
                <ExportIcon />
                <span>Export</span>
              </button>
            </div>
          </div>

          {(() => {
            const selectedDayStatus = reportStartDate === reportEndDate ? getDayStatus(reportStartDate) : null;
            return selectedDayStatus ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 20px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: selectedDayStatus === "Holiday"
                  ? "linear-gradient(135deg, #fef9c3, #fef3c7)"
                  : "linear-gradient(135deg, #e0f2fe, #dbeafe)",
                border: selectedDayStatus === "Holiday" ? "1.5px solid #fde68a" : "1.5px solid #93c5fd",
                color: selectedDayStatus === "Holiday" ? "#92400e" : "#1e40af",
                fontWeight: "600",
                fontSize: "14px",
              }}>
                <span style={{ fontSize: "22px" }}>{selectedDayStatus === "Holiday" ? "🎉" : "📅"}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{reportStartDate} is a {selectedDayStatus}</div>
                  <div style={{ fontSize: "12px", fontWeight: 400, marginTop: "2px", opacity: 0.85 }}>
                    {selectedDayStatus === "Holiday"
                      ? "No attendance was tracked on this date — it is a public holiday."
                      : "No attendance was tracked on this date — it is a scheduled week off."}
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          <div className="dashboard-summary-grid" style={{ marginBottom: "20px" }}>
             <article className="dashboard-summary-card positive" style={{flex:1}}>
                <span>Present Days</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Present' || r.status === 'Late').length}</strong>
             </article>
             <article className="dashboard-summary-card warning" style={{flex:1}}>
                <span>Late Arrivals</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Late').length}</strong>
             </article>
             <article className="dashboard-summary-card danger" style={{flex:1, backgroundColor: "#fff1f2", color: "#e11d48", borderLeft: "4px solid #f43f5e"}}>
                <span>Early Dept.</span>
                <strong>{attendanceReportRecords.filter(r => r.att?.checkOutTime && String(r.att.checkOutTime) < "16:45").length}</strong>
             </article>
             <article className="dashboard-summary-card info" style={{flex:1}}>
                <span>{(reportStartDate === reportEndDate && getDayStatus(reportStartDate)) ? getDayStatus(reportStartDate) : "Absent Records"}</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Absent').length}</strong>
             </article>
             <article className="dashboard-summary-card info" style={{flex:1, backgroundColor: "#f0f9ff", color: "#0369a1", borderLeft: "4px solid #0ea5e9"}}>
                <span>On Leave</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Leave').length}</strong>
             </article>
          </div>

          <div className="table-container printable">
            {isReportLoading ? (
              <div style={{ padding: "40px", textAlign: "center" }}><Loader size="medium" message="Fetching report..." /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Work Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceReportRecords.length ? attendanceReportRecords.map((row, index) => {
                    const { emp, date, status, att } = row;
                    const isPresent = status === 'Present' || status === 'Late';
                    const isLate = status === 'Late';
                    const isEarly = att?.checkOutTime && String(att.checkOutTime) < "16:45";
                    
                    let rowStyle = {};
                    let statusClass = "status-active";
                    let finalStatus = status;

                    if (!isPresent) {
                      if (status === "Leave") {
                        statusClass = "status-on-leave";
                        rowStyle = { backgroundColor: "#e0f2fe" };
                      } else if (status === "Absent") {
                        statusClass = "status-inactive";
                        rowStyle = { backgroundColor: "#fef2f2" };
                      } else {
                        // Holiday or Week Off
                        statusClass = "status-active";
                        rowStyle = { backgroundColor: "#f8fafc" };
                      }
                    }

                    return (
                      <tr key={`${emp.id}-${date}-${index}`} style={rowStyle}>
                        <td>{date}</td>
                        <td>{emp.name}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span className={`status-pill ${statusClass}`}>{finalStatus}</span>
                            {isLate && <span style={{ fontSize: "10px", color: "#d97706", fontWeight: "600" }}>● Late Arrival</span>}
                            {isEarly && <span style={{ fontSize: "10px", color: "#e11d48", fontWeight: "600" }}>● Early Departure</span>}
                          </div>
                        </td>
                        <td>{formatTime(att?.checkInTime)}</td>
                        <td>{formatTime(att?.checkOutTime)}</td>
                        <td>{att?.workHours ? `${Number(att.workHours).toFixed(2)}h` : "-"}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>No attendance records found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "employees" && (
        <div className="employee-tab">
          <h3>Employee Details</h3>
          <div className="inline-panel">
            <h4>Create Employee (Branch Required)</h4>

            <form onSubmit={handleEmployeeCreate} className="inline-grid">
              <div>
                <label>Employee Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label>Employee ID</label>
                <input
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, employeeId: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label>Role/Post</label>
                <input
                  value={formData.role}
                  onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label>Branch (Locked to your branch)</label>
                <input
                  value={adminBranch}
                  readOnly
                  disabled
                  style={{ background: "#f3f4f6", cursor: "not-allowed" }}
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div>
                <label>Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div>
                <label>Temporary Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>

              <div style={{ alignSelf: "end" }}>
                <button className="btn btn-login" type="submit">
                  Create Employee
                </button>
              </div>
            </form>
          </div>

          <div className="profile-overview-card" style={{ marginTop: 24 }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "16px" }}>Registered Employees in {adminBranch}</h4>
              <div style={{ display: "flex", gap: "6px" }}>
                <button 
                  type="button"
                  className="btn btn-secondary icon-btn-round" 
                  onClick={() => window.print()}
                  title="Print Employees"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  <PrintIcon />
                  <span>Print</span>
                </button>
                <button 
                  type="button"
                  className="btn btn-login icon-btn-round" 
                  onClick={exportEmployeesToCsv}
                  title="Export Employees"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  <ExportIcon />
                  <span>Export</span>
                </button>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    <th>Role/Post</th>
                    <th>Contact Info</th>
                    <th style={{ textAlign: "center", width: "100px" }}>Status</th>
                    <th style={{ textAlign: "center", width: "240px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length ? (
                    employees.map((emp) => (
                      <tr key={emp.id}>
                        <td>{emp.name || "-"}</td>
                        <td>{emp.employeeId || "-"}</td>
                        <td>{emp.department || emp.role || "-"}</td>
                        <td>
                          <div style={{ fontSize: "12px" }}>{emp.email || "No email"}</div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>
                            {emp.phone || "No phone"}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`status-pill ${
                              String(emp.status || "Active").toLowerCase() === "active"
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {emp.status || "Active"}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <button
                              className="action-btn edit"
                              onClick={() => handleEditClick(emp)}
                              title="Edit Employee"
                            >
                              Edit
                            </button>
                            <button
                              className="action-btn reset"
                              onClick={() => handlePasswordResetClick(emp)}
                              title="Reset Password"
                            >
                              Reset
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              title="Delete Employee"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", padding: "24px", color: "#64748b" }}
                      >
                        No employees found for this branch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "leave" && (
        <div className="employee-tab">
          <h3>Leave Requests</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.length ? (
                  leaveRequests.map((item) => (
                    <tr key={item.id}>
                      <td>{item.employee?.name || "-"}</td>
                      <td>{item.leaveType || "-"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`status-pill ${
                            String(item.status || "Pending").toLowerCase() === "approved"
                              ? "status-active"
                              : String(item.status).toLowerCase() === "rejected"
                              ? "status-inactive"
                              : ""
                          }`}
                          style={
                            !["approved", "rejected"].includes(
                              String(item.status || "Pending").toLowerCase(),
                            )
                              ? { backgroundColor: "#fffbeb", color: "#d97706", border: "1px solid #fef3c7" }
                              : {}
                          }
                        >
                          {item.status || "Pending"}
                        </span>
                      </td>
                      <td>
                        {item.startDate ? new Date(item.startDate).toLocaleDateString() : "-"}
                      </td>
                      <td>
                        {item.endDate ? new Date(item.endDate).toLocaleDateString() : "-"}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          {String(item.status || "Pending").toLowerCase() === "pending" ? (
                            <>
                              <button
                                className="action-btn edit"
                                onClick={() => handleOpenLeaveModal(item.id, "approve")}
                                title="Approve Leave"
                              >
                                Approve
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleOpenLeaveModal(item.id, "reject")}
                                title="Reject Leave"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                              Processed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No branch leave requests available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="employee-tab">
          <h3>Security</h3>
          <div className="security-panel">
            <div className="security-panel-header">
              <div>
                <h4>Branch Network Access Control</h4>
                <p>
                  Employees of this branch can check in/check out only from the approved
                  branch network IP.
                </p>
              </div>
              <span
                className={`status-badge ${savedAllowedBranchIp ? "status-approved" : "status-pending"}`}
              >
                {savedAllowedBranchIp ? "Protected" : "Not Configured"}
              </span>
            </div>

            <div className="inline-grid" style={{ marginTop: 14 }}>
              <div>
                <label>Branch</label>
                <input value={adminBranch} readOnly disabled />
              </div>
              <div>
                <label>Allowed Branch IP Address</label>
                <input
                  value={allowedBranchIp}
                  onChange={(e) => setAllowedBranchIp(e.target.value)}
                  placeholder="e.g. 103.154.12.10"
                  disabled={networkLoading}
                />
              </div>
              <div style={{ alignSelf: "end", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-login"
                  type="button"
                  onClick={handleSaveOrUpdateBranchIp}
                  disabled={networkLoading}
                >
                  {savedAllowedBranchIp ? "Update IP" : "Save IP"}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleRemoveRestriction}
                  disabled={networkLoading || !savedAllowedBranchIp}
                >
                  Remove Restriction
                </button>
              </div>
            </div>

            <p style={{ marginTop: 12, color: "#64748b" }}>
              Current Saved IP: <strong>{savedAllowedBranchIp || "Not configured"}</strong>
            </p>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="employee-tab">
          <h3>My Details</h3>
          <section
            className="profile-overview-card"
            style={{ maxWidth: 480, margin: "0 auto" }}
          >
            <AdminProfileEditor
              adminProfile={adminProfile}
              adminBranch={adminBranch}
              adminId={user?.id}
              onProfileUpdate={(updated) => {
                if (updated) {
                  setAdminProfile((prev) => ({ ...prev, ...updated }));
                  const currentUser = authService.getCurrentUser();
                  if (currentUser) {
                    authService.setCurrentUser({
                      ...currentUser,
                      name: updated.name || currentUser.name,
                      roleTitle: updated.role || currentUser.roleTitle,
                      photo: updated.photo || currentUser.photo,
                    });
                  }
                }
                loadData();
              }}
            />
          </section>
        </div>
      )}

      {activeTab === "holidays" && (
        <HolidaySettings onSettingsUpdated={loadData} />
      )}

      {activeTab === "notices" && (
        <NoticeSettings user={user} />
      )}
    </div>
  );
}