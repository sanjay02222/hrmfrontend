import '../../styles/Hero.css'

export default function Hero({ title = 'Consultancy Notice Board', subtitle = 'Stay updated with the latest office notices, announcements, and shared photos from Grace International.' }) {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-kicker">Homepage</p>
        <h2 className="hero-title">{title}</h2>
        <p className="hero-subtitle">{subtitle}</p>
      </div>
      <div className="hero-image">
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#e8f4f8" />
          <circle cx="200" cy="150" r="80" fill="#0066cc" opacity="0.3" />
          <circle cx="100" cy="100" r="40" fill="#22c55e" opacity="0.2" />
          <circle cx="300" cy="200" r="50" fill="#0066cc" opacity="0.2" />
          <path d="M 50 250 Q 200 150, 350 250" stroke="#0066cc" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </section>
  )
}
