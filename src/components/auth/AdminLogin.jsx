import { useState } from "react";
import "../../styles/LoginSimple.css";

export default function AdminLogin({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Default credentials: user / user
    if (userId === "user" && password === "user") {
      setMessage("");
      onLogin();
    } else {
      setMessage("Invalid credentials. Use: user / user");
      setPassword("");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Admin Access</h2>
          <p>Grace International HR Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {message && <div className="error-message">{message}</div>}

          <div className="form-group">
            <label htmlFor="userId">Admin ID</label>
            <input
              type="text"
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter admin ID"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button className="btn-login" type="submit">
            Open Dashboard
          </button>
        </form>

        <div className="login-footer">
          <p>
            Default credentials: <strong>user / user</strong>
          </p>
          <p style={{ marginTop: "8px" }}>
            Use the admin ID and password to open the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
