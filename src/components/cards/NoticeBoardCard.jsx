import '../../styles/Cards.css'

export default function NoticeBoardCard({ notice }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const priorityColors = {
    high: '#e31e24',
    medium: '#ff9800',
    low: '#4caf50'
  }

  return (
    <div className="notice-card card">
      <div className="notice-header">
        <div className="notice-meta">
          <span className="notice-date">{formatDate(notice.date)}</span>
          <span
            className="notice-priority"
            style={{ backgroundColor: priorityColors[notice.priority] }}
          >
            {notice.priority.charAt(0).toUpperCase() + notice.priority.slice(1)}
          </span>
        </div>
        <h3 className="notice-title">{notice.title}</h3>
      </div>

      <p className="notice-content">{notice.content}</p>

      <div className="notice-footer">
        <button className="btn-link">Read More →</button>
      </div>
    </div>
  )
}
