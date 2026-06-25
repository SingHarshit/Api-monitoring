import { useState, type FormEvent } from 'react'
import axiosClient from '../api/axiosClient'

type LoginProps = {
  onSuccess: () => void
}

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axiosClient.post('/auth/login', {
        email,
        password,
      })

      const { user, token } = response.data.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      onSuccess()
    } catch (requestError: any) {
      setError(
        requestError?.response?.data?.message ??
          'Login failed. Check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="panel hero">
        <div>
          <p className="eyebrow">JWT Login</p>
          <h1>Sign in to access your dashboard.</h1>
          <p className="hero__copy">
            This stores the token in localStorage and lets the existing Axios client send it
            automatically on future API calls.
          </p>
        </div>
      </section>

      <section className="panel surface" style={{ maxWidth: 560, margin: '0 auto' }}>
        <form onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field field--wide">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field field--wide">
              <span className="field__label">Password</span>
              <input
                className="field__input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
              />
            </label>
          </div>

          {error ? <div className="banner panel" style={{ marginTop: 16 }}>{error}</div> : null}

          <div className="modal__footer" style={{ marginTop: 20 }}>
            <button type="submit" className="button button--primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}