/**
 * Backend origin (JSON API + `/uploads/...` static files). Flip the active line below.
 * `authService` imports this — change only here.
 */
// const API_BASE_URL = "http://localhost:3000";
const API_BASE_URL = "https://hrmapi.globaleyeedu.com.np";

export { API_BASE_URL };

const getAccessTokenFromCookie = () => {
  if (typeof document === "undefined") return null;
  const tokenCookie = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("access_token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
};

/** Multipart field name must match backend multer: `photo` (see globaleye backend controllers). */
function buildPhotoFormData(file, fieldName = "photo") {
  if (!(file instanceof Blob)) {
    throw new Error("Image upload requires a File or Blob");
  }
  const formData = new FormData();
  const name =
    file instanceof File &&
    typeof file.name === "string" &&
    file.name.trim()
      ? file.name
      : "upload.jpg";
  formData.append(fieldName, file, name);
  return formData;
}

export const apiService = {
  // Helper to get full image URL
  getImageUrl(path) {
    if (!path) return null;

    // Diagnostic logging to catch remaining base64/blob usage in production
    if (path.startsWith("data:")) {
      console.warn("API Service: Suppressing legacy base64 image string.");
      return null;
    }

    if (path.startsWith("blob:")) {
      // Blob URLs are temporary and fine for previews, but should not be persisted
      return path;
    }

    if (path.startsWith("http")) return path;

    // Prepend API_BASE_URL if it's a relative path starting with /uploads
    // Ensure nested paths like /uploads/admins/xyz.jpg are handled
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  },

  // Generic API call method
  async apiCall(endpoint, options = {}) {
    try {
      const {
        silentOnError = false,
        headers: callerHeaders,
        ...requestOptions
      } = options;
      if (!silentOnError) {
        console.log(`API Service: Calling ${endpoint}`);
      }
      const token = getAccessTokenFromCookie();
      const hasBody = requestOptions.body !== undefined && requestOptions.body !== null;
      const isFormData =
        typeof FormData !== "undefined" &&
        hasBody &&
        requestOptions.body instanceof FormData;

      const defaultHeaders = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Never spread `options` after `headers` — `headers: {}` would replace merged auth headers.
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...requestOptions,
        credentials: "include",
        headers: {
          ...defaultHeaders,
          ...(callerHeaders || {}),
        },
      });

      if (!silentOnError) {
        console.log(`API Service: ${endpoint} response status:`, response.status);
      }

      if (!response.ok) {
        const errorText = await response.text();
        let backendMessage = "";
        if (errorText) {
          try {
            const parsed = JSON.parse(errorText);
            backendMessage =
              parsed?.message ||
              parsed?.error ||
              (typeof parsed === "string" ? parsed : "");
          } catch {
            backendMessage = errorText;
          }
        }
        throw new Error(
          backendMessage
            ? `API call failed: ${response.status} - ${backendMessage}`
            : `API call failed: ${response.status}`,
        );
      }

      const text = await response.text();
      if (!silentOnError) {
        console.log(`API Service: ${endpoint} response text:`, text);
      }

      // Handle empty responses
      if (!text) {
        if (!silentOnError) {
          console.log(`API Service: ${endpoint} returned empty response`);
        }
        return null;
      }

      try {
        const data = JSON.parse(text);
        if (!silentOnError) {
          console.log(`API Service: ${endpoint} response data:`, data);
        }
        return data;
      } catch (parseError) {
        console.error(
          `API Service: JSON parse error for ${endpoint}:`,
          parseError,
        );
        throw new Error(`Invalid JSON response from ${endpoint}`);
      }
    } catch (error) {
      if (!options.silentOnError) {
        console.error(`API Service: Error calling ${endpoint}:`, error);
      }
      throw error;
    }
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
    deleteBySuperAdmin: (id) =>
      apiService.apiCall(`/employees/${id}/superadmin`, {
        method: "DELETE",
      }),
    updatePhoto: (id, formData) =>
      apiService.apiCall(`/employees/${id}/photo`, {
        method: "PATCH",
        body: formData,
      }),
    /** PATCH multipart field `photo` → backend saves compressed JPEG under /uploads/employees/ */
    uploadPhoto: (id, file) =>
      apiService.apiCall(`/employees/${id}/photo`, {
        method: "PATCH",
        body: buildPhotoFormData(file, "photo"),
      }),
    getAttendanceStats: (id) =>
      apiService.apiCall(`/employees/${id}/attendance-stats`),
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
    checkIn: (employeeId, data) =>
      apiService.apiCall(`/attendance/check-in/${employeeId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    checkOut: (attendanceId, data) =>
      apiService.apiCall(`/attendance/check-out/${attendanceId}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getReport: (params) => {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));
      const queryString = new URLSearchParams(cleanParams).toString();
      return apiService.apiCall(`/attendance/report?${queryString}`);
    },
    getByEmployee: (employeeId, params = {}) => {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));
      const queryString = new URLSearchParams(cleanParams).toString();
      const url = `/attendance/employee/${employeeId}${queryString ? `?${queryString}` : ""}`;
      return apiService.apiCall(url);
    },
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
    getStats: () => apiService.apiCall("/leave-requests/stats"),
    getByStatus: (status) =>
      apiService.apiCall(`/leave-requests/status/${status}`),
    getByEmployee: (employeeId) =>
      apiService.apiCall(`/leave-requests/employee/${employeeId}`),
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
    getByType: (type) => apiService.apiCall(`/notices/type/${type}`),
    toggleActive: (id) =>
      apiService.apiCall(`/notices/${id}/toggle`, {
        method: "POST",
      }),
    updatePhoto: (id, formData) =>
      apiService.apiCall(`/notices/${id}/photo`, {
        method: "PATCH",
        body: formData,
      }),
    /** PATCH multipart field `photo` (backend also accepts `file`). */
    uploadPhoto: (id, file) =>
      apiService.apiCall(`/notices/${id}/photo`, {
        method: "PATCH",
        body: buildPhotoFormData(file, "photo"),
      }),
  },

  auth: {
    /** PATCH multipart field `photo` for managed admin / executive profile image */
    updateAdminPhoto: (adminId, file) =>
      apiService.apiCall(`/auth/admins/${adminId}/photo`, {
        method: "PATCH",
        body: buildPhotoFormData(file, "photo"),
      }),
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
    validate: () =>
      apiService.apiCall("/ip-settings/validate", {
        method: "POST",
      }),
    toggle: (id) => apiService.apiCall(`/ip-settings/${id}/toggle`, { method: "POST" }),
    getMyIp: () => apiService.apiCall("/ip-settings/my-ip"),
    addAllowedIp: (id, ipAddress) =>
      apiService.apiCall(`/ip-settings/${id}/add-ip`, {
        method: "POST",
        body: JSON.stringify({ ipAddress }),
      }),
    removeAllowedIp: (id, ipAddress) =>
      apiService.apiCall(`/ip-settings/${id}/remove-ip`, {
        method: "POST",
        body: JSON.stringify({ ipAddress }),
      }),
  },

  // Branch Network Restriction API
  branchNetwork: {
    getByBranch: async (branch) => {
      const safeBranch = encodeURIComponent(String(branch || "").trim());
      try {
        return await apiService.apiCall(`/branch-network-settings/${safeBranch}`, {
          silentOnError: true,
        });
      } catch {
        try {
          return await apiService.apiCall(`/branch-network-settings?branch=${safeBranch}`, {
            silentOnError: true,
          });
        } catch {
          // Backward compatible fallback: use active ip settings if dedicated endpoint is unavailable.
          const active = await apiService.apiCall("/ip-settings/active", {
            silentOnError: true,
          });
          return active || null;
        }
      }
    },
    upsert: async ({ branch, allowedIpAddress }) => {
      const payload = {
        branch: String(branch || "").trim(),
        allowedIpAddress: String(allowedIpAddress || "").trim(),
      };
      try {
        return await apiService.apiCall("/branch-network-settings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        return await apiService.apiCall("/ip-settings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    getAll: async () => {
      return await apiService.apiCall("/branch-network-settings");
    },
    deleteByBranch: async (branch) => {
      const safeBranch = encodeURIComponent(String(branch || "").trim());
      try {
        return await apiService.apiCall(`/branch-network-settings/${safeBranch}`, {
          method: "DELETE",
        });
      } catch {
        const current = await apiService.branchNetwork.getByBranch(branch);
        if (current?.id) {
          return await apiService.ipSettings.delete(current.id);
        }
        return null;
      }
    },
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
    getAll: (params) => {
      const queryString = new URLSearchParams(params || {}).toString();
      return apiService.apiCall(`/holidays${queryString ? `?${queryString}` : ""}`);
    },
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
    uploadPhoto: (file) =>
      apiService.apiCall("/popups/photo", {
        method: "PATCH",
        body: buildPhotoFormData(file, "photo"),
      }),
  },
};
