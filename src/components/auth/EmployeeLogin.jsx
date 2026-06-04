import { useState } from "react";
import "../../styles/Login.css";

export default function EmployeeLogin({ onLogin }) {
  const [attendanceId, setAttendanceId] = useState("");
  const [message, setMessage] = useState("");

  // Mock employee data
  const employees = [
    { id: "GE-2024-01", name: "John Doe", department: "IT" },
    { id: "GE-2024-02", name: "Jane Smith", department: "HR" },
    { id: "GE-2024-03", name: "Mike Johnson", department: "Finance" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const employee = employees.find(
      (emp) => emp.id === attendanceId.toUpperCase(),
    );

    if (employee) {
      setMessage("");
      onLogin(employee);
    } else {
      setMessage("Invalid attendance ID. Please try again.");
      setAttendanceId("");
    }
  };

  return (
    <div className="card portal-layout">
      <section className="portal-home">
        <div className="portal-home-hero">
          <p className="hero-kicker">Homepage</p>
          <h2>Consultancy Notice Board</h2>
          <p>
            Stay updated with the latest office notices, announcements, and
            shared photos from Global Eye.
          </p>
        </div>

        <div className="homepage-section">
          <div className="homepage-header-row">
            <h3>Latest News</h3>
          </div>
          <div className="empty-state">
            📰 No announcements yet. Check back soon!
          </div>
        </div>
      </section>

      <section className="portal-attendance">
        <h2>Daily Attendance</h2>
        <div className="time-display" id="clock">
          {new Date().toLocaleTimeString()}
        </div>

        <div className="employee-login-form">
          <p>Enter your attendance ID to clock in/out:</p>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                value={attendanceId}
                onChange={(e) => setAttendanceId(e.target.value)}
                placeholder="e.g. GE-2024-01"
                style={{ padding: "10px", fontSize: "16px", width: "220px" }}
              />
              <button className="btn btn-login" type="submit">
                Submit
              </button>
            </div>
          </form>
          {message && (
            <p
              id="login-message"
              style={{ marginTop: "12px", color: "#d32f2f" }}
            >
              {message}
            </p>
          )}
          <div className="portal-note">
            Each attendance entry signs out automatically after submission, so
            the next employee can enter their own ID right away.
          </div>
        </div>
      </section>
    </div>
  );
}
