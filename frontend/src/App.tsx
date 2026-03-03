import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EventListPage } from '@/features/events/pages/EventListPage'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'
import { OrderFormPage } from '@/features/orders/pages/OrderFormPage'
import { AdminEventsPage } from '@/features/admin/pages/AdminEventsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/orders/new" element={<OrderFormPage />} />
        <Route path="/admin" element={<AdminEventsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
