// Time calculations and helpers for Faculty Self Attendance

export const pad = n => String(n).padStart(2, '0')

export const formatKeyDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const timeToMinutes = str => {
  if (!str) return null
  const clean = String(str).trim()
  const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i)
  if (!match) return null
  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const ampm = match[3]?.toUpperCase()
  if (ampm === 'PM' && hours < 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

export const minutesToTime24 = min => {
  if (min === null || min === undefined) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${pad(h)}:${pad(m)}`
}

export const formatTime12 = timeStr => {
  if (!timeStr || timeStr === '—') return '—'
  const min = timeToMinutes(timeStr)
  if (min === null) return timeStr
  const h = Math.floor(min / 60)
  const m = min % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${pad(h12)}:${pad(m)} ${ampm}`
}

export const calculateDuration = (checkInStr, checkOutStr) => {
  const inMin = timeToMinutes(checkInStr)
  const outMin = timeToMinutes(checkOutStr)
  if (inMin === null || outMin === null || outMin < inMin) return null
  const totalMin = outMin - inMin
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  const decimal = +(totalMin / 60).toFixed(2)
  return {
    totalMinutes: totalMin,
    hours,
    minutes: mins,
    formatted: `${hours}h ${pad(mins)}m`,
    verbose: `${hours} hrs ${mins} mins`,
    decimal
  }
}

export const formatMinutesToDuration = totalMinutes => {
  if (!totalMinutes || totalMinutes <= 0) return '0 hrs 00 mins'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${hours} hrs ${pad(mins)} mins`
}
