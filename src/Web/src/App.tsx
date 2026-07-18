import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { RequireRole } from '@/auth/RequireRole'
import { ToastProvider } from '@/components/Toaster'
import { Layout } from '@/components/Layout'
import { RateLimitError } from '@/api/http'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ProductList } from '@/pages/ProductList'
import { ProductDetail } from '@/pages/ProductDetail'
import { SearchResults } from '@/pages/SearchResults'
import { Navigate } from 'react-router-dom'
import { Basket } from '@/pages/Basket'
import { Checkout } from '@/pages/Checkout'
import { Orders } from '@/pages/Orders'
import { OrderDetail } from '@/pages/OrderDetail'
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminProducts } from '@/pages/admin/AdminProducts'
import { AdminProductForm } from '@/pages/admin/AdminProductForm'
import { AdminCategories } from '@/pages/admin/AdminCategories'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Sadece 429 retry edilir (pencere 10 sn → backoff 2.5s/5s); diğer hatalar anında yüzeye çıkar.
      retry: (failureCount, error) => error instanceof RateLimitError && failureCount < 2,
      retryDelay: (attempt) => (attempt + 1) * 2500,
    },
    // Mutation'lar asla otomatik retry edilmez (429'da çift sipariş riski).
    mutations: { retry: false },
  },
})

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/products', element: <ProductList /> },
      { path: '/products/:id', element: <ProductDetail /> },
      { path: '/search', element: <SearchResults /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/basket', element: <Basket /> },
          { path: '/checkout', element: <Checkout /> },
          { path: '/orders', element: <Orders /> },
          { path: '/orders/:id', element: <OrderDetail /> },
        ],
      },
      {
        element: <RequireRole role="Admin" />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/products" replace /> },
              { path: 'products', element: <AdminProducts /> },
              { path: 'products/new', element: <AdminProductForm /> },
              { path: 'products/:id/edit', element: <AdminProductForm /> },
              { path: 'categories', element: <AdminCategories /> },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
