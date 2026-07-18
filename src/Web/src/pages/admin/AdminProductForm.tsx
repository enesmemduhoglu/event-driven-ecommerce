import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalogApi } from '@/api/catalog'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'
import { btnPrimary, btnSecondary, card, input as inputClass, linkBlue } from '@/components/ui'

interface FormState {
  name: string
  description: string
  price: string
  categoryId: string
}

const EMPTY: FormState = { name: '', description: '', price: '', categoryId: '' }

// Tek form iki mod: create (fiyat dahil POST) / edit (fiyat hariç PUT — fiyat listede ayrı PATCH).
export function AdminProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const existing = useQuery({
    queryKey: ['product', id],
    queryFn: () => catalogApi.product(id!),
    enabled: isEdit,
  })

  const [form, setForm] = useState<FormState>(EMPTY)
  useEffect(() => {
    if (existing.data)
      setForm({
        name: existing.data.name,
        description: existing.data.description,
        price: String(existing.data.price),
        categoryId: existing.data.categoryId,
      })
  }, [existing.data])

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? catalogApi.updateProduct(id!, {
            name: form.name,
            description: form.description,
            categoryId: form.categoryId,
          })
        : catalogApi.createProduct({
            name: form.name,
            description: form.description,
            price: Number(form.price),
            categoryId: form.categoryId,
          }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', product.id] })
      toast(isEdit ? 'Ürün güncellendi' : `${product.name} oluşturuldu`, 'success')
      navigate('/admin/products')
    },
    onError: (err) => toast(err.message, 'error'),
  })

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  if (isEdit && existing.isPending) return <Spinner fullPage />
  if (isEdit && existing.isError)
    return (
      <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        Ürün yüklenemedi: {existing.error.message}
      </p>
    )

  return (
    <div className={`${card} max-w-2xl p-6`}>
      <nav className="mb-4 text-sm">
        <Link to="/admin/products" className={linkBlue}>
          Ürünler
        </Link>
        {' › '}
        <span>{isEdit ? 'Düzenle' : 'Yeni Ürün'}</span>
      </nav>
      <h1 className="mb-4 text-xl font-bold">{isEdit ? `Düzenle: ${existing.data?.name}` : 'Yeni Ürün'}</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Ürün adı</span>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Açıklama</span>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Kategori</span>
            <select
              required
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Seçin…
              </option>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Fiyat (₺)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required={!isEdit}
              disabled={isEdit}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              className={`${inputClass} disabled:bg-gray-100 disabled:text-gray-400`}
              title={isEdit ? 'Fiyat, ürün listesindeki Fiyat işlemiyle değiştirilir' : undefined}
            />
            {isEdit && (
              <span className="mt-1 block text-xs text-gray-500">
                Fiyat, listedeki "Fiyat" işlemiyle ayrıca değiştirilir (ayrı PATCH endpoint'i).
              </span>
            )}
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={save.isPending} className={btnPrimary}>
            {save.isPending ? 'Kaydediliyor…' : isEdit ? 'Güncelle' : 'Oluştur'}
          </button>
          <Link to="/admin/products" className={btnSecondary}>
            Vazgeç
          </Link>
        </div>
      </form>
    </div>
  )
}
