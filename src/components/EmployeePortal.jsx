import { useState } from 'react'
import EmployeeLogin from './auth/EmployeeLogin'
import EmployeeDashboard from './pages/EmployeeDashboard'
import '../styles/EmployeePortal.css'

export default function EmployeePortal({ isLoggedIn, currentEmployee, onLogin, onLogout }) {
  if (!isLoggedIn) {
    return <EmployeeLogin onLogin={onLogin} />
  }

  return <EmployeeDashboard employee={currentEmployee} onLogout={onLogout} />
}
