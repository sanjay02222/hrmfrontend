import '../../styles/Cards.css'

export default function DashboardCard({ item }) {
  const colorMap = {
    blue: '#005696',
    green: '#4caf50',
    orange: '#ff9800',
    red: '#e31e24'
  }

  return (
    <div
      className="dashboard-card card"
      style={{ borderTopColor: colorMap[item.color] }}
    >
      <div className="card-icon" style={{ color: colorMap[item.color] }}>
        {item.icon}
      </div>
      <h3 className="card-title">{item.title}</h3>
      <button className="btn-arrow">→</button>
    </div>
  )
}
