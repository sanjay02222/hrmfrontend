import '../../styles/Cards.css'

export default function UserCard({ user }) {
  const statusColors = {
    'Present': '#4caf50',
    'Leave': '#ff9800',
    'Absent': '#e31e24'
  }

  return (
    <div className="user-card">
      <div className="user-avatar">{user.avatar}</div>
      <div className="user-info">
        <h4 className="user-name">{user.name}</h4>
        <p className="user-department">{user.department}</p>
      </div>
      <div
        className="user-status"
        style={{ backgroundColor: statusColors[user.status] }}
      >
        {user.status}
      </div>
    </div>
  )
}
