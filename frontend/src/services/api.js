const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'https://finance-tracker-production-ef08.up.railway.app'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

function buildQuery(params) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export async function fetchExpenses({ category = 'All', page = 0, size = 100, signal } = {}) {
  const params = {
    page,
    size,
    sort: 'createdAt,desc',
  }

  const path =
    category === 'All'
      ? `/expenses${buildQuery(params)}`
      : `/expenses/filter${buildQuery({ ...params, category })}`

  const payload = await request(path, { signal })
  return Array.isArray(payload) ? payload : payload.content ?? []
}

export function createExpense(expense) {
  return request('/expenses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expense),
  })
}

export function updateExpense(id, expense) {
  return request(`/expenses/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expense),
  })
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, {
    method: 'DELETE',
  })
}

export function fetchMonthlySummary({ year, month, category, signal } = {}) {
  return request(
    `/expenses/monthly-summary${buildQuery({
      year,
      month,
      category,
    })}`,
    { signal },
  )
}

export function fetchGroupedExpensesByDay({ startDate, endDate, category, signal } = {}) {
  return request(
    `/expenses/grouped-by-day${buildQuery({
      startDate,
      endDate,
      category,
    })}`,
    { signal },
  )
}

export function fetchThreshold(category, signal) {
  return request(
    `/threshold${buildQuery({
      category,
    })}`,
    { signal },
  )
}

export function saveThreshold(threshold) {
  return request('/threshold', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(threshold),
  })
}

export function getApiBaseUrl() {
  return API_BASE_URL
}
