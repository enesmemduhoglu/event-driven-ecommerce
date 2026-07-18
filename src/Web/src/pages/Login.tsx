import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { ApiError } from '@/api/http'
import { btnPrimary, card, input as inputClass, linkBlue } from '@/components/ui'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'E-posta veya şifre hatalı.'
          : err instanceof Error
            ? err.message
            : 'Giriş başarısız.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <p className="mb-4 text-center text-2xl font-bold">
        e-ticaret<span className="text-brand">.dev</span>
      </p>
      <form onSubmit={onSubmit} className={`${card} space-y-4 p-6`}>
        <h1 className="text-2xl font-medium">Giriş yap</h1>
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">E-posta</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Şifre</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
        <p className="text-center text-sm text-gray-600">
          Hesabınız yok mu?{' '}
          <Link to="/register" className={linkBlue}>
            Kayıt olun
          </Link>
        </p>
      </form>
      <p className="mt-4 text-center text-xs text-gray-500">
        Demo admin: admin@ecommerce.dev / Admin123!
      </p>
    </div>
  )
}
