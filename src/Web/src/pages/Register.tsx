import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'

import { btnPrimary, card, input as inputClass, linkBlue } from '@/components/ui'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-sm">
      <p className="mb-4 text-center text-2xl font-bold">
        e-ticaret<span className="text-[#ff9900]">.dev</span>
      </p>
      <form onSubmit={onSubmit} className={`${card} space-y-4 p-6`}>
        <h1 className="text-2xl font-medium">Hesap oluştur</h1>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Ad</span>
            <input
              required
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Soyad</span>
            <input
              required
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">E-posta</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Şifre</span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-gray-500">En az 8 karakter.</span>
        </label>
        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full`}>
          {submitting ? 'Kayıt yapılıyor…' : 'Kayıt Ol'}
        </button>
        <p className="text-center text-sm text-gray-600">
          Zaten hesabınız var mı?{' '}
          <Link to="/login" className={linkBlue}>
            Giriş yapın
          </Link>
        </p>
      </form>
    </div>
  )
}
