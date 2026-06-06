/**
 * Grace International HRM System - Mock API Service
 * This service provides mock data instead of connecting to a backend
 * No backend connection required for demo/development
 */

import {
  mockEmployees,
  mockAttendance,
  mockLeaveRequests,
  mockNotices,
  mockHolidays,
  mockGlobalSettings,
  mockPopups,
  mockIpSettings,
  mockBranchNetwork,
  mockAuth,
  mockLoginResponse,
  delay,
} from "./mockData";

// Mock API base URL (not used, just for compatibility)
const API_BASE_URL = "MOCK_MODE";
export { API_BASE_URL };

// In-memory storage for mock data (simulates database)
let mockDataStore = {
  employees: JSON.parse(JSON.stringify(mockEmployees)),
  attendance: JSON.parse(JSON.stringify(mockAttendance)),
  leaveRequests: JSON.parse(JSON.stringify(mockLeaveRequests)),
  notices: JSON.parse(JSON.stringify(mockNotices)),
  holidays: JSON.parse(JSON.stringify(mockHolidays)),
  globalSettings: JSON.parse(JSON.stringify(mockGlobalSettings)),
  popups: JSON.parse(JSON.stringify(mockPopups)),
  ipSettings: JSON.parse(JSON.stringify(mockIpSettings)),
  branchNetwork: JSON.parse(JSON.stringify(mockBranchNetwork)),
};

// Helper to generate unique IDs
const generateId = (array) => {
  if (!array || array.length === 0) return 1;
  return Math.max(...array.map((item) => item.id || 0)) + 1;
};

// Helper to find item by ID
const findById = (array, id) => array?.find((item) => item.id === parseInt(id));

// Helper to filter array
const filterArray = (array, predicate) => array?.filter(predicate) || [];

export const apiService = {
  // Helper to get full image URL (mock always returns placeholder)
  getImageUrl(path) {
    if (!path) return null;
    if (path.startsWith("data:")) return null;
    if (path.startsWith("blob:")) return path;
    if (path.startsWith("http")) return path;
    // For mock mode, return path as-is
    return path;
  },

  // Mock API call method
  async apiCall(endpoint, options = {}) {
    await delay(200); // Simulate network delay
    console.log(`[MOCK API] ${options.method || "GET"} ${endpoint}`);
    
    // Handle different endpoints
    if (endpoint === "/employees") {
      if (options.method === "POST") {
        const newEmployee = {
          id: generateId(mockDataStore.employees),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString(),
        };
        mockDataStore.employees.push(newEmployee);
        return newEmployee;
      }
      return mockDataStore.employees;
    }

    if (endpoint.startsWith("/employees/") && !endpoint.includes("/photo")) {
      const id = parseInt(endpoint.split("/")[2]);
      if (options.method === "PATCH") {
        const emp = findById(mockDataStore.employees, id);
        if (emp) {
          Object.assign(emp, JSON.parse(options.body));
          return emp;
        }
        throw new Error(`Employee ${id} not found`);
      }
      if (options.method === "DELETE") {
        mockDataStore.employees = mockDataStore.employees.filter(
          (e) => e.id !== id
        );
        return { success: true };
      }
      return findById(mockDataStore.employees, id);
    }

    // Attendance endpoints
    if (endpoint === "/attendance") {
      if (options.method === "POST") {
        const newAttendance = {
          id: generateId(mockDataStore.attendance),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString(),
        };
        mockDataStore.attendance.push(newAttendance);
        return newAttendance;
      }
      return mockDataStore.attendance;
    }

    if (endpoint.startsWith("/attendance/employee/")) {
      const employeeId = parseInt(endpoint.split("/")[3]);
      return filterArray(mockDataStore.attendance, (a) => a.employeeId === employeeId);
    }

    if (endpoint.startsWith("/attendance/")) {
      const id = parseInt(endpoint.split("/")[2]);
      if (options.method === "PATCH") {
        const att = findById(mockDataStore.attendance, id);
        if (att) {
          Object.assign(att, JSON.parse(options.body));
          return att;
        }
      }
      if (options.method === "DELETE") {
        mockDataStore.attendance = mockDataStore.attendance.filter(
          (a) => a.id !== id
        );
        return { success: true };
      }
      return findById(mockDataStore.attendance, id);
    }

    // Leave Requests endpoints
    if (endpoint === "/leave-requests") {
      if (options.method === "POST") {
        const newLeave = {
          id: generateId(mockDataStore.leaveRequests),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString(),
        };
        mockDataStore.leaveRequests.push(newLeave);
        return newLeave;
      }
      return mockDataStore.leaveRequests;
    }

    if (endpoint.startsWith("/leave-requests/")) {
      const parts = endpoint.split("/");
      const id = parseInt(parts[2]);

      if (endpoint.includes("/approve")) {
        const leave = findById(mockDataStore.leaveRequests, id);
        if (leave) {
          leave.status = "approved";
          leave.approvedBy = JSON.parse(options.body).approvedBy;
          return leave;
        }
      }

      if (endpoint.includes("/reject")) {
        const leave = findById(mockDataStore.leaveRequests, id);
        if (leave) {
          leave.status = "rejected";
          return leave;
        }
      }

      if (endpoint.includes("/employee/")) {
        const employeeId = parseInt(parts[3]);
        return filterArray(mockDataStore.leaveRequests, (l) => l.employeeId === employeeId);
      }

      if (options.method === "PATCH") {
        const leave = findById(mockDataStore.leaveRequests, id);
        if (leave) {
          Object.assign(leave, JSON.parse(options.body));
          return leave;
        }
      }

      if (options.method === "DELETE") {
        mockDataStore.leaveRequests = mockDataStore.leaveRequests.filter(
          (l) => l.id !== id
        );
        return { success: true };
      }

      return findById(mockDataStore.leaveRequests, id);
    }

    // Notices endpoints
    if (endpoint === "/notices" || endpoint === "/notices/active") {
      if (options.method === "POST") {
        const newNotice = {
          id: generateId(mockDataStore.notices),
          ...JSON.parse(options.body),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        mockDataStore.notices.push(newNotice);
        return newNotice;
      }
      if (endpoint === "/notices/active") {
        return filterArray(mockDataStore.notices, (n) => n.isActive);
      }
      return mockDataStore.notices;
    }

    if (endpoint.startsWith("/notices/")) {
      const id = parseInt(endpoint.split("/")[2]);

      if (endpoint.includes("/toggle")) {
        const notice = findById(mockDataStore.notices, id);
        if (notice) {
          notice.isActive = !notice.isActive;
          return notice;
        }
      }

      if (options.method === "PATCH") {
        const notice = findById(mockDataStore.notices, id);
        if (notice) {
          Object.assign(notice, JSON.parse(options.body));
          notice.updatedAt = new Date().toISOString();
          return notice;
        }
      }

      if (options.method === "DELETE") {
        mockDataStore.notices = mockDataStore.notices.filter((n) => n.id !== id);
        return { success: true };
      }

      return findById(mockDataStore.notices, id);
    }

    // Holidays endpoints
    if (endpoint === "/holidays") {
      if (options.method === "POST") {
        const newHoliday = {
          id: generateId(mockDataStore.holidays),
          ...JSON.parse(options.body),
        };
        mockDataStore.holidays.push(newHoliday);
        return newHoliday;
      }
      return mockDataStore.holidays;
    }

    if (endpoint.startsWith("/holidays/")) {
      const id = parseInt(endpoint.split("/")[2]);
      if (options.method === "PATCH") {
        const holiday = findById(mockDataStore.holidays, id);
        if (holiday) {
          Object.assign(holiday, JSON.parse(options.body));
          return holiday;
        }
      }
      if (options.method === "DELETE") {
        mockDataStore.holidays = mockDataStore.holidays.filter((h) => h.id !== id);
        return { success: true };
      }
      return findById(mockDataStore.holidays, id);
    }

    // Global Settings
    if (endpoint === "/global-settings") {
      if (options.method === "PATCH") {
        Object.assign(mockDataStore.globalSettings, JSON.parse(options.body));
      }
      return mockDataStore.globalSettings;
    }

    // Popups
    if (endpoint === "/popups") {
      if (options.method === "PATCH") {
        Object.assign(mockDataStore.popups, JSON.parse(options.body));
      }
      return mockDataStore.popups;
    }

    // IP Settings
    if (endpoint === "/ip-settings" || endpoint === "/ip-settings/active") {
      if (options.method === "POST") {
        const newIpSetting = {
          id: generateId(mockDataStore.ipSettings),
          ...JSON.parse(options.body),
        };
        mockDataStore.ipSettings.push(newIpSetting);
        return newIpSetting;
      }
      if (endpoint === "/ip-settings/active") {
        return filterArray(mockDataStore.ipSettings, (ip) => ip.isActive)[0] || null;
      }
      return mockDataStore.ipSettings;
    }

    if (endpoint.startsWith("/ip-settings/")) {
      const id = parseInt(endpoint.split("/")[2]);
      if (options.method === "PATCH") {
        const ipSetting = findById(mockDataStore.ipSettings, id);
        if (ipSetting) {
          Object.assign(ipSetting, JSON.parse(options.body));
          return ipSetting;
        }
      }
      if (options.method === "DELETE") {
        mockDataStore.ipSettings = mockDataStore.ipSettings.filter(
          (ip) => ip.id !== id
        );
        return { success: true };
      }
      return findById(mockDataStore.ipSettings, id);
    }

    // Branch Network
    if (endpoint === "/branch-network-settings") {
      if (options.method === "POST") {
        const newBranch = {
          id: generateId(mockDataStore.branchNetwork),
          ...JSON.parse(options.body),
        };
        mockDataStore.branchNetwork.push(newBranch);
        return newBranch;
      }
      return mockDataStore.branchNetwork;
    }

    if (endpoint.startsWith("/branch-network-settings/")) {
      const branch = endpoint.split("/")[2];
      if (options.method === "DELETE") {
        mockDataStore.branchNetwork = mockDataStore.branchNetwork.filter(
          (b) => b.branch !== decodeURIComponent(branch)
        );
        return { success: true };
      }
      return (
        mockDataStore.branchNetwork.find(
          (b) => b.branch === decodeURIComponent(branch)
        ) || null
      );
    }

    // Catch-all for unmapped endpoints
    console.warn(`[MOCK API] Endpoint not mapped: ${endpoint}`);
    return null;
  },

  // Employees API
  employees: {
    getAll: () => apiService.apiCall("/employees"),
    getById: (id) => apiService.apiCall(`/employees/${id}`),
    create: (data) =>
      apiService.apiCall("/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/employees/${id}`, {
        method: "DELETE",
      }),
    deleteBySuperAdmin: (id) => apiService.apiCall(`/employees/${id}/superadmin`, { method: "DELETE" }),
    updatePhoto: (id, formData) => Promise.resolve({ success: true }),
    uploadPhoto: (id, file) => Promise.resolve({ success: true }),
    getAttendanceStats: (id) => Promise.resolve({ present: 20, absent: 2, late: 1 }),
  },

  // Attendance API
  attendance: {
    getAll: () => apiService.apiCall("/attendance"),
    getById: (id) => apiService.apiCall(`/attendance/${id}`),
    create: (data) =>
      apiService.apiCall("/attendance", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/attendance/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/attendance/${id}`, {
        method: "DELETE",
      }),
    checkIn: (employeeId, data) => apiService.apiCall(`/attendance/check-in/${employeeId}`, { method: "POST", body: JSON.stringify(data) }),
    checkOut: (attendanceId, data) => apiService.apiCall(`/attendance/check-out/${attendanceId}`, { method: "POST", body: JSON.stringify(data) }),
    getReport: (params) => apiService.apiCall("/attendance/report", { silentOnError: true }),
    getByEmployee: (employeeId, params = {}) => apiService.apiCall(`/attendance/employee/${employeeId}`),
  },

  // Leave Requests API
  leaveRequests: {
    getAll: () => apiService.apiCall("/leave-requests"),
    getById: (id) => apiService.apiCall(`/leave-requests/${id}`),
    create: (data) =>
      apiService.apiCall("/leave-requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/leave-requests/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/leave-requests/${id}`, {
        method: "DELETE",
      }),
    approve: (id, data) =>
      apiService.apiCall(`/leave-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    reject: (id, data) =>
      apiService.apiCall(`/leave-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getStats: () => Promise.resolve({ pending: 2, approved: 8, rejected: 1 }),
    getByStatus: (status) => apiService.apiCall(`/leave-requests/status/${status}`, { silentOnError: true }),
    getByEmployee: (employeeId) => apiService.apiCall(`/leave-requests/employee/${employeeId}`),
  },

  // Notices API
  notices: {
    getAll: () => apiService.apiCall("/notices"),
    getById: (id) => apiService.apiCall(`/notices/${id}`),
    create: (data) =>
      apiService.apiCall("/notices", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/notices/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/notices/${id}`, {
        method: "DELETE",
      }),
    getActive: () => apiService.apiCall("/notices/active"),
    getByType: (type) => apiService.apiCall(`/notices/type/${type}`, { silentOnError: true }),
    toggleActive: (id) =>
      apiService.apiCall(`/notices/${id}/toggle`, {
        method: "POST",
      }),
    updatePhoto: (id, formData) => Promise.resolve({ success: true }),
    uploadPhoto: (id, file) => Promise.resolve({ success: true }),
  },

  auth: {
    updateAdminPhoto: (adminId, file) => Promise.resolve({ success: true }),
  },

  // IP Settings API
  ipSettings: {
    getAll: () => apiService.apiCall("/ip-settings"),
    getById: (id) => apiService.apiCall(`/ip-settings/${id}`),
    create: (data) =>
      apiService.apiCall("/ip-settings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/ip-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/ip-settings/${id}`, {
        method: "DELETE",
      }),
    getActive: () => apiService.apiCall("/ip-settings/active"),
    validate: () => Promise.resolve({ valid: true }),
    toggle: (id) => apiService.apiCall(`/ip-settings/${id}/toggle`, { method: "POST" }),
    getMyIp: () => Promise.resolve({ ip: "192.168.1.100" }),
    addAllowedIp: (id, ipAddress) => Promise.resolve({ success: true }),
    removeAllowedIp: (id, ipAddress) => Promise.resolve({ success: true }),
  },

  // Branch Network Restriction API
  branchNetwork: {
    getByBranch: (branch) => apiService.apiCall(`/branch-network-settings/${encodeURIComponent(branch)}`),
    upsert: async ({ branch, allowedIpAddress }) =>
      apiService.apiCall("/branch-network-settings", {
        method: "POST",
        body: JSON.stringify({ branch, allowedIpAddress }),
      }),
    getAll: async () => apiService.apiCall("/branch-network-settings"),
    deleteByBranch: (branch) =>
      apiService.apiCall(`/branch-network-settings/${encodeURIComponent(branch)}`, {
        method: "DELETE",
      }),
  },

  // Global Settings API
  globalSettings: {
    get: () => apiService.apiCall("/global-settings"),
    update: (data) =>
      apiService.apiCall("/global-settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Holidays API
  holidays: {
    getAll: (params) => apiService.apiCall("/holidays"),
    getById: (id) => apiService.apiCall(`/holidays/${id}`),
    create: (data) =>
      apiService.apiCall("/holidays", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiService.apiCall(`/holidays/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id) =>
      apiService.apiCall(`/holidays/${id}`, {
        method: "DELETE",
      }),
  },

  // Popups API
  popups: {
    get: () => apiService.apiCall("/popups"),
    update: (data) =>
      apiService.apiCall("/popups", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    uploadPhoto: (file) => Promise.resolve({ success: true }),
  },
};
