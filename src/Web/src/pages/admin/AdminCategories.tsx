import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import type { CategoryDto } from '@/api/types'
import { Spinner } from '@/components/Spinner'
import { useToast } from '@/components/Toaster'
import { btnPrimary, btnSecondary, card, input as inputClass, linkBlue } from '@/components/ui'

function CategoryForm({
  initial,
  onDone,
}: {
  initial?: CategoryDto
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const save = useMutation({
    mutationFn: () =>
      initial
        ? catalogApi.updateCategory(initial.id, { name, description: description || undefined })
        : catalogApi.createCategory({ name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast(initial ? 'Kategori güncellendi' : 'Kategori oluşturuldu', 'success')
      onDone()
    },
    onError: (err) => toast(err.message, 'error'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="min-w-40 flex-1">
        <span className="mb-1 block text-sm font-medium text-gray-700">Ad</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="min-w-40 flex-[2]">
        <span className="mb-1 block text-sm font-medium text-gray-700">Açıklama (opsiyonel)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
      </label>
      <button type="submit" disabled={save.isPending} className={btnPrimary}>
        {save.isPending ? 'Kaydediliyor…' : initial ? 'Güncelle' : 'Ekle'}
      </button>
      {initial && (
        <button type="button" onClick={onDone} className={btnSecondary}>
          Vazgeç
        </button>
      )}
    </form>
  )
}

export function AdminCategories() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories })
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className={`${card} p-5`}>
        <h1 className="mb-4 text-xl font-bold">Yeni Kategori</h1>
        <CategoryForm onDone={() => undefined} />
      </div>

      <div className={`${card} p-5`}>
        <h2 className="mb-4 text-xl font-bold">Kategoriler</h2>
        {categories.isPending ? (
          <Spinner />
        ) : categories.isError ? (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            Kategoriler yüklenemedi: {categories.error.message}
          </p>
        ) : categories.data.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz kategori yok.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories.data.map((c) =>
              editingId === c.id ? (
                <li key={c.id} className="py-3">
                  <CategoryForm initial={c} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={c.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="truncate text-sm text-gray-500">{c.description}</p>}
                  </div>
                  <button onClick={() => setEditingId(c.id)} className={`text-sm ${linkBlue}`}>
                    Düzenle
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
