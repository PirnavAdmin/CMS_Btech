/**
 * Central Event Bus for cross-module state invalidation and sync in Pirnav ERP.
 * Allows components to reactively re-fetch data without full page reloads.
 */

class ERPEventBus {
  constructor() {
    this.events = new Map()
  }

  subscribe(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event).add(callback)

    return () => {
      this.unsubscribe(event, callback)
    }
  }

  unsubscribe(event, callback) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event, data) {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (err) {
          console.error(`Error in event listener for "${event}":`, err)
        }
      })
    }
  }
}

export const ERP_EVENTS = Object.freeze({
  ACADEMIC_UPDATED: 'ERP:ACADEMIC_UPDATED',
  STUDENT_UPDATED: 'ERP:STUDENT_UPDATED',
  PROMOTION_EXECUTED: 'ERP:PROMOTION_EXECUTED',
  ATTENDANCE_RECORDED: 'ERP:ATTENDANCE_RECORDED',
  RESULTS_RECORDED: 'ERP:RESULTS_RECORDED',
})

export const eventBus = new ERPEventBus()
export default eventBus
