const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatCurrency(amount) {
  return currencyFormatter.format(amount || 0)
}

export function formatDate(value) {
  if (!value) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function toDateTimeLocalValue(value = new Date()) {
  const date = new Date(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export function splitDateTime(value = new Date()) {
  const dateTime = toDateTimeLocalValue(value)
  const [date, time] = dateTime.split('T')
  return { date, time }
}

export function getDateRange() {
  const now = new Date()
  const maxDate = toDateTimeLocalValue(now).slice(0, 10)
  const minDate = new Date(now)
  minDate.setFullYear(now.getFullYear() - 1)

  return {
    minDate: toDateTimeLocalValue(minDate).slice(0, 10),
    maxDate,
  }
}

export function getMonthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)

  return {
    startDate: toDateTimeLocalValue(start),
    endDate: toDateTimeLocalValue(end),
  }
}

export function getMonthOptions() {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]
}

export function getYearOptions(span = 3) {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: span }, (_, index) => currentYear - index)
}
