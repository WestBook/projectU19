import { FormField } from '@/shared/components/FormField'
import type { OrderFormData, FormErrors } from '@/features/orders/hooks/useOrderForm'
import type { EventDetail } from '@/features/events/types'
import styles from './FormSection.module.css'

interface ChildInfoFormProps {
  formData: OrderFormData
  errors: FormErrors
  serverErrors: FormErrors
  eventDetail: EventDetail | null
  onChange: (field: keyof OrderFormData, value: string) => void
  onBlur: (field: keyof OrderFormData) => void
}

export function ChildInfoForm({
  formData,
  errors,
  serverErrors,
  eventDetail,
  onChange,
  onBlur,
}: ChildInfoFormProps) {
  const getError = (field: keyof OrderFormData) => serverErrors[field] || errors[field] || ''

  const ageHint = eventDetail
    ? `此賽事年齡範圍：${eventDetail.ageRestriction.minAge}-${eventDetail.ageRestriction.maxAge} 歲`
    : undefined

  return (
    <section className={styles.section} aria-labelledby="child-section-title">
      <h2 className={styles.sectionTitle} id="child-section-title">
        Step 2：小孩資料
      </h2>
      <div className={styles.fields}>
        <FormField label="小孩姓名" required error={getError('childName')} htmlFor="childName">
          <input
            id="childName"
            type="text"
            className={`${styles.input} ${getError('childName') ? styles.inputError : ''}`}
            value={formData.childName}
            onChange={(e) => onChange('childName', e.target.value)}
            onBlur={() => onBlur('childName')}
            placeholder="請輸入小孩姓名"
            maxLength={50}
            aria-required="true"
          />
        </FormField>

        <FormField
          label="出生日期"
          required
          error={getError('childBirthDate')}
          hint={ageHint}
          htmlFor="childBirthDate"
        >
          <input
            id="childBirthDate"
            type="date"
            className={`${styles.input} ${getError('childBirthDate') ? styles.inputError : ''}`}
            value={formData.childBirthDate}
            onChange={(e) => onChange('childBirthDate', e.target.value)}
            onBlur={() => onBlur('childBirthDate')}
            max={new Date().toISOString().split('T')[0]}
            aria-required="true"
          />
        </FormField>

        <FormField label="性別（選填）" htmlFor="childGender-male">
          <div className={styles.radioGroup} role="radiogroup" aria-label="小孩性別">
            {(
              [
                { value: 'MALE', label: '男' },
                { value: 'FEMALE', label: '女' },
                { value: 'OTHER', label: '其他' },
              ] as const
            ).map(({ value, label }) => (
              <label key={value} className={styles.radioLabel}>
                <input
                  id={`childGender-${value.toLowerCase()}`}
                  type="radio"
                  name="childGender"
                  value={value}
                  checked={formData.childGender === value}
                  onChange={() => onChange('childGender', value)}
                />
                {label}
              </label>
            ))}
            {formData.childGender && (
              <button
                type="button"
                onClick={() => onChange('childGender', '')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gray-400)',
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  padding: '0 var(--spacing-2)',
                  minHeight: '44px',
                }}
              >
                清除
              </button>
            )}
          </div>
        </FormField>
      </div>
    </section>
  )
}
