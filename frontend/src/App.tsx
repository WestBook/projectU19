import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EventListPage } from '@/features/events/pages/EventListPage'
import { EventDetailPage } from '@/features/events/pages/EventDetailPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/events" replace />} />
        <Route path="/events" element={<EventListPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/orders/new" element={<div>Create Order (coming soon)</div>} />
        <Route path="/admin" element={<div>Admin (coming soon)</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
