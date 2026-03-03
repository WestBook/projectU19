import { useState, useCallback } from 'react'
import { createOrder } from '@/api/ordersApi'
import { ApiError } from '@/api/client'
import type { CreateOrderRequest, Order } from '@/features/orders/types'
import type { EventDetail } from '@/features/events/types'

// ---- Form state shape -------------------------------------------------------

export interface OrderFormData {
  parentName: string
  parentEmail: string
  parentPhone: string
  childName: string
  childBirthDate: string
  childGender: '' | 'MALE' | 'FEMALE' | 'OTHER'
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  notes: string
}

export type FormErrors = Record<string, string>

// ---- Initial values ---------------------------------------------------------

const INITIAL_FORM: OrderFormData = {
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  childName: '',
  childBirthDate: '',
  childGender: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  notes: '',
}

// ---- Validation helpers -----------------------------------------------------

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^09\d{8}$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function isValidDate(value: string): boolean {
  if (!DATE_REGEX.test(value)) return false
  const d = new Date(value)
  return d instanceof Date && !isNaN(d.getTime())
}

// ---- Main hook --------------------------------------------------------------

export interface UseOrderFormResult {
  formData: OrderFormData
  errors: FormErrors
  serverErrors: FormErrors
  submitting: boolean
  success: boolean
  createdOrder: Order | null
  apiError: ApiError | null
  handleChange: (field: keyof OrderFormData, value: string) => void
  handleBlur: (field: keyof OrderFormData, eventDetail?: EventDetail | null) => void
  handleSubmit: (eventId: string, eventDetail?: EventDetail | null) => Promise<void>
  resetApiError: () => void
}

export function useOrderForm(): UseOrderFormResult {
  const [formData, setFormData] = useState<OrderFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverErrors, setServerErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)
  const [apiError, setApiError] = useState<ApiError | null>(null)

  // ---- single-field validation --------------------------------------------

  const validateField = useCallback(
    (field: keyof OrderFormData, data: OrderFormData, eventDetail?: EventDetail | null): string => {
      const raw = data[field] as string
      const v = typeof raw === 'string' ? raw.trim() : raw

      switch (field) {
        case 'parentName':
          if (!v) return '家長姓名為必填'
          if (v.length < 2 || v.length > 50) return '家長姓名需在 2-50 字元之間'
          return ''

        case 'parentEmail':
          if (!v) return '電子郵件為必填'
          if (!EMAIL_REGEX.test(v)) return '請輸入有效的電子郵件格式'
          return ''

        case 'parentPhone':
          if (!v) return '手機號碼為必填'
          if (!PHONE_REGEX.test(v)) return '手機號碼須為 10 碼且以 09 開頭（例：0912345678）'
          return ''

        case 'childName':
          if (!v) return '小孩姓名為必填'
          if (v.length < 2 || v.length > 50) return '小孩姓名需在 2-50 字元之間'
          return ''

        case 'childBirthDate': {
          if (!v) return '出生日期為必填'
          if (!isValidDate(v)) return '請輸入有效日期（YYYY-MM-DD）'
          const birth = new Date(v)
          if (birth >= new Date()) return '出生日期必須是過去的日期'
          if (eventDetail) {
            const age = calcAge(v)
            const { minAge, maxAge } = eventDetail.ageRestriction
            if (age < minAge || age > maxAge) {
              return `小孩年齡（${age} 歲）不在此賽事年齡範圍（${minAge}-${maxAge} 歲）內`
            }
          }
          return ''
        }

        case 'emergencyName': {
          // Required if emergencyPhone is filled
          const hasPhone = data.emergencyPhone.trim().length > 0
          if (hasPhone && !v) return '已填寫緊急聯絡電話時，姓名為必填'
          return ''
        }

        case 'emergencyPhone': {
          // Required if emergencyName is filled
          const hasName = data.emergencyName.trim().length > 0
          if (hasName && !v) return '已填寫緊急聯絡人姓名時，電話為必填'
          if (v && !PHONE_REGEX.test(v)) return '電話號碼須為 10 碼且以 09 開頭（例：0912345678）'
          return ''
        }

        case 'notes':
          if (data.notes.length > 500) return '備註不得超過 500 字元'
          return ''

        default:
          return ''
      }
    },
    []
  )

  // ---- all-fields validation ----------------------------------------------

  const validateAll = useCallback(
    (data: OrderFormData, eventDetail?: EventDetail | null): FormErrors => {
      const fields: Array<keyof OrderFormData> = [
        'parentName',
        'parentEmail',
        'parentPhone',
        'childName',
        'childBirthDate',
        'emergencyName',
        'emergencyPhone',
        'notes',
      ]
      const errs: FormErrors = {}
      for (const f of fields) {
        const msg = validateField(f, data, eventDetail)
        if (msg) errs[f] = msg
      }
      return errs
    },
    [validateField]
  )

  // ---- handlers -----------------------------------------------------------

  const handleChange = useCallback((field: keyof OrderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear server error for the field when user edits it
    setServerErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleBlur = useCallback(
    (field: keyof OrderFormData, eventDetail?: EventDetail | null) => {
      setFormData((prev) => {
        const msg = validateField(field, prev, eventDetail)
        setErrors((errs) => {
          if (!msg && !errs[field]) return errs
          return { ...errs, [field]: msg }
        })
        return prev
      })
    },
    [validateField]
  )

  // ---- submit -------------------------------------------------------------

  const handleSubmit = useCallback(
    async (eventId: string, eventDetail?: EventDetail | null) => {
      setApiError(null)
      setServerErrors({})

      const allErrors = validateAll(formData, eventDetail)
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors)
        // Scroll to top so user can see errors
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Build request payload
      const payload: CreateOrderRequest = {
        eventId,
        parent: {
          name: formData.parentName.trim(),
          email: formData.parentEmail.trim(),
          phone: formData.parentPhone.trim(),
        },
        child: {
          name: formData.childName.trim(),
          birthDate: formData.childBirthDate,
          ...(formData.childGender
            ? { gender: formData.childGender as 'MALE' | 'FEMALE' | 'OTHER' }
            : {}),
        },
        ...(formData.emergencyName.trim() || formData.emergencyPhone.trim()
          ? {
              emergencyContact: {
                name: formData.emergencyName.trim(),
                phone: formData.emergencyPhone.trim(),
                ...(formData.emergencyRelationship.trim()
                  ? { relationship: formData.emergencyRelationship.trim() }
                  : {}),
              },
            }
          : {}),
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
      }

      setSubmitting(true)
      try {
        const response = await createOrder(payload)
        setCreatedOrder(response.data)
        setSuccess(true)
      } catch (err) {
        if (err instanceof ApiError) {
          setApiError(err)
          // Map server-side validation details to field-level errors
          if (err.code === 'VALIDATION_ERROR' && err.details) {
            const srvErrs: FormErrors = {}
            for (const detail of err.details) {
              // Map "parent.name" → "parentName", "child.birthDate" → "childBirthDate", etc.
              const mapped = mapServerField(detail.field)
              if (mapped) {
                srvErrs[mapped] = detail.reason
              }
            }
            setServerErrors(srvErrs)
          }
        } else {
          setApiError(new ApiError('UNKNOWN_ERROR', '系統發生未知錯誤，請稍後再試', '', 0))
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } finally {
        setSubmitting(false)
      }
    },
    [formData, validateAll]
  )

  const resetApiError = useCallback(() => {
    setApiError(null)
  }, [])

  return {
    formData,
    errors,
    serverErrors,
    submitting,
    success,
    createdOrder,
    apiError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetApiError,
  }
}

// ---- Field name mapping (server → client) -----------------------------------

function mapServerField(serverField: string): string | null {
  const map: Record<string, string> = {
    'parent.name': 'parentName',
    'parent.email': 'parentEmail',
    'parent.phone': 'parentPhone',
    'child.name': 'childName',
    'child.birthDate': 'childBirthDate',
    'child.gender': 'childGender',
    'emergencyContact.name': 'emergencyName',
    'emergencyContact.phone': 'emergencyPhone',
    'emergencyContact.relationship': 'emergencyRelationship',
    notes: 'notes',
  }
  return map[serverField] ?? null
}
