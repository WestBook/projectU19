import { useState } from 'react'
import type { EventFilters as FiltersState } from '@/features/events/hooks/useEventList'
import styles from './EventFilters.module.css'

interface FiltersFormValues {
  age: string
  location: string
  dateFrom: string
  dateTo: string
}

interface EventFiltersProps {
  initialFilters: FiltersState
  onApply: (filters: Partial<FiltersState>) => void
  onClear: () => void
}

const AGE_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1)

export function EventFilters({ initialFilters, onApply, onClear }: EventFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const [form, setForm] = useState<FiltersFormValues>({
    age: initialFilters.age !== undefined ? String(initialFilters.age) : '',
    location: initialFilters.location ?? '',
    dateFrom: initialFilters.dateFrom ?? '',
    dateTo: initialFilters.dateTo ?? '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleApply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onApply({
      age: form.age ? Number(form.age) : undefined,
      location: form.location.trim() || undefined,
      dateFrom: form.dateFrom || undefined,
      dateTo: form.dateTo || undefined,
      page: 0,
    })
  }

  const handleClear = () => {
    setForm({ age: '', location: '', dateFrom: '', dateTo: '' })
    onClear()
  }

  const toggleExpand = () => setIsExpanded((v) => !v)

  return (
    <div className={styles.wrapper}>
      {/* Mobile toggle header */}
      <button
        type="button"
        className={styles.toggleButton}
        onClick={toggleExpand}
        aria-expanded={isExpanded}
        aria-controls="filters-panel"
      >
        <span>篩選條件</span>
        <span
          className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ''}`}
          aria-hidden="true"
        >
          &#8250;
        </span>
      </button>

      <form
        id="filters-panel"
        className={`${styles.panel} ${isExpanded ? styles.panelOpen : styles.panelClosed}`}
        onSubmit={handleApply}
        aria-hidden={!isExpanded}
      >
        <div className={styles.fields}>
          {/* Age */}
          <div className={styles.field}>
            <label htmlFor="filter-age" className={styles.label}>
              年齡
            </label>
            <select
              id="filter-age"
              name="age"
              className={styles.select}
              value={form.age}
              onChange={handleChange}
            >
              <option value="">全部年齡</option>
              {AGE_OPTIONS.map((age) => (
                <option key={age} value={age}>
                  {age} 歲
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className={styles.field}>
            <label htmlFor="filter-location" className={styles.label}>
              地點
            </label>
            <input
              id="filter-location"
              name="location"
              type="text"
              className={styles.input}
              placeholder="輸入城市或地區"
              value={form.location}
              onChange={handleChange}
              maxLength={50}
            />
          </div>

          {/* Date From */}
          <div className={styles.field}>
            <label htmlFor="filter-date-from" className={styles.label}>
              開始日期
            </label>
            <input
              id="filter-date-from"
              name="dateFrom"
              type="date"
              className={styles.input}
              value={form.dateFrom}
              onChange={handleChange}
              max={form.dateTo || undefined}
            />
          </div>

          {/* Date To */}
          <div className={styles.field}>
            <label htmlFor="filter-date-to" className={styles.label}>
              結束日期
            </label>
            <input
              id="filter-date-to"
              name="dateTo"
              type="date"
              className={styles.input}
              value={form.dateTo}
              onChange={handleChange}
              min={form.dateFrom || undefined}
            />
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button type="submit" className={styles.applyButton}>
            套用篩選
          </button>
          <button type="button" className={styles.clearButton} onClick={handleClear}>
            清除
          </button>
        </div>
      </form>
    </div>
  )
}
