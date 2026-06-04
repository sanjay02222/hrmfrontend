import { apiService, API_BASE_URL } from "./apiService";

const MANAGED_ADMINS_KEY = "global_eye_managed_admins";

const normalizeBranch = (value) => String(value || "").trim().toLowerCase();
const BRANCHES = ["Butwal", "Kathmandu", "Pokhara", "Nepalgunj"];

const withBranchRole = (user, role) => ({
  ...user,
  role,
  branch:
    BRANCHES.find(
      (branchName) => normalizeBranch(branchName) === normalizeBranch(user?.branch),
    ) || user?.branch || "",
});

export const authService = {
  async getManagedAdmins() {
    try {
      return await this.requestWithFallback([
        { endpoint: "/auth/admins", method: "GET" },
      ]);
    } catch (error) {
      console.error("Failed to fetch managed admins:", error);
      return [];
    }
  },

  async createManagedAdmin(adminData) {
    try {
      return await this.requestWithFallback([
        { endpoint: "/auth/admins", method: "POST", body: adminData },
      ]);
    } catch (error) {
      console.error("Failed to create managed admin:", error);
      throw error;
    }
  },

  async updateManagedAdmin(adminId, updates) {
    try {
      return await this.requestWithFallback([
        { endpoint: `/auth/admins/${adminId}`, method: "PATCH", body: updates },
      ]);
    } catch (error) {
      console.error("Failed to update managed admin:", error);
      throw error;
    }
  },

  async updateManagedAdminPassword(adminId, newPassword) {
    if (!newPassword || String(newPassword).trim().length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    try {
      return await this.requestWithFallback([
        {
          endpoint: `/auth/admins/${adminId}/reset-password`,
          method: "POST",
          body: { password: String(newPassword).trim() },
        },
      ]);
    } catch (error) {
      console.error("Failed to reset managed admin password:", error);
      throw error;
    }
  },

  /** Uses apiService so FormData uploads keep cookie auth + optional Bearer (same as other API calls). */
  async updateManagedAdminPhoto(adminId, file) {
    return apiService.auth.updateAdminPhoto(adminId, file);
  },

  async deleteManagedAdmin(adminId) {
    return await this.requestWithFallback([
      { endpoint: `/auth/admins/${adminId}`, method: "DELETE" },
    ]);
  },

  setCurrentUser(user) {
    if (user) {
      // Aggressively prevent base64 and blob strings from persisting in local session
      let sanitizedUser = { ...user };
      if (sanitizedUser.photo && (sanitizedUser.photo.startsWith("data:") || sanitizedUser.photo.startsWith("blob:"))) {
        console.warn("AuthService: Stripping base64/blob image from user object before saving to localStorage.");
        delete sanitizedUser.photo;
      }
      localStorage.setItem("currentUser", JSON.stringify(sanitizedUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  },

  async requestWithFallback(candidates) {
    let lastError = null;
    const token = this.getToken();

    for (const candidate of candidates) {
      try {
        const response = await fetch(`${API_BASE_URL}${candidate.endpoint}`, {
          method: candidate.method || "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(candidate.headers || {}),
          },
          body:
            candidate.body === undefined
              ? undefined
              : JSON.stringify(candidate.body),
          credentials: "include",
        });

        if (response.ok) {
          const text = await response.text();
          return text ? JSON.parse(text) : null;
        }

        if (![404, 405].includes(response.status)) {
          throw new Error(
            candidate.errorMessage || `Request failed: ${response.status}`,
          );
        }

        lastError = new Error(`Request failed: ${response.status}`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Request failed");
  },

  // Admin login and store token in cookie
  async adminLogin(username, password) {
    try {
      console.log("AuthService: Attempting admin login for:", username);
      const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      console.log("AuthService: Admin login response status:", response.status);

      if (!response.ok) {
        throw new Error(`Admin login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("AuthService: Admin login response data:", data);

      // Store user data in localStorage for easy access
      this.setCurrentUser(data.user);
      console.log("AuthService: Admin user data stored in localStorage");

      return data.user;
    } catch (error) {
      console.error("AuthService: Admin login error:", error);
      throw error;
    }
  },

  // Super Admin login and store token in cookie
  async superAdminLogin(username, password) {
    try {
      console.log("AuthService: Attempting super admin login for:", username);
      const response = await fetch(`${API_BASE_URL}/auth/superadmin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      console.log("AuthService: Super Admin login response status:", response.status);

      if (!response.ok) {
        throw new Error(`Super Admin login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("AuthService: Super Admin login response data:", data);

      // Store user data in localStorage for easy access
      this.setCurrentUser(data.user);
      console.log("AuthService: Super Admin user data stored in localStorage");

      return data.user;
    } catch (error) {
      console.error("AuthService: Super Admin login error:", error);
      throw error;
    }
  },
  async employeeLogin(employeeId, password) {
    try {
      console.log("AuthService: Attempting employee login for:", employeeId);
      const response = await fetch(`${API_BASE_URL}/auth/employee-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: employeeId, password }),
        credentials: "include",
      });

      console.log(
        "AuthService: Employee login response status:",
        response.status,
      );

      if (!response.ok) {
        throw new Error(`Employee login failed: ${response.status}`);
      }

      const data = await response.json();
      console.log("AuthService: Employee login response data:", data);

      // Store user data in localStorage for easy access
      this.setCurrentUser(data.user);
      console.log("AuthService: Employee user data stored in localStorage");

      return data.user;
    } catch (error) {
      console.error("AuthService: Employee login error:", error);
      throw error;
    }
  },

  // Role-based login to avoid redundant API calls
  async loginWithRole(username, password, role) {
    if (role === "admin") {
      try {
        const user = await this.adminLogin(username, password);
        const normalized = withBranchRole(user, "admin");
        this.setCurrentUser(normalized);
        return normalized;
      } catch (error) {
        // Fallback check for any locally managed admins if needed (legacy support)
        const managedAdmins = await this.getManagedAdmins();
        const managedAdmin = managedAdmins.find(
          (admin) => admin.username === username && admin.password === password,
        );
        if (managedAdmin) {
          const user = withBranchRole(
            {
              id: managedAdmin.id,
              username: managedAdmin.username,
              name: managedAdmin.name,
              roleTitle: managedAdmin.role,
              phone: managedAdmin.phone,
              email: managedAdmin.email,
              photo: managedAdmin.profilePhoto,
              branch: managedAdmin.branch,
            },
            "admin",
          );
          this.setCurrentUser(user);
          return user;
        }
        throw error;
      }
    } else if (role === "superadmin") {
      const user = await this.superAdminLogin(username, password);
      const normalized = { ...user, role: "superadmin", branch: "All Branches" };
      this.setCurrentUser(normalized);
      return normalized;
    } else if (role === "employee") {
      return await this.employeeLogin(username, password);
    } else {
      return await this.login(username, password);
    }
  },

  // Generic login method (for backward compatibility)
  async login(username, password) {
    // Try admin login first, then employee login
    try {
      return await this.adminLogin(username, password);
    } catch {
      console.log("Admin login failed, trying employee login...");
      try {
        return await this.employeeLogin(username, password);
      } catch {
        console.error("Both login attempts failed");
        throw new Error("Invalid credentials");
      }
    }
  },

  // Logout by clearing cookie
  async logout() {
    try {
      console.log("AuthService: Attempting logout");
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // Clear local storage
      localStorage.removeItem("currentUser");
      console.log("AuthService: User data cleared from localStorage");

      return true;
    } catch (error) {
      console.error("AuthService: Logout error:", error);
      // Still clear local storage even if API call fails
      localStorage.removeItem("currentUser");
      console.log(
        "AuthService: User data cleared from localStorage (fallback)",
      );
      return false;
    }
  },

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem("currentUser");
      const parsed = userStr ? JSON.parse(userStr) : null;
      if (!parsed) return null;
      if (parsed.role === "admin") {
        return withBranchRole(parsed, "admin");
      }
      if (parsed.role === "superadmin") {
        return { ...parsed, role: "superadmin", branch: "All Branches" };
      }
      return parsed;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },

  async setEmployeeCredentials(employee, password, options = {}) {
    const payload = {
      employeeId: employee.employeeId,
      employeeUuid: employee.id,
      loginId: employee.employeeId,
      username: employee.employeeId,
      employeeCode: employee.employeeId,
      password,
      temporaryPassword: password,
      mustChangePassword: options.mustChangePassword ?? true,
      requirePasswordChange: options.mustChangePassword ?? true,
      forcePasswordChange: options.mustChangePassword ?? true,
    };

    return await this.requestWithFallback([
      {
        endpoint: `/employees/${employee.id}/credentials`,
        method: "PATCH",
        body: payload,
        errorMessage: "Failed to update employee credentials",
      },
      {
        endpoint: `/employees/${employee.id}/credentials`,
        method: "POST",
        body: payload,
        errorMessage: "Failed to create employee credentials",
      },
      {
        endpoint: "/auth/employee-credentials",
        method: "POST",
        body: payload,
        errorMessage: "Failed to create employee credentials",
      },
      {
        endpoint: "/auth/employee-password",
        method: "PATCH",
        body: payload,
        errorMessage: "Failed to update employee password",
      },
    ]);
  },

  async changeEmployeePassword(user, currentPassword, newPassword) {
    const payload = {
      employeeId: user?.id,
      employeeUuid: user?.id,
      loginId: user?.employeeId,
      username: user?.employeeId,
      currentPassword,
      oldPassword: currentPassword,
      newPassword,
      confirmPassword: newPassword,
    };

    const result = await this.requestWithFallback([
      {
        endpoint: "/auth/change-password",
        method: "POST",
        body: payload,
        errorMessage: "Failed to change password",
      },
      {
        endpoint: "/auth/employee/change-password",
        method: "POST",
        body: payload,
        errorMessage: "Failed to change password",
      },
      {
        endpoint: `/employees/${user?.id}/change-password`,
        method: "PATCH",
        body: payload,
        errorMessage: "Failed to change password",
      },
      {
        endpoint: `/employees/${user?.id}/credentials`,
        method: "PATCH",
        body: {
          ...payload,
          password: newPassword,
          mustChangePassword: false,
          requirePasswordChange: false,
          forcePasswordChange: false,
        },
        errorMessage: "Failed to change password",
      },
    ]);

    const currentUser = this.getCurrentUser();
    if (currentUser) {
      this.setCurrentUser({
        ...currentUser,
        mustChangePassword: false,
        requirePasswordChange: false,
        forcePasswordChange: false,
        isFirstLogin: false,
      });
    }

    return result;
  },

  async changeAdminPassword(user, currentPassword, newPassword) {
    const payload = {
      employeeId: user?.id,
      currentPassword,
      newPassword,
    };

    return await this.requestWithFallback([
      {
        endpoint: "/auth/change-admin-password",
        method: "POST",
        body: payload,
        errorMessage: "Failed to change admin password",
      },
    ]);
  },

  // Check if user is authenticated
  isAuthenticated() {
    // Check localStorage instead of cookies since we're not using JWT guards
    const userStr = localStorage.getItem("currentUser");
    return !!userStr;
  },

  // Get token for API calls
  getToken() {
    const cookies = document.cookie.split(";");
    const tokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("access_token="),
    );
    return tokenCookie ? tokenCookie.split("=")[1] : null;
  },

  // API helper with credentials
  async apiCall(endpoint, options = {}) {
    const token = this.getToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: "same-origin",
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  },
};
