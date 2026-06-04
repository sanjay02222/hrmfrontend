import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { apiService } from "../../services/apiService";
import { TrashIcon, EditIcon } from "../../assets/Icons";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HolidaySettings({ onSettingsUpdated }) {
  const [loading, setLoading] = useState(true);
  const [weekOffs, setWeekOffs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    startDate: "",
    endDate: "",
    title: "",
    description: "",
  });
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleDateClick = (dateStr) => {
    setHolidayForm({
      startDate: dateStr,
      endDate: dateStr,
      title: "",
      description: "",
    });
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('holiday-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, holidaysRes] = await Promise.all([
        apiService.globalSettings.get(),
        apiService.holidays.getAll(),
      ]);
      setWeekOffs(settingsRes?.weekOffs || ["Saturday"]);
      setHolidays(holidaysRes || []);
    } catch (error) {
      toast.error("Failed to load holiday settings.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleWeekOff = async (day) => {
    let newWeekOffs = [...weekOffs];
    if (newWeekOffs.includes(day)) {
      newWeekOffs = newWeekOffs.filter((d) => d !== day);
    } else {
      newWeekOffs.push(day);
    }
    setWeekOffs(newWeekOffs);
    try {
      await apiService.globalSettings.update({ weekOffs: newWeekOffs });
      toast.success(`${day} is now ${newWeekOffs.includes(day) ? "a week-off" : "a working day"}.`);
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      toast.error("Failed to update week-offs.");
      console.error(error);
      setWeekOffs(weekOffs); // revert
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.startDate || !holidayForm.endDate || !holidayForm.title) {
      toast.error("Start Date, End Date, and Title are required.");
      return;
    }
    if (holidayForm.startDate > holidayForm.endDate) {
      toast.error("Start Date cannot be later than End Date.");
      return;
    }
    try {
      await apiService.holidays.create(holidayForm);
      toast.success("Holiday added successfully.");
      setHolidayForm({ startDate: "", endDate: "", title: "", description: "" });
      setShowAddForm(false);
      loadData();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      toast.error("Failed to add holiday.");
      console.error(error);
    }
  };

  const handleDeleteHoliday = async (id, title) => {
    if (!window.confirm(`Delete holiday '${title}'?`)) return;
    try {
      await apiService.holidays.delete(id);
      toast.success("Holiday deleted.");
      loadData();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (error) {
      toast.error("Failed to delete holiday.");
      console.error(error);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading Holiday Settings...</div>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", animation: "fadeIn 0.4s ease-out" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "1rem" }}>
          Weekly Off Days
        </h2>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
          Select the days that align with your company's weekly off schedule. Attendance is not expected on these days.
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = weekOffs.includes(day);
            return (
              <div
                key={day}
                onClick={() => handleToggleWeekOff(day)}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s ease",
                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                  color: isSelected ? "#1d4ed8" : "#475569",
                  boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.15)" : "0 2px 4px rgba(0,0,0,0.02)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "4px",
                    border: isSelected ? "none" : "2px solid #cbd5e1",
                    backgroundColor: isSelected ? "#2563eb" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "2rem 0" }}></div>

      <div className="holiday-section" style={{ marginBottom: "2rem", animation: "fadeIn 0.4s ease-out" }}>
        <div className="holiday-cal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "0.25rem" }}>Holiday Calendar</h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Click on any date to add a holiday.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}>&lt; Prev</button>
            <span style={{ fontWeight: "600", fontSize: "1rem", minWidth: "110px", textAlign: "center", color: "#0f172a" }}>
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}>Next &gt;</button>
          </div>
        </div>

        <div className="holiday-calendar-wrap" style={{ border: "1px solid #e2e8f0", borderRadius: "16px", overflowX: "auto", backgroundColor: "#f8fafc", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)", padding: "12px", paddingBottom: "16px" }}>
          <div className="holiday-calendar-inner">
            <div className="holiday-cal-days-header" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="holiday-cal-day-label" style={{ padding: "6px 2px", textAlign: "center", fontWeight: "700", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="holiday-cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
              {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="holiday-cal-cell" style={{ borderRadius: "8px", backgroundColor: "transparent" }}></div>
              ))}
              {Array.from({ length: getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()) }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                
                const dayOfWeekName = DAYS_OF_WEEK[new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay()];
                const isWeekOffDay = weekOffs.includes(dayOfWeekName);
                const holidayObj = holidays.find(h => {
                  const s = String(h.startDate || "").slice(0, 10);
                  const e = String(h.endDate || "").slice(0, 10);
                  return dateStr >= s && dateStr <= e;
                });
                
                const isToday = dateStr === new Date().toISOString().slice(0,10);
                
                return (
                  <div 
                    key={day} 
                    onClick={() => handleDateClick(dateStr)}
                    className="holiday-cal-cell"
                    style={{ 
                      padding: "6px", 
                      borderRadius: "8px",
                      border: isToday ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      position: "relative",
                      transition: "all 0.2s ease",
                      backgroundColor: holidayObj ? "#eff6ff" : isWeekOffDay ? "#f1f5f9" : "#ffffff",
                      boxShadow: holidayObj ? "0 2px 4px rgba(59, 130, 246, 0.1)" : "0 1px 2px rgba(0,0,0,0.02)",
                      display: "flex",
                      flexDirection: "column",
                      boxSizing: "border-box",
                      transform: "translateY(0)"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 8px -2px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = holidayObj ? "0 2px 4px rgba(59, 130, 246, 0.1)" : "0 1px 2px rgba(0,0,0,0.02)"; }}
                  >
                    <span style={{ 
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center", 
                      width: "26px", 
                      height: "26px", 
                      borderRadius: "50%", 
                      backgroundColor: isToday ? "#3b82f6" : "transparent",
                      color: isToday ? "#ffffff" : holidayObj ? "#1d4ed8" : isWeekOffDay ? "#94a3b8" : "#334155",
                      fontWeight: isToday ? "700" : "600",
                      alignSelf: "flex-start",
                      fontSize: "0.85rem",
                      marginBottom: "auto"
                    }}>
                      {day}
                    </span>
                    {holidayObj && (
                      <div 
                        style={{ 
                          fontSize: "0.65rem", 
                          fontWeight: "700", 
                          backgroundColor: "#3b82f6", 
                          color: "white", 
                          padding: "2px 6px", 
                          borderRadius: "4px", 
                          overflow: "hidden", 
                          whiteSpace: "nowrap", 
                          textOverflow: "ellipsis", 
                          marginTop: "4px",
                          textAlign: "center",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }} 
                        title={holidayObj.title}
                      >
                        {holidayObj.title.length > 8 ? holidayObj.title.substring(0, 7) + '..' : holidayObj.title}
                      </div>
                    )}
                    {isWeekOffDay && !holidayObj && (
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", textAlign: "center", marginTop: "4px" }}>
                        Off
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "2rem 0" }}></div>

      <div id="holiday-form-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", marginBottom: "0.25rem" }}>
              Public Holidays & Festival Leaves
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
              Add specific dates where employees are officially off work.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-login"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Holiday
          </button>
        </div>

        {showAddForm && (
          <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "2rem", animation: "slideDown 0.3s ease-out" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>Add Holiday Details</h3>
            <form onSubmit={handleAddHoliday} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="holiday-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>From</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.startDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, startDate: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>To</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.endDate}
                    onChange={(e) => setHolidayForm({ ...holidayForm, endDate: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Title (e.g. Dashain)</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter holiday title"
                    value={holidayForm.title}
                    onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "500", color: "#475569", marginBottom: "6px" }}>Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter description"
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "4px" }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddForm(false);
                    setHolidayForm({ startDate: "", endDate: "", title: "", description: "" });
                  }} 
                  className="btn btn-secondary" 
                  style={{ padding: "10px 24px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-login" style={{ padding: "10px 24px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        )}

        {holidays.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8fafc", borderRadius: "12px", color: "#64748b", border: "1px dashed #cbd5e1" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px" }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>No special holidays configured yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {holidays.map((h) => {
               const start = new Date(h.startDate);
               const end = new Date(h.endDate);
               const startFormatted = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
               const endFormatted = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
               const isSameDay = h.startDate === h.endDate;
               const displayDate = isSameDay ? startFormatted : `${startFormatted} - ${endFormatted}`;
               const dayOfWeek = start.toLocaleDateString("en-US", { weekday: "long" }) + (isSameDay ? "" : ` to ${end.toLocaleDateString("en-US", { weekday: "long" })}`);
               
               return (
                <div key={h.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative" }}>
                  <button
                    onClick={() => handleDeleteHoliday(h.id, h.title)}
                    style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px" }}
                    title="Delete Holiday"
                  >
                    <TrashIcon />
                  </button>
                  <span style={{ display: "inline-block", backgroundColor: "#eff6ff", color: "#2563eb", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", marginBottom: "8px", width: "max-content" }}>
                    {dayOfWeek}
                  </span>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", margin: "0 0 4px 0", color: "#0f172a" }}>{h.title}</h4>
                  <p style={{ color: "#475569", fontSize: "0.95rem", margin: "0 0 12px 0", fontWeight: "500" }}>{displayDate}</p>
                  {h.description && (
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0", display: "-webkit-box", WebkitLineClamp: "2", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {h.description}
                    </p>
                  )}
                </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
