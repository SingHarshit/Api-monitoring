import { useEffect, useState } from 'react'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import './App.css'

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  useEffect(() => {
    setToken(localStorage.getItem('token'))
  }, [])

  if (!token) {
    return (
      <Login
        onSuccess={() => {
          setToken(localStorage.getItem('token'))
        }}
      />
    )
  }

  return <Dashboard />
}