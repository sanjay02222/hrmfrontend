import '../../styles/Cards.css'

export default function AttendanceCard({ attendance }) {
  const attendancePercent = (attendance.thisMonth / attendance.totalDays) * 100

  return (
    <div className="attendance-card card">
      <div className="card-header">
        <h3>March 2026</h3>
      </div>

      <div className="attendance-status">
        <div className="status-badge present">
          {attendance.today}
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-label">
          <span>Monthly Attendance</span>
          <span className="progress-value">{attendance.thisMonth}/{attendance.totalDays}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${attendancePercent}%` }}></div>
        </div>
        <div className="progress-percent">{attendancePercent.toFixed(0)}%</div>
      </div>

      <div className="attendance-actions">
        <button className="btn btn-primary">Mark Attendance</button>
        <button className="btn btn-secondary">View History</button>
      </div>
    </div>
  )
}
