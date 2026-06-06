import { useState } from "react";
import "../../styles/EmployeePortal.css";

export default function EmployeeDashboard({ employee, onLogout }) {
  const [clocked, setClock] = useState(false);
  const [status, setStatus] = useState("Ready to record today's attendance.");
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  const handleClockIn = () => {
    setClock(true);
    setStatus(`Clocked In at ${new Date().toLocaleTimeString()}`);
  };

  const handleClockOut = () => {
    setClock(false);
    setStatus(`Clocked Out at ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="card portal-layout">
      <section className="portal-home">
        <div className="portal-home-hero">
          <p className="hero-kicker">Homepage</p>
          <h2>Consultancy Notice Board</h2>
          <p>
            Stay updated with the latest office notices, announcements, and
            shared photos from Grace International.
          </p>
        </div>

        <div className="homepage-section">
          <div className="homepage-header-row">
            <h3>Latest</h3>
          </div>
          <div className="empty-state">
            📰 No announcements yet. Check back soon!
          </div>
        </div>
      </section>

      <section className="portal-attendance">
        <h2>Daily Attendance</h2>
        <div className="time-display" id="clock">
          {time}
        </div>

        <div className="dashboard-employee-card">
          <div style={{ fontSize: "48px" }}>👤</div>
          <div className="dashboard-employee-meta">
            <p>
              Employee: <strong>{employee.name}</strong> (
              <span>{employee.id}</span>)
            </p>
            <p className="dashboard-greeting">
              Ready to record today's attendance.
            </p>
          </div>
        </div>

        <div className="btn-group">
          <button className="btn btn-login" onClick={handleClockIn}>
            Clock In
          </button>
          <button className="btn btn-logout" onClick={handleClockOut}>
            Clock Out
          </button>
        </div>

        <div className="portal-actions">
          <button className="btn btn-secondary">Leave Request</button>
          <button className="btn btn-secondary" onClick={onLogout}>
            Use Different Employee ID
          </button>
        </div>

        <div style={{ marginTop: "20px" }}>
          <p id="today-status" style={{ fontSize: "14px", color: "#555" }}>
            {status}
          </p>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#666" }}>
            Office Hours: 10:00 AM - 5:00 PM
          </p>
        </div>

        <div className="inline-panel recent-checkins-panel">
          <h4>Recent Check In</h4>
          <div className="recent-checkins-list">
            <div className="recent-checkin-item">
              <div className="recent-checkin-main">
                <div>👤</div>
                <div className="recent-checkin-text">
                  <strong>{employee.name}</strong>
                  <p>{employee.department} Department</p>
                </div>
              </div>
              <div className="recent-checkin-time">{time}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
