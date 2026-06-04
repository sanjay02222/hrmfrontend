import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { apiService } from "../../services/apiService";
import { TrashIcon, EditIcon, NoticeIcon } from "../../assets/Icons";

export default function NoticeSettings({ user }) {
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "General",
    priority: 1,
    isActive: true,
    expiryDate: "",
    author: user?.name || "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiService.notices.getAll();
      setNotices(data || []);
    } catch (error) {
      toast.error("Failed to load notices.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      type: "General",
      priority: 1,
      isActive: true,
      expiryDate: "",
      author: user?.name || "",
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditingNotice(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      let notice;
      if (editingNotice) {
        notice = await apiService.notices.update(editingNotice.id, {
          ...formData,
          priority: formData.priority ? Number(formData.priority) : undefined
        });
        toast.success("Notice updated successfully.");
      } else {
        notice = await apiService.notices.create({
          ...formData,
          priority: formData.priority ? Number(formData.priority) : undefined
        });
        toast.success("Notice created successfully.");
      }

      if (selectedFile && notice?.id) {
        await apiService.notices.uploadPhoto(notice.id, selectedFile);
        toast.success("File uploaded successfully.");
      }

      resetForm();
      loadData();
    } catch (error) {
      toast.error(error?.message || "Failed to save notice.");
      console.error(error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title || "",
      content: notice.content || "",
      type: notice.type || "General",
      priority: notice.priority || 1,
      isActive: notice.isActive !== undefined ? notice.isActive : true,
      expiryDate: notice.expiryDate ? new Date(notice.expiryDate).toISOString().split('T')[0] : "",
      author: notice.author || user?.name || "",
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete notice '${title}'?`)) return;
    try {
      await apiService.notices.delete(id);
      toast.success("Notice deleted.");
      loadData();
    } catch (error) {
      toast.error("Failed to delete notice.");
      console.error(error);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await apiService.notices.toggleActive(id);
      toast.success("Status toggled.");
      loadData();
    } catch (error) {
      toast.error("Failed to toggle status.");
      console.error(error);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Notice Settings...</div>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1000px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "0.25rem" }}>
            Notice Management
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Create and manage official notices for all employees.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-login"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
          >
            <NoticeIcon />
            Add New Notice
          </button>
        )}
      </div>

      {showAddForm && (
        <div style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "2rem", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "#1e293b" }}>
            {editingNotice ? "Edit Notice" : "Create New Notice"}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Enter notice title"
                  value={formData.title}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Content</label>
                <textarea
                  name="content"
                  required
                  placeholder="Enter notice content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="4"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}
                >
                  <option value="General">General</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white" }}
                >
                  <option value={1}>High</option>
                  <option value={2}>Medium</option>
                  <option value={3}>Low</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Expiry Date (Optional)</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Attachment / Image (Optional)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      style={{ width: "100%", padding: "10px 0", borderRadius: "8px", outline: "none" }}
                    />
                    <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>Max size 5MB. Images will be used as notice background/featured image.</p>
                  </div>
                  {editingNotice?.photo && (
                    <div style={{ flexShrink: 0 }}>
                      <p style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>Current Photo:</p>
                      <img 
                        src={apiService.getImageUrl(editingNotice.photo)} 
                        alt="Preview" 
                        style={{ width: "80px", height: "50px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e8f0" }} 
                      />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="isActive" style={{ fontSize: "0.875rem", fontWeight: "500", color: "#475569", cursor: "pointer" }}>Active and Visible</label>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
              <button 
                type="button" 
                onClick={resetForm} 
                disabled={formLoading}
                className="btn btn-secondary" 
                style={{ padding: "10px 24px", minWidth: "120px" }}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={formLoading}
                className="btn btn-login" 
                style={{ padding: "10px 24px", minWidth: "120px" }}
              >
                {formLoading ? "Saving..." : editingNotice ? "Update Notice" : "Save Notice"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Photo</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Title</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expiry</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Created</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Priority</th>
                <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notices.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                    No notices found. Click "Add New Notice" to create one.
                  </td>
                </tr>
              ) : (
                notices.map((notice) => (
                  <tr key={notice.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={{ padding: "16px" }}>
                      {notice.photo ? (
                        <img 
                          src={apiService.getImageUrl(notice.photo)} 
                          alt="Notice" 
                          style={{ width: "50px", height: "30px", objectFit: "cover", borderRadius: "4px", border: "1px solid #e2e8f0" }} 
                        />
                      ) : (
                        <div style={{ width: "50px", height: "30px", background: "#f1f5f9", borderRadius: "4px", border: "1px dashed #cbd5e1" }}></div>
                      )}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: "600", color: "#1e293b" }}>{notice.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notice.content}</div>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "6px", 
                        fontSize: "0.75rem", 
                        fontWeight: "600",
                        backgroundColor: notice.type === "Urgent" ? "#fef2f2" : notice.type === "Holiday" ? "#f0fdf4" : notice.type === "Maintenance" ? "#fffbeb" : "#eff6ff",
                        color: notice.type === "Urgent" ? "#ef4444" : notice.type === "Holiday" ? "#22c55e" : notice.type === "Maintenance" ? "#d97706" : "#3b82f6"
                      }}>
                        {notice.type}
                      </span>
                    </td>
                    <td style={{ padding: "16px" }}>
                      <div 
                        onClick={() => handleToggleStatus(notice.id)}
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "6px", 
                          cursor: "pointer",
                          color: notice.isActive ? "#22c55e" : "#94a3b8"
                        }}
                      >
                        <div style={{ 
                          width: "8px", 
                          height: "8px", 
                          borderRadius: "50%", 
                          backgroundColor: notice.isActive ? "#22c55e" : "#94a3b8" 
                        }}></div>
                        <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>{notice.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px", fontSize: "0.875rem", color: "#475569" }}>
                      {notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "16px", fontSize: "0.875rem", color: "#64748b" }}>
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "6px", 
                        fontSize: "0.75rem", 
                        fontWeight: "600",
                        backgroundColor: notice.priority === 1 ? "#fef2f2" : notice.priority === 2 ? "#fffbeb" : "#f8fafc",
                        color: notice.priority === 1 ? "#ef4444" : notice.priority === 2 ? "#d97706" : "#64748b",
                        border: "1px solid" + (notice.priority === 1 ? "#fee2e2" : notice.priority === 2 ? "#fef3c7" : "#e2e8f0")
                      }}>
                        {notice.priority === 1 ? "High" : notice.priority === 2 ? "Medium" : "Low"}
                      </span>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button 
                          onClick={() => handleEdit(notice)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", padding: "6px", borderRadius: "6px", transition: "background-color 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#eff6ff"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        <button 
                          onClick={() => handleDelete(notice.id, notice.title)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "6px", borderRadius: "6px", transition: "background-color 0.2s" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fef2f2"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
