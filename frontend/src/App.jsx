import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8080'

function toDateTimeLocalValue(value = new Date()) {
  const date = new Date(value)
  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function splitDateTime(value = new Date()) {
  const dateTime = toDateTimeLocalValue(value)
  const [date, time] = dateTime.split('T')
  return { date, time }
}

function getDateRange() {
  const now = new Date()
  const maxDate = toDateTimeLocalValue(now).slice(0, 10)
  const minDate = new Date(now)
  minDate.setFullYear(now.getFullYear() - 1)

  return {
    minDate: toDateTimeLocalValue(minDate).slice(0, 10),
    maxDate,
  }
}

const defaultDateTime = splitDateTime()
const { minDate, maxDate } = getDateRange()

const initialForm = {
  title: '',
  amount: '',
  category: '',
  expenseDate: defaultDateTime.date,
  expenseTime: defaultDateTime.time,
}

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function formatCurrency(amount) {
  return currencyFormatter.format(amount || 0)
}

function formatDate(value) {
  if (!value) return 'Unknown date'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getWeeklySeries(expenses) {
  const now = new Date()
  const labels = []
  const totals = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const current = new Date(now)
    current.setHours(0, 0, 0, 0)
    current.setDate(now.getDate() - offset)

    const dayLabel = current.toLocaleDateString('en-IN', { weekday: 'short' })
    const total = expenses.reduce((sum, expense) => {
      const expenseDate = new Date(expense.createdAt)
      expenseDate.setHours(0, 0, 0, 0)
      return expenseDate.getTime() === current.getTime()
        ? sum + Number(expense.amount || 0)
        : sum
    }, 0)

    labels.push(dayLabel)
    totals.push(total)
  }

  const max = Math.max(...totals, 1)

  return labels.map((label, index) => ({
    label,
    value: totals[index],
    height: `${Math.max((totals[index] / max) * 100, totals[index] > 0 ? 18 : 8)}%`,
  }))
}

async function fetchExpensePage(category, signal) {
  const params = new URLSearchParams({
    page: '0',
    size: '100',
    sort: 'createdAt,desc',
  })

  let endpoint = `${API_BASE_URL}/expenses?${params.toString()}`

  if (category !== 'All') {
    params.set('category', category)
    endpoint = `${API_BASE_URL}/expenses/filter?${params.toString()}`
  }

  const response = await fetch(endpoint, { signal })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return Array.isArray(payload) ? payload : payload.content ?? []
}

function App() {
  const [allExpenses, setAllExpenses] = useState([])
  const [visibleExpenses, setVisibleExpenses] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadExpenses() {
      setLoading(true)
      setError('')

      try {
        const [all, filtered] = await Promise.all([
          fetchExpensePage('All', controller.signal),
          fetchExpensePage(selectedCategory, controller.signal),
        ])

        setAllExpenses(all)
        setVisibleExpenses(filtered)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Could not load expenses from the backend.')
          setAllExpenses([])
          setVisibleExpenses([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()

    return () => controller.abort()
  }, [selectedCategory])

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setFormMessage('')

    const title = form.title.trim()
    const category = form.category.trim()
    const amount = Number(form.amount)
    const expenseDate = form.expenseDate
    const expenseTime = form.expenseTime
    const createdAt =
      expenseDate && expenseTime ? `${expenseDate}T${expenseTime}` : ''

    if (!title) {
      setFormError('Title is required.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount must be greater than zero.')
      return
    }

    if (!createdAt) {
      setFormError('Date and time are required.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          amount,
          category,
          createdAt,
        }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const createdExpense = await response.json()
      const nextAllExpenses = [createdExpense, ...allExpenses].sort(
        (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
      )

      setAllExpenses(nextAllExpenses)
      setVisibleExpenses(
        selectedCategory === 'All' || createdExpense.category === selectedCategory
          ? [createdExpense, ...visibleExpenses].sort(
              (left, right) => new Date(right.createdAt) - new Date(left.createdAt),
            )
          : visibleExpenses,
      )
      const nextDateTime = splitDateTime()
      setForm({
        ...initialForm,
        expenseDate: nextDateTime.date,
        expenseTime: nextDateTime.time,
      })
      setFormMessage('Expense added successfully.')
    } catch {
      setFormError('Could not save the expense.')
    } finally {
      setSubmitting(false)
    }
  }

  const categories = ['All', ...new Set(allExpenses.map((expense) => expense.category).filter(Boolean))]

  const totalSpent = visibleExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const transactionCount = visibleExpenses.length
  const averageExpense = transactionCount > 0 ? totalSpent / transactionCount : 0

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const currentMonthSpent = visibleExpenses.reduce((sum, expense) => {
    const expenseDate = new Date(expense.createdAt)
    return expenseDate >= startOfMonth ? sum + Number(expense.amount || 0) : sum
  }, 0)

  const categoryTotals = Object.entries(
    visibleExpenses.reduce((accumulator, expense) => {
      const key = expense.category || 'Uncategorized'
      accumulator[key] = (accumulator[key] || 0) + Number(expense.amount || 0)
      return accumulator
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .map(([name, amount], _, source) => ({
      name,
      amount,
      width: `${Math.max((amount / Math.max(source[0]?.amount || 1, 1)) * 100, 10)}%`,
    }))

  const topCategory = categoryTotals[0]
  const recentExpenses = [...visibleExpenses]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 5)
  const weeklySeries = getWeeklySeries(visibleExpenses)

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Finance Tracker</p>
          <h1>Connected expense dashboard.</h1>
          <p className="hero-text">
            Live data is now pulled from your Spring Boot backend and summarized into
            a readable spending snapshot.
          </p>

          <div className="hero-actions">
            <label className="filter-control">
              <span>Category filter</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="hero-metrics">
            <div>
              <span>This month</span>
              <strong>{formatCurrency(currentMonthSpent)}</strong>
            </div>
            <div>
              <span>Transactions</span>
              <strong>{transactionCount}</strong>
            </div>
            <div>
              <span>Top category</span>
              <strong>{topCategory?.name ?? 'No data'}</strong>
            </div>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-head">
            <span>Last 7 days</span>
            <strong>Expense activity</strong>
          </div>

          <div className="chart">
            <div className="chart-bars">
              {weeklySeries.map((item) => (
                <span
                  key={item.label}
                  className={item.value > 0 ? 'active' : ''}
                  style={{ height: item.height }}
                  title={`${item.label}: ${formatCurrency(item.value)}`}
                ></span>
              ))}
            </div>
            <div className="chart-labels">
              {weeklySeries.map((item) => (
                <span key={item.label}>{item.label}</span>
              ))}
            </div>
          </div>

          <div className="cashflow-note">
            <div>
              <span>Total spent</span>
              <strong>{formatCurrency(totalSpent)}</strong>
            </div>
            <div>
              <span>Average expense</span>
              <strong>{formatCurrency(averageExpense)}</strong>
            </div>
          </div>
        </div>
      </section>

      {error ? <section className="status-banner error">{error}</section> : null}
      {loading ? <section className="status-banner">Loading expenses...</section> : null}

      {!loading && !error ? (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <span>Total expenses</span>
              <strong>{formatCurrency(totalSpent)}</strong>
              <em>{transactionCount} recorded transactions</em>
            </article>
            <article className="summary-card">
              <span>Current month</span>
              <strong>{formatCurrency(currentMonthSpent)}</strong>
              <em>Based on `createdAt` from backend</em>
            </article>
            <article className="summary-card">
              <span>Average ticket size</span>
              <strong>{formatCurrency(averageExpense)}</strong>
              <em>{topCategory ? `${topCategory.name} leads spending` : 'Waiting for data'}</em>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel panel-large">
              <div className="panel-head">
                <div>
                  <p className="panel-kicker">Spending breakdown</p>
                  <h2>Category totals</h2>
                </div>
                <span className="panel-badge">{selectedCategory}</span>
              </div>

              {categoryTotals.length > 0 ? (
                <div className="category-list">
                  {categoryTotals.map((category) => (
                    <div key={category.name} className="category-row">
                      <div className="category-copy">
                        <strong>{category.name}</strong>
                        <span>{formatCurrency(category.amount)}</span>
                      </div>
                      <div className="category-bar">
                        <span style={{ width: category.width }}></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">
                  No expenses available yet. Add a few entries in the form and this
                  section will populate automatically.
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <p className="panel-kicker">Add expense</p>
                  <h2>Create from UI</h2>
                </div>
              </div>

              <form className="expense-form" onSubmit={handleSubmit}>
                <label className="form-field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Monthly groceries"
                  />
                </label>

                <label className="form-field">
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    placeholder="1500"
                  />
                </label>

                <label className="form-field">
                  <span>Category</span>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="Food"
                  />
                </label>

                <div className="form-row">
                  <label className="form-field">
                    <span>Date</span>
                    <input
                      id="date-input-ui"
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={form.expenseDate}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, expenseDate: event.target.value }))
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>Time</span>
                    <input
                      type="time"
                      value={form.expenseTime}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, expenseTime: event.target.value }))
                      }
                    />
                  </label>
                </div>

                {formError ? <p className="form-feedback error-text">{formError}</p> : null}
                {formMessage ? <p className="form-feedback success-text">{formMessage}</p> : null}

                <button className="submit-button" type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add expense'}
                </button>
              </form>
            </article>

            <article className="panel panel-tall">
              <div className="panel-head">
                <div>
                  <p className="panel-kicker">Recent activity</p>
                  <h2>Latest transactions</h2>
                </div>
              </div>

              {recentExpenses.length > 0 ? (
                <div className="activity-list">
                  {recentExpenses.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {(item.category || 'Uncategorized')}, {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <span className="negative">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-panel">No transactions returned by the backend.</div>
              )}
            </article>
          </section>
        </>
      ) : null}
    </main>
  )
}

export default App
