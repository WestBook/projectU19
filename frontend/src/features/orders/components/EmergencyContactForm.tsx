import { FormField } from '@/shared/components/FormField'
import type { OrderFormData, FormErrors } from '@/features/orders/hooks/useOrderForm'
import styles from './FormSection.module.css'

interface EmergencyContactFormProps {
  formData: OrderFormData
  errors: FormErrors
  serverErrors: FormErrors
  onChange: (field: keyof OrderFormData, value: string) => void
  onBlur: (field: keyof OrderFormData) => void
}

export function EmergencyContactForm({
  formData,
  errors,
  serverErrors,
  onChange,
  onBlur,
}: EmergencyContactFormProps) {
  const getError = (field: keyof OrderFormData) => serverErrors[field] || errors[field] || ''

  // Determine if either field is partially filled (to show cross-field hints)
  const hasName = formData.emergencyName.trim().length > 0
  const hasPhone = formData.emergencyPhone.trim().length > 0

  return (
    <section className={styles.section} aria-labelledby="emergency-section-title">
      <h2 className={styles.sectionTitle} id="emergency-section-title">
        Step 3：緊急聯絡人（選填）
      </h2>
      <div className={styles.fields}>
        <FormField
          label="姓名"
          required={hasPhone}
          error={getError('emergencyName')}
          htmlFor="emergencyName"
        >
          <input
            id="emergencyName"
            type="text"
            className={`${styles.input} ${getError('emergencyName') ? styles.inputError : ''}`}
            value={formData.emergencyName}
            onChange={(e) => onChange('emergencyName', e.target.value)}
            onBlur={() => onBlur('emergencyName')}
            placeholder="緊急聯絡人姓名"
            maxLength={50}
          />
        </FormField>

        <FormField
          label="電話"
          required={hasName}
          error={getError('emergencyPhone')}
          hint="10 碼，以 09 開頭（例：0912345678）"
          htmlFor="emergencyPhone"
        >
          <input
            id="emergencyPhone"
            type="tel"
            className={`${styles.input} ${getError('emergencyPhone') ? styles.inputError : ''}`}
            value={formData.emergencyPhone}
            onChange={(e) => onChange('emergencyPhone', e.target.value)}
            onBlur={() => onBlur('emergencyPhone')}
            placeholder="0912345678"
            maxLength={10}
          />
        </FormField>

        <FormField label="關係" htmlFor="emergencyRelationship">
          <input
            id="emergencyRelationship"
            type="text"
            className={styles.input}
            value={formData.emergencyRelationship}
            onChange={(e) => onChange('emergencyRelationship', e.target.value)}
            placeholder="父親、母親、祖父母..."
            maxLength={20}
            list="relationship-suggestions"
          />
          <datalist id="relationship-suggestions">
            <option value="父親" />
            <option value="母親" />
            <option value="祖父" />
            <option value="祖母" />
            <option value="兄弟" />
            <option value="姊妹" />
            <option value="其他親屬" />
          </datalist>
        </FormField>
      </div>
    </section>
  )
}
