import '../../styles/Cards.css'

export default function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: '#005696',
    green: '#4caf50',
    purple: '#9c27b0',
    orange: '#ff9800',
    red: '#e31e24'
  }

  return (
    <div className="stat-card card" style={{ borderTopColor: colorMap[color] }}>
      <div className="stat-icon" style={{ color: colorMap[color] }}>
        {icon}
      </div>
      <div className="stat-content">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  )
}
