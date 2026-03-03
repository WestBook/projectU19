# API Client Layer

## Architecture

```
src/api/
  client.ts      # Axios instance with interceptors and ApiError class
  eventsApi.ts   # GET /api/events, GET /api/events/:id
  ordersApi.ts   # POST /api/orders
  adminApi.ts    # GET/POST /api/admin/events (token injected automatically)
  healthApi.ts   # GET /health
```

## Error Handling

All API errors are normalized into `ApiError`:

```typescript
import { ApiError } from '@/api/client'

try {
  const result = await getEventById('123')
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.code) // e.g. "EVENT_NOT_FOUND"
    console.error(err.message) // human-readable message
    console.error(err.traceId) // for support/debugging
    console.error(err.statusCode) // HTTP status
    console.error(err.details) // field-level validation errors (optional)
  }
}
```

## Usage Examples

### Query event list

```typescript
import { useApi } from '@/shared/hooks/useApi'
import { getEvents } from '@/api/eventsApi'

function EventList() {
  const { data, loading, error, execute, retry } = useApi(getEvents)

  useEffect(() => {
    void execute({ age: 10 })
  }, [execute])

  if (loading) return <div>載入中...</div>
  if (error) return <button onClick={retry}>重試</button>

  return <ul>{data?.data.map(e => <li key={e.id}>{e.name}</li>)}</ul>
}
```

### Use the pre-built filter-aware hook

```typescript
import { useEventList } from '@/features/events/hooks/useEventList'

function EventListPage() {
  const { events, pageInfo, loading, error, filters, setFilters, retry } = useEventList()

  // Change filters — triggers automatic refetch
  const handleLocationChange = (location: string) => setFilters({ location, page: 0 })

  if (loading) return <div>載入中...</div>
  if (error) return <button onClick={retry}>重試</button>
  if (!events?.length) return <div>目前沒有賽事</div>

  return (
    <>
      <ul>{events.map(e => <li key={e.id}>{e.name}</li>)}</ul>
      <p>共 {pageInfo?.totalElements} 筆</p>
    </>
  )
}
```

### Create an order

```typescript
import { useApi } from '@/shared/hooks/useApi'
import { createOrder } from '@/api/ordersApi'

function CheckoutForm() {
  const { loading, error, execute } = useApi(createOrder)

  const handleSubmit = async () => {
    const result = await execute({
      eventId: 'evt-001',
      parent: { name: '王小明', email: 'wang@example.com', phone: '0912345678' },
      child:  { name: '王小美', birthDate: '2018-06-15' },
    })
    if (result) console.log('Order created:', result.data.id)
  }

  return <button onClick={handleSubmit} disabled={loading}>報名</button>
}
```

### Admin: create an event (token is auto-injected)

```typescript
import { useApi } from '@/shared/hooks/useApi'
import { adminCreateEvent } from '@/api/adminApi'

const { execute } = useApi(adminCreateEvent)
await execute({
  name: '2026 春季親子路跑',
  ageMin: 5,
  ageMax: 12,
  startTime: '2026-04-01T09:00:00',
  location: '台北大安森林公園',
  capacity: 200,
  fee: 500,
})
```

### Check service health

```typescript
import { getHealth } from '@/api/healthApi'

const health = await getHealth()
console.log(health.status) // 'UP'
console.log(health.components.database.status) // 'UP'
```

## Environment Variables

| Variable            | Description                   | Example                  |
| ------------------- | ----------------------------- | ------------------------ |
| `VITE_API_BASE_URL` | Backend base URL              | `http://localhost:8080`  |
| `VITE_ADMIN_TOKEN`  | Admin token for X-Admin-Token | `demo-admin-secret-2026` |

Copy `.env.example` to `.env.local` and fill in the values.
