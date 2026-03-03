import { FormField } from '@/shared/components/FormField'
import type { OrderFormData, FormErrors } from '@/features/orders/hooks/useOrderForm'
import styles from './FormSection.module.css'

interface ParentInfoFormProps {
  formData: OrderFormData
  errors: FormErrors
  serverErrors: FormErrors
  onChange: (field: keyof OrderFormData, value: string) => void
  onBlur: (field: keyof OrderFormData) => void
}

export function ParentInfoForm({
  formData,
  errors,
  serverErrors,
  onChange,
  onBlur,
}: ParentInfoFormProps) {
  const getError = (field: keyof OrderFormData) => serverErrors[field] || errors[field] || ''

  return (
    <section className={styles.section} aria-labelledby="parent-section-title">
      <h2 className={styles.sectionTitle} id="parent-section-title">
        Step 1：家長資料
      </h2>
      <div className={styles.fields}>
        <FormField label="家長姓名" required error={getError('parentName')} htmlFor="parentName">
          <input
            id="parentName"
            type="text"
            className={`${styles.input} ${getError('parentName') ? styles.inputError : ''}`}
            value={formData.parentName}
            onChange={(e) => onChange('parentName', e.target.value)}
            onBlur={() => onBlur('parentName')}
            placeholder="請輸入家長姓名"
            maxLength={50}
            autoComplete="name"
            aria-required="true"
          />
        </FormField>

        <FormField label="電子郵件" required error={getError('parentEmail')} htmlFor="parentEmail">
          <input
            id="parentEmail"
            type="email"
            className={`${styles.input} ${getError('parentEmail') ? styles.inputError : ''}`}
            value={formData.parentEmail}
            onChange={(e) => onChange('parentEmail', e.target.value)}
            onBlur={() => onBlur('parentEmail')}
            placeholder="example@mail.com"
            autoComplete="email"
            aria-required="true"
          />
        </FormField>

        <FormField
          label="手機號碼"
          required
          error={getError('parentPhone')}
          hint="10 碼，以 09 開頭（例：0912345678）"
          htmlFor="parentPhone"
        >
          <input
            id="parentPhone"
            type="tel"
            className={`${styles.input} ${getError('parentPhone') ? styles.inputError : ''}`}
            value={formData.parentPhone}
            onChange={(e) => onChange('parentPhone', e.target.value)}
            onBlur={() => onBlur('parentPhone')}
            placeholder="0912345678"
            maxLength={10}
            autoComplete="tel"
            aria-required="true"
          />
        </FormField>
      </div>
    </section>
  )
}
