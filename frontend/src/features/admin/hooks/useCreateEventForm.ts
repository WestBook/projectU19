import { useState, useCallback } from 'react'
import type { CreateEventRequest } from '@/features/admin/types'

export interface CreateEventFormData {
  name: string
  description: string
  ageMin: string
  ageMax: string
  ageRestrictionNote: string
  strictAgeEnforcement: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  address: string
  capacity: string
  registrationDeadlineDate: string
  registrationDeadlineTime: string
  fee: string
  organizer: string
  contactEmail: string
  contactPhone: string
}

export type FormErrors = Partial<Record<keyof CreateEventFormData, string>>

const INITIAL_FORM: CreateEventFormData = {
  name: '',
  description: '',
  ageMin: '6',
  ageMax: '18',
  ageRestrictionNote: '',
  strictAgeEnforcement: false,
  startDate: '',
  startTime: '09:00',
  endDate: '',
  endTime: '12:00',
  location: '',
  address: '',
  capacity: '30',
  registrationDeadlineDate: '',
  registrationDeadlineTime: '23:59',
  fee: '0',
  organizer: '',
  contactEmail: '',
  contactPhone: '',
}

function combineDatetime(date: string, time: string): string {
  // Returns ISO 8601 with +08:00 timezone
  return `${date}T${time}:00+08:00`
}

export function useCreateEventForm() {
  const [form, setForm] = useState<CreateEventFormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const handleChange = useCallback(
    <K extends keyof CreateEventFormData>(field: K, value: CreateEventFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => {
        if (!prev[field]) return prev
        const next = { ...prev }
        delete next[field]
        return next
      })
    },
    []
  )

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!form.name.trim()) newErrors.name = '賽事名稱為必填'
    if (!form.description.trim()) newErrors.description = '說明為必填'
    if (!form.location.trim()) newErrors.location = '地點為必填'
    if (!form.organizer.trim()) newErrors.organizer = '主辦單位為必填'
    if (!form.contactEmail.trim()) newErrors.contactEmail = '聯絡信箱為必填'
    if (!form.contactPhone.trim()) newErrors.contactPhone = '聯絡電話為必填'
    if (!form.startDate) newErrors.startDate = '開始日期為必填'
    if (!form.endDate) newErrors.endDate = '結束日期為必填'
    if (!form.registrationDeadlineDate) newErrors.registrationDeadlineDate = '截止日期為必填'

    const ageMin = Number(form.ageMin)
    const ageMax = Number(form.ageMax)
    if (isNaN(ageMin) || ageMin < 0) newErrors.ageMin = '最小年齡無效'
    if (isNaN(ageMax) || ageMax < 0) newErrors.ageMax = '最大年齡無效'
    if (!newErrors.ageMin && !newErrors.ageMax && ageMin > ageMax) {
      newErrors.ageMin = '最小年齡不可大於最大年齡'
    }

    const capacity = Number(form.capacity)
    if (isNaN(capacity) || capacity < 1) newErrors.capacity = '容納人數至少為 1'

    const fee = Number(form.fee)
    if (isNaN(fee) || fee < 0) newErrors.fee = '費用不可為負數'

    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      newErrors.contactEmail = '請輸入有效的電子郵件'
    }

    // Date/time comparisons
    if (form.startDate && form.endDate) {
      const startDt = new Date(combineDatetime(form.startDate, form.startTime))
      const endDt = new Date(combineDatetime(form.endDate, form.endTime))
      if (startDt >= endDt) {
        newErrors.endDate = '結束時間必須晚於開始時間'
      }
    }

    if (form.startDate && form.registrationDeadlineDate) {
      const startDt = new Date(combineDatetime(form.startDate, form.startTime))
      const deadlineDt = new Date(
        combineDatetime(form.registrationDeadlineDate, form.registrationDeadlineTime)
      )
      if (deadlineDt >= startDt) {
        newErrors.registrationDeadlineDate = '報名截止時間必須早於賽事開始時間'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  const buildRequest = useCallback((): CreateEventRequest => {
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      ageMin: Number(form.ageMin),
      ageMax: Number(form.ageMax),
      ageRestrictionNote: form.ageRestrictionNote.trim() || undefined,
      strictAgeEnforcement: form.strictAgeEnforcement,
      startTime: combineDatetime(form.startDate, form.startTime),
      endTime: combineDatetime(form.endDate, form.endTime),
      location: form.location.trim(),
      address: form.address.trim() || undefined,
      capacity: Number(form.capacity),
      registrationDeadline: combineDatetime(
        form.registrationDeadlineDate,
        form.registrationDeadlineTime
      ),
      fee: Number(form.fee),
      organizer: form.organizer.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
    }
  }, [form])

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM)
    setErrors({})
  }, [])

  return {
    form,
    errors,
    handleChange,
    validate,
    buildRequest,
    resetForm,
  }
}
