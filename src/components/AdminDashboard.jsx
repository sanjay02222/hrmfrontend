import { useState } from 'react'
import AdminLogin from './auth/AdminLogin'
import AdminDashboardView from './pages/AdminDashboardView'
import '../styles/AdminDashboard.css'

export default function AdminDashboard({ isLoggedIn, onLogin, onLogout }) {
  if (!isLoggedIn) {
    return <div className="card"><AdminLogin onLogin={onLogin} /></div>
  }

  return <AdminDashboardView onLogout={onLogout} />
}
