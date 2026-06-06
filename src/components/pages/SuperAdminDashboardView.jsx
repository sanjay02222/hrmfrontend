import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "../../styles/EmployeeDashboard.css";
import "../../styles/AdminDashboard.css";
import { apiService } from "../../services/apiService";
import { authService } from "../../services/authService";
import Loader from "../Loader";
import Select from "react-select";
import { PrintIcon, ExportIcon, EditIcon, TrashIcon, LockIcon, NoticeIcon } from "../../assets/Icons";
import HolidaySettings from "../settings/HolidaySettings";
import NoticeSettings from "../settings/NoticeSettings";
import PopupManagement from "../settings/PopupManagement";
const BRANCHES = ["Butwal", "Kathmandu", "Pokhara", "Nepalgunj"];
const normalizeBranch = (value) => String(value || "").trim().toLowerCase();
const validBranch = (value) =>
  BRANCHES.find((branch) => normalizeBranch(branch) === normalizeBranch(value)) || "Kathmandu";

const formatTime = (value) => {
  if (!value) return "-";
  const [hours, minutes] = String(value).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return String(value);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

export default function SuperAdminDashboardView({ onLogout, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Sync activeTab with URL
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "admin-management", "employees", "activities", "security", "profile", "holidays", "notices", "popup-management"];
    return validTabs.includes(path) ? path : "homepage";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const path = location.pathname.split("/").pop();
    const validTabs = ["homepage", "attendance", "admin-management", "employees", "activities", "security", "profile", "holidays", "notices", "popup-management"];
    if (validTabs.includes(path) && path !== activeTab) {
      setActiveTab(path);
    } else if (location.pathname === "/superadmin" || location.pathname === "/superadmin/") {
      navigate("/superadmin/homepage", { replace: true });
    }
  }, [location.pathname, activeTab, navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    navigate(`/superadmin/${tab}`);
  };
  const [selectedMetric, setSelectedMetric] = useState("all");
  const [detailsBranch, setDetailsBranch] = useState("all");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [holidaysList, setHolidaysList] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [adminForm, setAdminForm] = useState({
    name: "",
    username: "",
    password: "",
    branch: "Kathmandu",
    role: "Branch Admin",
    email: "",
    phone: "",
  });
  const [profileImage, setProfileImage] = useState(user?.photo || null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profilePasswordMode, setProfilePasswordMode] = useState(false);
  const [profilePasswordForm, setProfilePasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "Super Administrator",
    post: user?.roleTitle || "Chief Executive Officer / Super Admin",
  });
  const [executiveName, setExecutiveName] = useState(user?.name || "Mausam Kunwar Sir");
  const [executivePost, setExecutivePost] = useState(
    user?.roleTitle || "Chief Executive Officer / Super Admin",
  );
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  // nplToday needs to be defined before we use it in state initialization
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

  const [detailsListStartDate, setDetailsListStartDate] = useState(nplToday);
  const [detailsListEndDate, setDetailsListEndDate] = useState(nplToday);
  const [activityBranchFilter, setActivityBranchFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("custom"); // default to custom so user can use start/end
  const [activityStartDate, setActivityStartDate] = useState(nplToday);
  const [activityEndDate, setActivityEndDate] = useState(nplToday);
  const [superAdminActivities, setSuperAdminActivities] = useState([]);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Popup management state
  const [popupData, setPopupData] = useState({
    status: false,
    title: '',
    textContent: '',
    imageUrl: ''
  });

  const fetchPopupData = async () => {
    try {
      const data = await apiService.popups.get();
      if (data) {
        setPopupData({
          status: data.status,
          title: data.title,
          textContent: data.textContent,
          imageUrl: data.imageUrl
        });
      }
    } catch (error) {
      console.error("Failed to fetch popup data:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "popup-management") {
      fetchPopupData();
    }
  }, [activeTab]);

  const handleSavePopup = async (data) => {
    try {
      setLoading(true);
      // 1. Update text fields
      await apiService.popups.update({
        status: data.status,
        title: data.title,
        textContent: data.text_content,
      });

      // 2. If there's a new image file, upload it
      if (data.imageFile) {
        await apiService.popups.uploadPhoto(data.imageFile);
      }

      toast.success('Popup settings updated successfully');
      fetchPopupData(); // Refresh
    } catch (error) {
      console.error("Failed to save popup:", error);
      toast.error(error?.message || "Failed to save popup settings");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPopup = (data) => {
    // For preview, we use the local data from the form
    setPopupData({
      ...popupData,
      ...data,
      textContent: data.text_content,
      imageUrl: data.image_url // This will be the blob URL if a file was selected
    });
    // This will trigger the PopupAnnouncement in App.jsx if we manage it globally
    // But here we can just show a toast or something for now, or just let them see the preview in the form
    toast.info('Preview updated in the main app (if enabled)');
  };

  // Attendance Date Filters
  const [reportStartDate, setReportStartDate] = useState(nplToday);
  const [reportEndDate, setReportEndDate] = useState(nplToday);
  const [attendanceReport, setAttendanceReport] = useState({ attendances: [], absentEmployees: [], stats: {} });
  const [isReportLoading, setIsReportLoading] = useState(false);

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

  // todayStatus is a memo so it re-evaluates when holidays/settings are loaded
  const todayStatus = useMemo(() => getDayStatus(nplToday), [nplToday, holidaysList, globalSettings]);

  // Convert any ISO/UTC timestamp or plain date string to Nepal YYYY-MM-DD
  const toNplDate = useCallback((value) => {
    if (!value) return null;
    try {
      const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric', month: '2-digit', day: '2-digit'
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


  // Modal states
  const [modalType, setModalType] = useState(null); // 'editAdmin', 'resetAdminPassword', 'editEmployee', 'resetEmployeePassword'
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalForm, setModalForm] = useState({});
  const [modalLoading, setModalLoading] = useState(false);

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const fetchAttendanceReport = async () => {
    setIsReportLoading(true);
    try {
      const data = await apiService.attendance.getReport({
        dateFilter: "custom",
        startDate: reportStartDate,
        endDate: reportEndDate,
        branch: branchFilter !== "all" ? branchFilter : undefined,
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
  }, [activeTab, reportStartDate, reportEndDate, branchFilter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [employeeRes, attendanceRes, leaveRes, adminsRes, settingsRes, holidaysRes] = await Promise.allSettled([
        apiService.employees.getAll(),
        apiService.attendance.getAll(),
        apiService.leaveRequests.getAll(),
        authService.getManagedAdmins(),
        apiService.globalSettings.get(),
        apiService.holidays.getAll(),
      ]);
      setEmployees(employeeRes.status === "fulfilled" ? employeeRes.value || [] : []);
      setAttendance(attendanceRes.status === "fulfilled" ? attendanceRes.value || [] : []);
      setLeaveRequests(leaveRes.status === "fulfilled" ? leaveRes.value || [] : []);
      setAllAdmins(adminsRes.status === "fulfilled" ? adminsRes.value || [] : []);
      setGlobalSettings(settingsRes.status === "fulfilled" ? settingsRes.value : null);
      setHolidaysList(holidaysRes.status === "fulfilled" ? holidaysRes.value || [] : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const [allBranchSettings, setAllBranchSettings] = useState([]);
  const [securityInputs, setSecurityInputs] = useState({});

  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        setSecurityLoading(true);
        const data = await apiService.branchNetwork.getAll();
        setAllBranchSettings(data || []);
        // Initialize inputs for each branch
        const inputs = {};
        BRANCHES.forEach(b => {
          const setting = (data || []).find(s => normalizeBranch(s.branch) === normalizeBranch(b));
          inputs[b] = setting?.allowedIpAddress || "";
        });
        setSecurityInputs(inputs);
      } catch (error) {
        console.error(error);
      } finally {
        setSecurityLoading(false);
      }
    };
    if (activeTab === "security") {
      loadAllSettings();
    }
  }, [activeTab]);

  const isValidIPv4 = (value) => {
    const input = String(value || "").trim();
    const regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
    return regex.test(input);
  };

  const handleSaveOrUpdateBranchIp = async (branch) => {
    const ip = String(securityInputs[branch] || "").trim();
    if (!ip) {
      toast.error(`IP Address is required for ${branch}.`);
      return;
    }
    if (!isValidIPv4(ip)) {
      toast.error(`Invalid IPv4 address for ${branch}.`);
      return;
    }
    try {
      setSecurityLoading(true);
      await apiService.branchNetwork.upsert({
        branch,
        allowedIpAddress: ip,
      });
      // Refresh list
      const data = await apiService.branchNetwork.getAll();
      setAllBranchSettings(data || []);
      toast.success(`Network IP updated for ${branch}.`);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || `Failed to save IP for ${branch}.`);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleRemoveBranchIp = async (branch) => {
    try {
      setSecurityLoading(true);
      await apiService.branchNetwork.deleteByBranch(branch);
      // Refresh list
      const data = await apiService.branchNetwork.getAll();
      setAllBranchSettings(data || []);
      setSecurityInputs(prev => ({ ...prev, [branch]: "" }));
      toast.success(`Network restriction removed for ${branch}.`);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || `Failed to remove restriction for ${branch}.`);
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDetectMyIp = async (branch) => {
    try {
      setSecurityLoading(true);
      const data = await apiService.ipSettings.getMyIp();
      if (data?.ip) {
        setSecurityInputs(prev => ({ ...prev, [branch]: data.ip }));
        toast.info(`Detected your public IP: ${data.ip}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to detect your public IP.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleBranchClick = (branch) => {
    const norm = validBranch(branch);
    setDetailsBranch(norm);
    scrollToTable();
  };

  const today = nplToday;

  // Selected date derivations for the homepage Detailed List (supporting range)
  const selectedDateAttendance = useMemo(() => {
    return attendance.filter((row) => {
      const rowDate = toNplDate(row?.date);
      return rowDate >= detailsListStartDate && rowDate <= detailsListEndDate;
    });
  }, [attendance, detailsListStartDate, detailsListEndDate, toNplDate]);

  const selectedDateOnLeave = useMemo(() => {
    return employees.filter((emp) => {
      return leaveRequests.some(leave =>
        leave.status === "Approved" &&
        (leave.employee?.id === emp.id || leave.employeeId === emp.id) &&
        // If they were on leave for ANY day in the range
        !(toNplDate(leave.endDate) < detailsListStartDate || toNplDate(leave.startDate) > detailsListEndDate)
      );
    });
  }, [employees, leaveRequests, detailsListStartDate, detailsListEndDate, toNplDate]);

  const selectedDateAttendanceByDetailsBranch = useMemo(() => {
    if (detailsBranch === "all") return selectedDateAttendance;
    return selectedDateAttendance.filter(
      (row) => validBranch(row?.employee?.branch || row?.branch) === detailsBranch,
    );
  }, [selectedDateAttendance, detailsBranch]);

  const branchEmployees = useMemo(() => {
    if (detailsBranch === "all") return employees;
    return employees.filter((emp) => validBranch(emp?.branch) === detailsBranch);
  }, [employees, detailsBranch]);

  const presentEmployeesByDetailsBranch = useMemo(() => {
    return selectedDateAttendanceByDetailsBranch.filter((row) => row?.status === "Present");
  }, [selectedDateAttendanceByDetailsBranch]);

  const lateEmployeesByDetailsBranch = useMemo(() => {
    return presentEmployeesByDetailsBranch.filter((row) => String(row?.checkInTime || "") > "10:14");
  }, [presentEmployeesByDetailsBranch]);

  const earlyDepartureEmployeesByDetailsBranch = useMemo(() => {
    return presentEmployeesByDetailsBranch.filter((row) => row?.checkOutTime && String(row?.checkOutTime) < "16:45");
  }, [presentEmployeesByDetailsBranch]);

  const onLeaveEmployeesByDetailsBranch = useMemo(() => {
    return branchEmployees.filter((emp) => {
      return selectedDateOnLeave.some(onLeaveEmp => onLeaveEmp.id === emp.id);
    });
  }, [branchEmployees, selectedDateOnLeave]);

  const absentEmployeesByDetailsBranch = useMemo(() => {
    return branchEmployees.filter((emp) => {
      const isPresent = selectedDateAttendanceByDetailsBranch.some(
        (row) => (row?.employee?.id || row?.employeeId) === emp?.id,
      );
      const isOnLeave = onLeaveEmployeesByDetailsBranch.some(onLeaveEmp => onLeaveEmp.id === emp.id);
      return !isPresent && !isOnLeave;
    });
  }, [branchEmployees, selectedDateAttendanceByDetailsBranch, onLeaveEmployeesByDetailsBranch]);

  const branchOptions = useMemo(
    () => [
      { value: "all", label: "All Branches" },
      ...BRANCHES.map((b) => ({ value: b, label: b })),
    ],
    [],
  );

  const timeRangeOptions = useMemo(
    () => [
      { value: "today", label: "Today" },
      { value: "week", label: "This Week" },
      { value: "month", label: "This Month" },
      { value: "custom", label: "Custom Range" },
    ],
    [],
  );

  const reactSelectStyles = {
    control: (base) => ({
      ...base,
      borderRadius: 12,
      borderColor: "rgba(216, 224, 235, 1)",
      boxShadow: "none",
      background: "rgba(255, 255, 255, 0.08)",
      minHeight: 36,
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    singleValue: (base) => ({
      ...base,
      color: "#0f172a",
    }),
    input: (base) => ({
      ...base,
      color: "#0f172a",
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? "rgba(181, 142, 83, 0.12)" : "white",
      color: "#0f172a",
    }),
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
      `superadmin_detailed_list_${selectedMetric}_${dateLabel}.csv`,
      rows,
      ["name", "employeeId", "role", "addedDate", "branch", "date", "status", "checkIn"],
    );
  };

  const handlePrintDetailedList = () => {
    window.print();
  };

  const tableRef = useRef(null);

  const scrollToTable = () => {
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const exportAttendanceToCsv = () => {
    const rows = todayAttendance.map((row) => ({
      employee: row?.employee?.name || row?.name || "-",
      branch: validBranch(row?.employee?.branch || row?.branch),
      status: row?.status || "-",
      checkIn: row?.checkInTime ? formatTime(row.checkInTime) : "",
      checkOut: row?.checkOutTime ? formatTime(row.checkOutTime) : "",
    }));
    downloadCsv(`attendance_${today}.csv`, rows, ["employee", "branch", "status", "checkIn", "checkOut"]);
  };

  const exportAdminsToCsv = () => {
    const rows = allAdmins
      .filter((admin) => String(admin.role || "").trim().toLowerCase() !== "super admin")
      .map((admin) => ({
        name: admin.name || "-",
        username: admin.username || "-",
        branch: admin.branch || "-",
        role: admin.role || "-",
        contact: admin.phone || admin.email || "-",
      }));
    downloadCsv(`admins_list_${today}.csv`, rows, ["name", "username", "branch", "role", "contact"]);
  };

  const exportEmployeesToCsv = () => {
    const rows = employees.map((emp) => ({
      name: emp.name || "-",
      employeeId: emp.employeeId || "-",
      role: emp.department || emp.role || "-",
      branch: validBranch(emp.branch),
    }));
    downloadCsv(`employees_list_${today}.csv`, rows, ["name", "employeeId", "role", "branch"]);
  };

  const exportActivitiesToCsv = () => {
    const rows = recentActivities.map((item) => ({
      name: item.name || "-",
      role: item.role || "-",
      branch: item.branch || "-",
      activity: item.activity || "-",
      dateTime: item.timestamp ? new Date(item.timestamp).toLocaleString() : "-",
      description: item.description || "-",
    }));
    downloadCsv(`activities_log_${today}.csv`, rows, ["name", "role", "branch", "activity", "dateTime", "description"]);
  };

  // executiveName/executivePost are editable in the Executive Details tab.

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const detailedListRecords = useMemo(() => {
    const dateRange = getDatesInRange(detailsListStartDate, detailsListEndDate);
    const records = [];

    branchEmployees.forEach(emp => {
      const addedDate = toNplDate(emp.createdAt) || "1970-01-01";
      dateRange.forEach(date => {
        if (date < addedDate) return; // Only show reports after they were added
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

    // All employees for branchFilter
    const filteredEmployees = branchFilter === "all" 
      ? employees 
      : employees.filter(e => validBranch(e?.branch) === branchFilter);

    filteredEmployees.forEach(emp => {
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
    branchFilter,
    reportStartDate,
    reportEndDate,
    getDayStatus,
    toNplDate,
    getDatesInRange
  ]);

  const statCards = [
    { key: "all", label: "Total Employees", value: employees.length, icon: "TE" },
    { key: "present", label: detailsListStartDate === detailsListEndDate ? "Present Today" : "Present (Period)", value: detailedListRecords.filter(r => r.status === 'Present' || r.status === 'Late').length, icon: "PR" },
    { key: "late", label: detailsListStartDate === detailsListEndDate ? "Late Arrivals" : "Late (Period)", value: detailedListRecords.filter(r => r.status === 'Late').length, icon: "LT" },
    { key: "early_dept", label: detailsListStartDate === detailsListEndDate ? "Early Dept." : "Early (Period)", value: detailedListRecords.filter(r => r.att?.checkOutTime && String(r.att.checkOutTime) < "16:45").length, icon: "ED" },
    { key: "leave", label: detailsListStartDate === detailsListEndDate ? "On Leave Today" : "On Leave (Period)", value: detailedListRecords.filter(r => r.status === 'Leave').length, icon: "LV" },
    { key: "absent", label: detailsListStartDate === detailsListEndDate ? (getDayStatus(detailsListStartDate) || "Absent Today") : "Absent (Period)", value: detailedListRecords.filter(r => r.status === 'Absent').length, icon: "AB" },
  ];

  const branchStats = useMemo(() => {
    return BRANCHES.map((branch) => {
      const branchRecords = attendanceReportRecords.filter(r => validBranch(r.emp.branch) === branch);
      const present = branchRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const late = branchRecords.filter(r => r.status === 'Late').length;
      const early = branchRecords.filter(r => r.att?.checkOutTime && String(r.att.checkOutTime) < "16:45").length;
      const onLeave = branchRecords.filter(r => r.status === 'Leave').length;

      // For "Absent", we calculate it based on filtered records
      const absent = branchRecords.filter(r => r.status === 'Absent').length;

      return { branch, total: employees.filter(e => validBranch(e.branch) === branch).length, present, late, early, absent, onLeave };
    });
  }, [employees, attendanceReportRecords]);

  const recentActivities = useMemo(() => {
    // Use full attendance array so historical records show up when range is 'week' or 'month' or 'custom'
    const attendanceActivity = attendance.map((row) => ({
      id: `att-${row.id}`,
      name: row?.employee?.name || "Employee",
      role: "Employee",
      branch: validBranch(row?.employee?.branch || row?.branch),
      activity: row?.checkOutTime ? "Check-out" : "Check-in",
      status: row?.status || "Present",
      timestamp: row?.updatedAt || row?.createdAt || row?.date || new Date().toISOString(),
      description: `${row?.status || "Present"} (Check In: ${formatTime(row?.checkInTime)}, Check Out: ${formatTime(row?.checkOutTime)})`,
      type: row?.checkOutTime ? "check-out" : "check-in",
    }));

    const leaveActivity = leaveRequests.map((row) => ({
      id: `leave-${row.id}`,
      name: row?.employee?.name || "Employee",
      role: "Employee",
      branch: validBranch(row?.employee?.branch || row?.branch),
      activity: "Leave Request",
      status: "Pending",
      timestamp: row?.updatedAt || row?.createdAt || new Date().toISOString(),
      description: row?.leaveType || "Leave Request",
      type: "leave",
    }));

    // Generate holiday/week-off milestones for the selected range to show in the feed
    const holidayMilestones = [];
    try {
      const start = new Date(activityStartDate);
      const end = new Date(activityEndDate);
      // Limit to max 31 days range to prevent performance issues in the loop
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 60) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          const ds = getDayStatus(dateStr);
          if (ds) {
            holidayMilestones.push({
              id: `holiday-milestone-${dateStr}`,
              name: ds === "Holiday" ? "🎉 Public Holiday" : "📅 Week Off",
              role: "System",
              branch: "All Branches",
              activity: ds,
              timestamp: `${dateStr}T00:00:00Z`,
              description: ds === "Holiday" ? `Public Holiday observed on ${dateStr}` : `Weekly day off on ${dateStr}`,
              type: "holiday",
            });
          }
        }
      }
    } catch (e) {
       console.error("Error generating holiday milestones:", e);
    }

    const all = [...superAdminActivities, ...holidayMilestones, ...attendanceActivity, ...leaveActivity]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 100);

    return all.filter((item) => {
      if (activityFilter === "employees" && item.role !== "Employee") return false;
      if (activityFilter === "admins" && item.role !== "Admin") return false;
      if (activityFilter === "superadmin" && item.role !== "Super Admin") return false;

      // Activity-specific branch filter
      if (activityBranchFilter !== "all" && item.branch !== activityBranchFilter && item.branch !== "All Branches") return false;

      const itemNplDate = toNplDate(item.timestamp);

      if (timeRange === "custom") {
        if (!itemNplDate || itemNplDate < activityStartDate || itemNplDate > activityEndDate) return false;
      } else if (timeRange === "today") {
        if (itemNplDate !== today) return false;
      } else if (timeRange === "week") {
        const itemMs = new Date(item.timestamp).getTime();
        if (isNaN(itemMs) || itemMs < (new Date().getTime() - 7 * 24 * 60 * 60 * 1000)) return false;
      } else if (timeRange === "month") {
        const startOfMonth = toNplDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
        if (!itemNplDate || itemNplDate < startOfMonth) return false;
      }

      if (activitySearch.trim()) {
        const search = activitySearch.trim().toLowerCase();
        const text = `${item.name} ${item.activity} ${item.branch} ${item.description}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });
  }, [attendance, leaveRequests, superAdminActivities, activityFilter, activityBranchFilter, timeRange, activityStartDate, activityEndDate, activitySearch, today, toNplDate, getDayStatus]);

  const handleProfileImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);
    setProfileImageFile(file);
  };

  const handleSaveExecutivePhoto = async () => {
    if (!profileImageFile) {
      toast.error("Please select a photo first.");
      return;
    }
    if (!user?.id) {
      toast.error("Missing executive admin ID.");
      return;
    }

    try {
      setProfileSaving(true);
      const result = await apiService.auth.updateAdminPhoto(
        user.id,
        profileImageFile,
      );
      
      let finalPhoto = profileImage;
      if (result?.photoUrl) {
        finalPhoto = result.photoUrl;
      }

      setProfileImage(finalPhoto);
      
      // Update local session state to reflect changes globally
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.id === user.id) {
        // Ensure we only store persistent paths in localStorage
        const photoToStore = (finalPhoto && !finalPhoto.startsWith('blob:') && !finalPhoto.startsWith('data:')) 
          ? finalPhoto 
          : currentUser.photo;

        authService.setCurrentUser({
          ...currentUser,
          photo: photoToStore
        });
      }

      toast.success("Executive photo updated successfully.");
      setProfileImageFile(null);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update executive photo.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordCancel = () => {
    setProfilePasswordMode(false);
    setProfilePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setProfilePasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (profilePasswordForm.newPassword !== profilePasswordForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (profilePasswordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setProfileSaving(true);
    try {
      if (!user?.id) throw new Error("Executive ID is missing.");
      await authService.changeAdminPassword({ id: user.id }, profilePasswordForm.currentPassword, profilePasswordForm.newPassword);
      toast.success("Password updated successfully.");
      setProfilePasswordMode(false);
      setProfilePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to change password.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveExecutiveProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Missing executive admin ID.");
      return;
    }

    if (!profileForm.name.trim() || !profileForm.post.trim()) {
      toast.error("Name and post are required.");
      return;
    }

    try {
      setProfileSaving(true);
      await authService.updateManagedAdmin(user.id, {
        name: String(profileForm.name).trim(),
        role: String(profileForm.post).trim(),
      });

      let finalPhoto = profileImage;
      if (profileImageFile) {
        const result = await apiService.auth.updateAdminPhoto(
          user.id,
          profileImageFile,
        );
        if (result?.photoUrl) {
          finalPhoto = result.photoUrl;
        }
      }

      setExecutiveName(String(profileForm.name).trim());
      setExecutivePost(String(profileForm.post).trim());
      setProfileImage(finalPhoto);

      // Update local session state to reflect changes globally without logout
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.id === user.id) {
        // Ensure we only store persistent paths in localStorage
        const photoToStore = (finalPhoto && !finalPhoto.startsWith('blob:') && !finalPhoto.startsWith('data:')) 
          ? finalPhoto 
          : currentUser.photo;

        authService.setCurrentUser({
          ...currentUser,
          name: String(profileForm.name).trim(),
          roleTitle: String(profileForm.post).trim(),
          photo: photoToStore,
        });
      }

      setProfileEditMode(false);
      setProfileImageFile(null);
      toast.success("Executive profile updated successfully.");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to update executive profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.username.trim() || !adminForm.password.trim()) {
      toast.error("Please complete required admin fields.");
      return;
    }
    const branch = validBranch(adminForm.branch);
    try {
      setLoading(true);
      await authService.createManagedAdmin({
        ...adminForm,
        branch,
        role: adminForm.role || "Branch Admin",
      });
      setSuperAdminActivities((prev) => [
        {
          id: `superadmin-${Date.now()}`,
          name: user?.name || "Mausam Kunwar",
          role: "Super Admin",
          branch: "All Branches",
          activity: "Created Admin Account",
          timestamp: new Date().toISOString(),
          description: `Branch: ${branch}, Admin: ${adminForm.name}`,
          type: "admin-create",
        },
        ...prev,
      ]);
      toast.success(`Admin account created for ${branch}.`);
      setAdminForm({
        name: "",
        username: "",
        password: "",
        branch: "Kathmandu",
        role: "Branch Admin",
        email: "",
        phone: "",
      });
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to create admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditManagedAdmin = (admin) => {
    setSelectedItem(admin);
    setModalForm({
      name: admin?.name || "",
      username: admin?.username || "",
      role: admin?.role || "Branch Admin",
      email: admin?.email || "",
      phone: admin?.phone || "",
    });
    setModalType("editAdmin");
  };

  const handleResetManagedAdminPassword = (admin) => {
    setSelectedItem(admin);
    setModalForm({ password: "" });
    setModalType("resetAdminPassword");
  };

  const handleEditEmployeeProfile = (employee) => {
    setSelectedItem(employee);
    setModalForm({
      name: employee?.name || "",
      department: employee?.department || employee?.role || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      branch: employee?.branch || "Kathmandu",
    });
    setModalType("editEmployee");
  };

  const handleResetEmployeePassword = (employee) => {
    setSelectedItem(employee);
    setModalForm({ password: "" });
    setModalType("resetEmployeePassword");
  };

  const handleDeleteManagedAdmin = async (admin) => {
    const adminLabel = `${admin?.name || ""} (${admin?.username || ""})`.trim();
    if (!window.confirm(`Are you sure you want to delete admin ${adminLabel || "this account"}?`)) return;

    try {
      await authService.deleteManagedAdmin(admin.id);
      toast.success("Admin account deleted successfully.");
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to delete admin.");
    }
  };

  const handleDeleteEmployeeBySuperAdmin = async (employee) => {
    const employeeLabel = `${employee?.name || ""} (${employee?.employeeId || ""})`.trim();
    if (!window.confirm(`Are you sure you want to delete employee ${employeeLabel || "this account"}?`)) return;

    try {
      await apiService.employees.deleteBySuperAdmin(employee.id);
      toast.success("Employee deleted successfully.");
      await loadAll();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Failed to delete employee.");
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setModalForm({});
    setModalLoading(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    setModalLoading(true);

    try {
      if (modalType === "editAdmin") {
        const { name, username, role, email, phone } = modalForm;
        await authService.updateManagedAdmin(selectedItem.id, {
          name: String(name).trim(),
          username: String(username).trim() || undefined,
          role: String(role).trim() || "Branch Admin",
          email: String(email).trim(),
          phone: String(phone).trim(),
        });
        toast.success("Admin profile updated.");
        setSuperAdminActivities((prev) => [
          {
            id: `superadmin-admin-profile-${Date.now()}`,
            name: user?.name || "Super Admin",
            role: "Super Admin",
            branch: "All Branches",
            activity: "Updated Admin Profile",
            timestamp: new Date().toISOString(),
            description: `Admin: ${selectedItem?.username || selectedItem?.name}`,
            type: "admin-update",
          },
          ...prev,
        ]);
        await loadAll();
      } else if (modalType === "resetAdminPassword") {
        const { password } = modalForm;
        if (String(password).trim().length < 6) {
          toast.error("Password must be at least 6 characters.");
          setModalLoading(false);
          return;
        }
        await authService.updateManagedAdminPassword(selectedItem.id, password);
        toast.success("Admin password updated.");
        setSuperAdminActivities((prev) => [
          {
            id: `superadmin-admin-pass-${Date.now()}`,
            name: user?.name || "Super Admin",
            role: "Super Admin",
            branch: "All Branches",
            activity: "Reset Admin Password",
            timestamp: new Date().toISOString(),
            description: `Admin: ${selectedItem?.username || selectedItem?.name}`,
            type: "admin-password",
          },
          ...prev,
        ]);
      } else if (modalType === "editEmployee") {
        const { name, department, email, phone, branch } = modalForm;
        await apiService.employees.update(selectedItem.id, {
          name: String(name).trim(),
          department: String(department).trim(),
          email: String(email).trim(),
          phone: String(phone).trim(),
          branch: validBranch(branch),
        });
        toast.success("Employee profile updated.");
        await loadAll();
      } else if (modalType === "resetEmployeePassword") {
        const { password } = modalForm;
        if (String(password).trim().length < 6) {
          toast.error("Password must be at least 6 characters.");
          setModalLoading(false);
          return;
        }
        await authService.setEmployeeCredentials(
          { id: selectedItem.id, employeeId: selectedItem.employeeId },
          String(password).trim(),
          { mustChangePassword: true },
        );
        toast.success("Employee password updated.");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Action failed.");
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <Loader size="large" message="Loading executive dashboard..." />
      </div>
    );
  }

  const renderModal = () => {
    if (!modalType) return null;

    const isReset = modalType.includes("Password");
    const isEmployee = modalType.includes("Employee");

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content superadmin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              {isReset ? "Reset Password" : "Update Profile"}
              <small style={{ display: 'block', fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
                {isEmployee ? "Employee" : "Admin"}: {selectedItem?.name || selectedItem?.username}
              </small>
            </h3>
            <button className="close-btn" onClick={closeModal}>&times;</button>
          </div>

          <form onSubmit={handleModalSubmit} className="modal-form">
            <div className="form-grid">
              {isReset ? (
                <div className="form-group full-width">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={modalForm.password || ""}
                    onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                    placeholder="Enter new password (min 6 characters)"
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={modalForm.name || ""}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      required
                    />
                  </div>
                  {!isEmployee && (
                    <div className="form-group">
                      <label>Username</label>
                      <input
                        type="text"
                        value={modalForm.username || ""}
                        onChange={(e) => setModalForm({ ...modalForm, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>{isEmployee ? "Department / Role" : "Role / Post"}</label>
                    <input
                      type="text"
                      value={isEmployee ? modalForm.department : modalForm.role || ""}
                      onChange={(e) => setModalForm({ ...modalForm, [isEmployee ? 'department' : 'role']: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={modalForm.email || ""}
                      onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={modalForm.phone || ""}
                      onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
                    />
                  </div>
                  {isEmployee && (
                    <div className="form-group full-width">
                      <label>Branch</label>
                      <select
                        value={modalForm.branch || ""}
                        onChange={(e) => setModalForm({ ...modalForm, branch: e.target.value })}
                      >
                        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={modalLoading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-login" disabled={modalLoading}>
                {modalLoading ? "Saving..." : isReset ? "Reset Password" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="card superadmin-dashboard">
      {renderModal()}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <div className="employee-header">
        <div className="employee-header-left">
          <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="employee-header-copy">
            <h1>Super Admin Dashboard</h1>
            <div className="employee-header-meta">
              <span className="welcome-status">{`${greeting}, ${executiveName}`}</span>
              <span className="welcome-sub">Centralized Monitoring • Super Admin Access • All Branches</span>
            </div>
          </div>
        </div>
        <div className="employee-header-actions">
          <div className="employee-status-chip">Super Admin</div>
          <span className="scope-pill">Scope: All Branches</span>
          <button className="dashboard-btn dashboard-btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className={`employee-tabs ${isMobileMenuOpen ? 'menu-open' : ''}`}>
        <button className="sidebar-close-btn" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">✕</button>
        <button className={`tab-btn ${activeTab === "homepage" ? "active" : ""}`} onClick={() => handleTabChange("homepage")}>Homepage</button>
        <button className={`tab-btn ${activeTab === "attendance" ? "active" : ""}`} onClick={() => handleTabChange("attendance")}>All Attendance</button>
        <button className={`tab-btn ${activeTab === "admin-management" ? "active" : ""}`} onClick={() => handleTabChange("admin-management")}>Admin Management</button>
        <button className={`tab-btn ${activeTab === "employees" ? "active" : ""}`} onClick={() => handleTabChange("employees")}>Employee Management</button>
        <button className={`tab-btn ${activeTab === "activities" ? "active" : ""}`} onClick={() => handleTabChange("activities")}>Recent Activities</button>
        <button className={`tab-btn ${activeTab === "security" ? "active" : ""}`} onClick={() => handleTabChange("security")}>Security</button>
        <button className={`tab-btn ${activeTab === "profile" ? "active" : ""}`} onClick={() => handleTabChange("profile")}>Executive Details</button>
        <button className={`tab-btn ${activeTab === "holidays" ? "active" : ""}`} onClick={() => handleTabChange("holidays")}>Holidays & Week-offs</button>
        <button className={`tab-btn ${activeTab === "notices" ? "active" : ""}`} onClick={() => handleTabChange("notices")}>Notices</button>
        <button className={`tab-btn ${activeTab === "popup-management" ? "active" : ""}`} onClick={() => handleTabChange("popup-management")}>Popup Management</button>
      </div>

      {activeTab === "popup-management" && (
        <PopupManagement 
          popup={{
            ...popupData,
            text_content: popupData.textContent,
            image_url: apiService.getImageUrl(popupData.imageUrl)
          }} 
          onSave={handleSavePopup} 
          onPreview={handlePreviewPopup} 
        />
      )}

      {activeTab === "homepage" && (
        <div className="employee-tab">
          <section className="homepage-grid" style={{ gridTemplateColumns: "repeat(12, 1fr)", gap: "16px" }}>
            <div className="executive-box" style={{ gridColumn: "span 3" }}>
              <div className="executive-photo-wrap" style={{ maxWidth: "160px", marginBottom: "10px" }}>
                {profileImage ? (
                  <img className="executive-avatar" src={apiService.getImageUrl(profileImage)} alt={executiveName} style={{ height: "160px" }} />
                ) : (
                  <div className="executive-avatar-fallback" style={{ height: "160px", fontSize: "32px" }}>MK</div>
                )}
              </div>
              <div className="executive-info" style={{ fontSize: "13px" }}>
                <span className="executive-badge" style={{ fontSize: "10px", padding: "2px 8px" }}>Executive Profile</span>
                <h3 style={{ fontSize: "18px", margin: "4px 0" }}>{executiveName}</h3>
                <p style={{ fontSize: "13px", margin: "2px 0" }}>Chief Executive Officer / Super Admin</p>
                <div className="executive-meta-list" style={{ marginTop: "10px", gap: "6px" }}>
                  <div style={{ padding: "4px 0" }}><span>Headquarters</span><strong>Kathmandu</strong></div>
                  <div style={{ padding: "4px 0" }}><span>Access Scope</span><strong>All Branches</strong></div>
                </div>
                <label className="profile-upload-label" style={{ padding: "5px 10px", fontSize: "12px", marginTop: "10px" }}>
                  Upload Image
                  <input type="file" accept="image/*" onChange={handleProfileImageChange} />
                </label>
              </div>
            </div>

            <div className="stats-box" style={{ gridColumn: "span 5" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>Today's Overall Attendance Report</h4>
              {todayStatus && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: todayStatus === "Holiday"
                    ? "linear-gradient(135deg, #fef9c3, #fef3c7)"
                    : "linear-gradient(135deg, #e0f2fe, #dbeafe)",
                  border: todayStatus === "Holiday" ? "1.5px solid #fde68a" : "1.5px solid #93c5fd",
                  color: todayStatus === "Holiday" ? "#92400e" : "#1e40af",
                  fontWeight: "600",
                  fontSize: "13px",
                }}>
                  <span style={{ fontSize: "20px" }}>{todayStatus === "Holiday" ? "🎉" : "📅"}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Today is a {todayStatus}</div>
                    <div style={{ fontSize: "11px", fontWeight: 400, marginTop: "2px", opacity: 0.85 }}>
                      {todayStatus === "Holiday"
                        ? "Attendance is not tracked today — Public Holiday."
                        : "Attendance is not tracked today — Scheduled Week Off."}
                    </div>
                  </div>
                </div>
              )}
              <div className="stat-cards" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
                {statCards.map((card) => {
                  const tone = card.key === "present" ? "present" : card.key === "late" ? "late" : card.key === "absent" ? "absent" : "total";
                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setSelectedMetric(card.key)}
                      className={`stat-card ${tone} ${selectedMetric === card.key ? "active" : ""}`}
                      style={{ padding: "10px", minHeight: "80px" }}>
                      <span className="stat-icon" style={{ fontSize: "1.2rem" }}>{card.icon}</span>
                      <span style={{ fontSize: "12px" }}>{card.label}</span>
                      <strong style={{ fontSize: "1.4rem" }}>{card.value}</strong>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="branches-box" style={{ gridColumn: "span 4" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "5px" }}>Branch Coverage</h4>
              <p className="branches-note" style={{ fontSize: "11px", marginBottom: "10px" }}>Centralized Access Enabled • 4 Branches</p>
              <div className="branch-chips" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {branchStats.map((item) => (
                  <button
                    type="button"
                    key={item.branch}
                    className={`branch-chip premium-chip ${detailsBranch === item.branch ? "active" : ""}`}
                    onClick={() => handleBranchClick(item.branch)}
                    style={{ padding: "8px", width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", border: "1.5px solid rgba(212, 163, 115, 0.2)" }}>
                    <div className="chip-content" style={{ gap: "8px", display: "flex", alignItems: "center", width: "100%" }}>
                      <span className={`status-dot ${item.present > 0 ? "active" : "inactive"}`} style={{ width: "8px", height: "8px", flexShrink: 0 }}></span>
                      <div className="chip-text" style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                        <span className="chip-label" style={{ fontSize: "13px", fontWeight: "700", display: "block" }}>{item.branch}</span>
                        <span className="chip-value" style={{ fontSize: "11px" }}>{item.present}/{item.total}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="recent-activities-section">
            <div className="recent-activities-header">
              <h4>Recent Activities Feed</h4>
              <div className="activity-filters">
                <div className="chip-row">
                  <button onClick={() => setActivityFilter("all")} className={activityFilter === "all" ? "active" : ""}>All</button>
                  <button onClick={() => setActivityFilter("employees")} className={activityFilter === "employees" ? "active" : ""}>Employees</button>
                  <button onClick={() => setActivityFilter("admins")} className={activityFilter === "admins" ? "active" : ""}>Admins</button>
                  <button onClick={() => setActivityFilter("superadmin")} className={activityFilter === "superadmin" ? "active" : ""}>Super Admin</button>
                </div>
                <div className="filter-selects">
                  <div style={{ width: "100%" }}>
                    <Select
                      options={branchOptions}
                      value={branchOptions.find((o) => o.value === activityBranchFilter) || branchOptions[0]}
                      onChange={(opt) => setActivityBranchFilter(opt?.value || "all")}
                      styles={reactSelectStyles}
                      isSearchable={false}
                    />
                  </div>
                  <div style={{ width: "100%" }}>
                    <Select
                      options={timeRangeOptions}
                      value={timeRangeOptions.find((o) => o.value === timeRange) || timeRangeOptions[0]}
                      onChange={(opt) => setTimeRange(opt?.value || "today")}
                      styles={reactSelectStyles}
                      isSearchable={false}
                    />
                  </div>
                  {timeRange === "custom" && (
                    <>
                      <div style={{ minWidth: 140 }}>
                        <input 
                          type="date" 
                          value={activityStartDate} 
                          onChange={(e) => setActivityStartDate(e.target.value)} 
                          className="form-control"
                          style={{ height: 38, fontSize: "13px" }}
                        />
                      </div>
                      <div style={{ minWidth: 140 }}>
                        <input 
                          type="date" 
                          value={activityEndDate} 
                          onChange={(e) => setActivityEndDate(e.target.value)} 
                          className="form-control"
                          style={{ height: 38, fontSize: "13px" }}
                        />
                      </div>
                    </>
                  )}
                  <input type="search" placeholder="Search activity" value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="activity-feed">
              {todayStatus && (timeRange === "today" || !timeRange) && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 20px",
                  marginBottom: "12px",
                  borderRadius: "10px",
                  background: todayStatus === "Holiday" ? "linear-gradient(135deg, #fef9c3, #fef3c7)" : "linear-gradient(135deg, #e0f2fe, #dbeafe)",
                  border: todayStatus === "Holiday" ? "1.5px solid #fde68a" : "1.5px solid #93c5fd",
                  color: todayStatus === "Holiday" ? "#92400e" : "#1e40af",
                  fontWeight: "600",
                  fontSize: "14px",
                }}
                >
                  <span style={{ fontSize: "22px" }}>{todayStatus === "Holiday" ? "🎉" : "📅"}</span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Today is a {todayStatus}</div>
                    <div style={{ fontSize: "12px", fontWeight: 400, marginTop: "2px", opacity: 0.85 }}>
                      {todayStatus === "Holiday"
                        ? "Attendance is not being tracked today as it is a public holiday."
                        : "Attendance is not being tracked today as it is a scheduled week off."}
                    </div>
                  </div>
                </div>
              )}
              {recentActivities.length ? recentActivities.map((item) => (
                <article key={item.id} className={`activity-item ${item.type}`}
                  style={item.type === "holiday" ? {
                    background: "linear-gradient(90deg, #fef9c3 0%, #fff 100%)",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                  } : {}}
                >
                  <div className="activity-headline">
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                    <span>{item.branch}</span>
                    <span>{formatDateTime(item.timestamp)}</span>
                  </div>
                  <p><em>{item.activity}</em> - {item.description}</p>
                </article>
              )) : <p className="empty-note">No recent activities found for this filter.</p>}
            </div>
          </section>

          <section className="details-table-section">
            <div className="profile-overview-card">
              <div className="profile-overview-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0 }}>Detailed List ({selectedMetric === "all" ? "All Employees" : selectedMetric})</h4>
                  <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ width: 180 }}>
                      <Select
                        options={branchOptions}
                        value={branchOptions.find((o) => o.value === detailsBranch) || branchOptions[0]}
                        onChange={(opt) => setDetailsBranch(opt?.value || "all")}
                        styles={{
                          ...reactSelectStyles,
                          container: (p) => ({ ...p, minHeight: 32 }),
                          control: (p) => ({ ...p, minHeight: 32, height: 32 }),
                          valueContainer: (p) => ({ ...p, padding: "0 8px" }),
                          dropdownIndicator: (p) => ({ ...p, padding: 4 }),
                        }}
                        isSearchable={false}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="date" 
                        value={detailsListStartDate} 
                        onChange={(e) => setDetailsListStartDate(e.target.value)} 
                        className="form-control"
                        style={{ height: 32, fontSize: "12px", padding: "0 8px", width: 130 }}
                      />
                      <span style={{ fontSize: "11px", color: "#64748b" }}>to</span>
                      <input 
                        type="date" 
                        value={detailsListEndDate} 
                        onChange={(e) => setDetailsListEndDate(e.target.value)} 
                        className="form-control"
                        style={{ height: 32, fontSize: "12px", padding: "0 8px", width: 130 }}
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
                <h2>Grace International - Detailed Employee List</h2>
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
            </div>
          </section>
        </div>
      )}

      {activeTab === "admin-management" && (
        <div className="employee-tab">
          <h3>Create Branch Admin Accounts</h3>
          <div className="inline-panel">
            <h4>Admin Credential Setup</h4>
            <form onSubmit={handleCreateAdmin} className="inline-grid">
              <div><label>Admin Full Name</label><input value={adminForm.name} onChange={(e) => setAdminForm((p) => ({ ...p, name: e.target.value }))} required /></div>
              <div><label>Admin ID / Username</label><input value={adminForm.username} onChange={(e) => setAdminForm((p) => ({ ...p, username: e.target.value }))} required /></div>
              <div><label>Password</label><input type="password" value={adminForm.password} onChange={(e) => setAdminForm((p) => ({ ...p, password: e.target.value }))} required /></div>
              <div><label>Branch</label><select value={adminForm.branch} onChange={(e) => setAdminForm((p) => ({ ...p, branch: e.target.value }))} required>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
              <div><label>Role/Post</label><input value={adminForm.role} onChange={(e) => setAdminForm((p) => ({ ...p, role: e.target.value }))} placeholder="Branch Admin / Director" required /></div>
              <div><label>Email / Contact</label><input value={adminForm.email} onChange={(e) => setAdminForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div><label>Phone</label><input value={adminForm.phone} onChange={(e) => setAdminForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div style={{ alignSelf: "end" }}><button className="btn btn-login" type="submit">Create Admin Account</button></div>
            </form>
          </div>
          <div className="profile-overview-card">
            <div className="profile-overview-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>All Branch Admins</h4>
              <div className="no-print" style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-secondary icon-btn-round" onClick={() => window.print()} title="Print Admins">
                  <PrintIcon />
                  <span>Print</span>
                </button>
                <button type="button" className="btn btn-login icon-btn-round" onClick={exportAdminsToCsv} title="Export CSV">
                  <ExportIcon />
                  <span>Export</span>
                </button>
              </div>
            </div>
            <div className="table-container printable">
              <table>
                <thead><tr><th>Name</th><th>Username</th><th>Branch</th><th>Role</th><th>Contact</th><th>Actions</th></tr></thead>
                <tbody>
                  {allAdmins.filter((a) => String(a.role || "").trim().toLowerCase() !== "super admin").length ?
                    allAdmins
                      .filter((a) => String(a.role || "").trim().toLowerCase() !== "super admin")
                      .map((admin) => (
                        <tr key={admin.id}>
                          <td>{admin.name}</td>
                          <td>{admin.username}</td>
                          <td>{admin.branch}</td>
                          <td>{admin.role}</td>
                          <td>{admin.phone || admin.email || "-"}</td>
                          <td style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="action-icon-btn edit" onClick={() => handleEditManagedAdmin(admin)} title="Update Profile">
                              <EditIcon />
                            </button>
                            <button type="button" className="action-icon-btn reset" onClick={() => handleResetManagedAdminPassword(admin)} title="Reset Password">
                              <LockIcon />
                            </button>
                            <button type="button" className="action-icon-btn delete" onClick={() => handleDeleteManagedAdmin(admin)} title="Delete Admin">
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="6">No branch admin accounts created yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "employees" && (
        <div className="employee-tab">
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>All Employees Across Branches</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary icon-btn-round" onClick={() => window.print()} title="Print Employees">
                <PrintIcon />
                <span>Print</span>
              </button>
              <button type="button" className="btn btn-login icon-btn-round" onClick={exportEmployeesToCsv} title="Export CSV">
                <ExportIcon />
                <span>Export</span>
              </button>
            </div>
          </div>
          <div className="table-container printable">
            <table>
              <thead><tr><th>Name</th><th>Employee ID</th><th>Role/Post</th><th>Branch</th><th>Actions</th></tr></thead>
              <tbody>
                {employees.length ? employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name || "-"}</td>
                    <td>{emp.employeeId || "-"}</td>
                    <td>{emp.department || emp.role || "-"}</td>
                    <td>{validBranch(emp.branch)}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="action-icon-btn edit" onClick={() => handleEditEmployeeProfile(emp)} title="Update Profile">
                        <EditIcon />
                      </button>
                      <button type="button" className="action-icon-btn reset" onClick={() => handleResetEmployeePassword(emp)} title="Reset Password">
                        <LockIcon />
                      </button>
                      <button type="button" className="action-icon-btn delete" onClick={() => handleDeleteEmployeeBySuperAdmin(emp)} title="Delete Employee">
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )) : <tr><td colSpan="5">No employees available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="employee-tab">
          <div className="print-only-header">
            <h2>Grace International - All Attendance Report</h2>
            <p>Generated on: {new Date().toLocaleString()}</p>
          </div>
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20, background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: "block" }}>Branch</label>
                <div style={{ width: 160 }}>
                  <Select
                    options={branchOptions}
                    value={branchOptions.find((o) => o.value === branchFilter) || branchOptions[0]}
                    onChange={(opt) => setBranchFilter(opt?.value || "all")}
                    styles={reactSelectStyles}
                    isSearchable={false}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: "block" }}>Start Date</label>
                <input 
                  type="date" 
                  value={reportStartDate} 
                  onChange={(e) => setReportStartDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", height: "38px" }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", marginBottom: "4px", display: "block" }}>End Date</label>
                <input 
                  type="date" 
                  value={reportEndDate} 
                  onChange={(e) => setReportEndDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "14px", height: "38px" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary icon-btn-round"
                onClick={() => window.print()}
                title="Print Attendance"
                style={{ height: "38px" }}
              >
                <PrintIcon />
                <span>Print</span>
              </button>
              <button
                type="button"
                className="btn btn-login icon-btn-round"
                onClick={exportAttendanceToCsv}
                title="Export CSV"
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

          <div className="dashboard-summary-grid" style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
             <article className="dashboard-summary-card positive" style={{flex:1}}>
                <span>Total Present</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Present' || r.status === 'Late').length}</strong>
             </article>
             <article className="dashboard-summary-card warning" style={{flex:1}}>
                <span>Late Arrivals</span>
                <strong>{attendanceReportRecords.filter(r => r.status === 'Late').length}</strong>
             </article>
             <article className="dashboard-summary-card danger" style={{flex:1, backgroundColor: "#fff1f2", color: "#e11d48", borderLeft: "4px solid #f43f5e", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>Early Dept.</span>
                <strong style={{ fontSize: "24px" }}>{attendanceReportRecords.filter(r => r.att?.checkOutTime && String(r.att.checkOutTime) < "16:45").length}</strong>
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

          {branchFilter === "all" && attendanceReport.stats?.branchStats && (
            <div className="profile-overview-card" style={{ marginBottom: "30px" }}>
              <div className="profile-overview-header">
                <h4 style={{ margin: 0 }}>Branch-wise Summary ({reportStartDate === reportEndDate ? reportStartDate : `${reportStartDate} to ${reportEndDate}`})</h4>
              </div>
              <div className="table-container">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Early Dept.</th>
                      <th>Absent</th>
                      <th>On Leave</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.stats.branchStats.map((b) => (
                      <tr key={b.branch}>
                        <td style={{ fontWeight: "700" }}>{b.branch}</td>
                        <td>{b.present}</td>
                        <td style={{ color: b.late > 0 ? "#d97706" : "inherit" }}>{b.late}</td>
                        <td style={{ color: b.early > 0 ? "#e11d48" : "inherit" }}>{b.early}</td>
                        <td style={{ color: b.absent > 0 ? "#dc2626" : "inherit" }}>{b.absent}</td>
                        <td style={{ color: b.onLeave > 0 ? "#0369a1" : "inherit" }}>{b.onLeave}</td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => setBranchFilter(b.branch)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="table-container printable">
            {isReportLoading ? (
              <div style={{ padding: "40px", textAlign: "center" }}><Loader size="medium" message="Fetching report..." /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Branch</th>
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
                        <td>{validBranch(emp.branch)}</td>
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
                      <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>No attendance records found for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === "activities" && (
        <div className="employee-tab">
          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0 }}>Recent Activities</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-secondary icon-btn-round" onClick={() => window.print()} title="Print Activities">
                <PrintIcon />
                <span>Print</span>
              </button>
              <button type="button" className="btn btn-login icon-btn-round" onClick={exportActivitiesToCsv} title="Export CSV">
                <ExportIcon />
                <span>Export</span>
              </button>
            </div>
          </div>
          <div className="table-container printable">
            <table>
              <thead><tr><th>User Name</th><th>Role</th><th>Branch</th><th>Activity</th><th>Date/Time</th><th>Description</th></tr></thead>
              <tbody>
                {recentActivities.length ? recentActivities.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td><td>{item.role}</td><td>{item.branch}</td><td>{item.activity}</td>
                    <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"}</td>
                    <td>{item.description}</td>
                  </tr>
                )) : <tr><td colSpan="6">No recent activities available.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="employee-tab">
          <h3>Network Security Management</h3>
          <div className="profile-overview-card">
            <div className="profile-overview-header">
              <h4>Branch IP Control Center</h4>
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Configure and monitor allowed attendance network paths for all consultancy branches.</p>
            </div>
            <div className="table-container no-print" style={{ marginTop: 20 }}>
              <table>
                <thead>
                  <tr>
                    <th>Branch Office</th>
                    <th>Allowed IP Address</th>
                    <th>Security Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {BRANCHES.map(branch => {
                    const setting = allBranchSettings.find(s => normalizeBranch(s.branch) === normalizeBranch(branch));
                    const currentIp = securityInputs[branch] || "";
                    const isProtected = !!setting?.allowedIpAddress;

                    return (
                      <tr key={branch}>
                        <td style={{ fontWeight: 600 }}>{branch}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                              type="text"
                              value={currentIp}
                              onChange={(e) => setSecurityInputs(p => ({ ...p, [branch]: e.target.value }))}
                              placeholder="e.g. 103.154.12.10"
                              style={{
                                maxWidth: 160,
                                padding: "6px 10px",
                                fontSize: "0.85rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: 6
                              }}
                              disabled={securityLoading}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "6px 8px", fontSize: "0.7rem", whiteSpace: "nowrap" }}
                              onClick={() => handleDetectMyIp(branch)}
                              disabled={securityLoading}
                              title="Detect your current public IP"
                            >
                              My IP
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${isProtected ? "status-approved" : "status-pending"}`}>
                            {isProtected ? "Protected" : "Public/All"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="btn btn-login"
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                              onClick={() => handleSaveOrUpdateBranchIp(branch)}
                              disabled={securityLoading}
                            >
                              {isProtected ? "Update" : "Enable"}
                            </button>
                            {isProtected && (
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                                onClick={() => handleRemoveBranchIp(branch)}
                                disabled={securityLoading}
                              >
                                Disable
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 24, padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
              <h5 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>💡 Security Guidelines</h5>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
                <li>Setting an IP address restricts attendance check-ins to that specific network for that branch.</li>
                <li>If <strong>"Public/All"</strong> is shown, employees of that branch can mark attendance from any network.</li>
                <li>Ensure the IP provided is the Static Public IP of the branch's internet connection.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="employee-tab">
          <h3>Executive Details / System Overview</h3>
          <div className="profile-overview-card">
            {!profileEditMode && !profilePasswordMode ? (
              <>
                <div className="profile-overview-grid">
                  <div><span>Name</span><strong>{executiveName || "-"}</strong></div>
                  <div><span>Post</span><strong>{executivePost || "-"}</strong></div>
                  <div><span>Scope</span><strong>All Branches</strong></div>
                  <div><span>Monitoring</span><strong>Centralized</strong></div>
                </div>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <button
                    type="button"
                    className="btn btn-login"
                    onClick={() => {
                      setProfileForm({ name: executiveName || "", post: executivePost || "" });
                      setProfileEditMode(true);
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setProfilePasswordMode(true)}
                  >
                    Change Password
                  </button>
                </div>
              </>
            ) : profilePasswordMode ? (
              <div className="superadmin-modal">
                <form onSubmit={handlePasswordSubmit} className="modal-form" style={{ marginTop: 8 }}>
                  <h4 style={{ margin: 0, paddingBottom: 16 }}>Change Password</h4>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={profilePasswordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        disabled={profileSaving}
                      />
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={profilePasswordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Min 6 characters"
                        required
                        disabled={profileSaving}
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={profilePasswordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        disabled={profileSaving}
                      />
                    </div>
                  </div>

                  <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handlePasswordCancel}
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-login" disabled={profileSaving}>
                      {profileSaving ? "Saving..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="superadmin-modal">
                <form onSubmit={handleSaveExecutiveProfile} className="modal-form" style={{ marginTop: 8 }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Post / Designation</label>
                      <input
                        type="text"
                        value={profileForm.post}
                        onChange={(e) => setProfileForm((p) => ({ ...p, post: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Photo</label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div>
                          {profileImage ? (
                            <img
                              src={apiService.getImageUrl(profileImage)}
                              alt="Executive"
                              style={{ width: 80, height: 80, borderRadius: 16, objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ width: 80, height: 80, borderRadius: 16, background: "#e5e7eb" }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 220 }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProfileImageChange}
                            disabled={profileSaving}
                          />
                          <small style={{ display: "block", color: "#64748b", marginTop: 6 }}>
                            Photo preview will update immediately after selection.
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setProfileEditMode(false)}
                      disabled={profileSaving}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-login" disabled={profileSaving}>
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "holidays" && (
        <HolidaySettings onSettingsUpdated={loadAll} />
      )}

      {activeTab === "notices" && (
        <NoticeSettings user={user} />
      )}
    </div>
  );
}
