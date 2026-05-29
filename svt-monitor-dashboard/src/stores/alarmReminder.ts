import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const SNOOZE_MINUTE_OPTIONS = [5, 10, 20, 30, 60] as const
export type SnoozeMinuteOption = (typeof SNOOZE_MINUTE_OPTIONS)[number]

const STORAGE_KEY_ENABLED = 'svt_alarm_reminder_enabled'
const STORAGE_KEY_SNOOZE_UNTIL = 'svt_alarm_reminder_snooze_until'

function readEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const raw = localStorage.getItem(STORAGE_KEY_ENABLED)
  if (raw === null) return true
  return raw !== 'false'
}

function readSnoozeUntil(): number {
  if (typeof window === 'undefined') return 0
  const n = Number(localStorage.getItem(STORAGE_KEY_SNOOZE_UNTIL))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export const useAlarmReminderStore = defineStore('alarmReminder', () => {
  const enabled = ref(readEnabled())
  const snoozeUntil = ref(readSnoozeUntil())

  watch(enabled, (value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_ENABLED, String(value))
  })

  watch(snoozeUntil, (value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_SNOOZE_UNTIL, String(value))
  })

  function shouldShowReminder(): boolean {
    if (!enabled.value) return false
    const until = snoozeUntil.value
    if (until > Date.now()) return false
    if (until > 0) clearSnooze()
    return true
  }

  function snoozeForMinutes(minutes: number) {
    const m = Number(minutes)
    if (!Number.isFinite(m) || m <= 0) return
    snoozeUntil.value = Date.now() + m * 60 * 1000
  }

  /** 在所选分钟内不再弹窗，并关闭预警总览提醒开关 */
  function confirmSnoozeAndDisable(minutes: number) {
    snoozeForMinutes(minutes)
    enabled.value = false
  }

  function setEnabled(value: boolean) {
    enabled.value = value
    if (value) clearSnooze()
  }

  function clearSnooze() {
    snoozeUntil.value = 0
  }

  return {
    enabled,
    snoozeUntil,
    shouldShowReminder,
    snoozeForMinutes,
    confirmSnoozeAndDisable,
    setEnabled,
    clearSnooze,
  }
})
