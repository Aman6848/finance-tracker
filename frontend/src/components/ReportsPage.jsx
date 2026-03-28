import { useEffect, useState } from 'react'
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchGroupedExpensesByDay,
  fetchMonthlySummary,
  fetchThreshold,
  saveThreshold,
  updateExpense,
} from '../services/api'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getDateRange,
  getMonthOptions,
  getMonthRange,
  getYearOptions,
  splitDateTime,
} from '../utils/expenseFormatters'
import ExpenseForm from './ExpenseForm'
import SummaryCard from './SummaryCard'
import ThresholdPanel from './ThresholdPanel'

const monthOptions = getMonthOptions()
const yearOptions = getYearOptions(4)
const today = new Date()
const { minDate, maxDate } = getDateRange()
const defaultDateTime = splitDateTime()

const initialForm = {
  title: '',
  amount: '',
  category: '',
  expenseDate: defaultDateTime.date,
  expenseTime: defaultDateTime.time,
}

function buildSummaryFromGrouped(groupedEntries) {
  const categoryTotals = {}
  let total = 0
  let expenseCount = 0

  groupedEntries.forEach(([, expenses]) => {
    expenses.forEach((expense) => {
      const amount = Number(expense.amount || 0)
      const category = expense.category || 'Uncategorized'
      total += amount
      expenseCount += 1
      categoryTotals[category] = (categoryTotals[category] || 0) + amount
    })
  })

  return {
    total,
    categoryTotals,
    expenseCount,
  }
}

function toFormState(expense) {
  const { date, time } = splitDateTime(expense.createdAt)

  return {
    title: expense.title ?? '',
    amount: String(expense.amount ?? ''),
    category: expense.category ?? '',
    expenseDate: date,
    expenseTime: time,
  }
}

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [viewMode, setViewMode] = useState('summary')
  const [categories, setCategories] = useState(['All'])
  const [groupedExpenses, setGroupedExpenses] = useState({})
  const [monthlySummary, setMonthlySummary] = useState({ total: 0, categoryTotals: {} })
  const [form, setForm] = useState(initialForm)
  const [editingExpense, setEditingExpense] = useState(null)
  const [thresholds, setThresholds] = useState({})
  const [thresholdLoading, setThresholdLoading] = useState(false)
  const [thresholdSaving, setThresholdSaving] = useState(false)
  const [thresholdError, setThresholdError] = useState('')
  const [thresholdMessage, setThresholdMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [expensePendingDelete, setExpensePendingDelete] = useState(null)

  async function refreshCategories(signal) {
    try {
      const expenses = await fetchExpenses({ category: 'All', signal })
      setCategories(['All', ...new Set(expenses.map((expense) => expense.category).filter(Boolean))])
    } catch {
      setCategories(['All'])
    }
  }

  async function refreshReports(signal) {
    const { startDate, endDate } = getMonthRange(selectedYear, selectedMonth)
    const [grouped, summary] = await Promise.all([
      fetchGroupedExpensesByDay({
        startDate,
        endDate,
        signal,
      }),
      fetchMonthlySummary({
        year: selectedYear,
        month: selectedMonth,
        signal,
      }),
    ])

    setGroupedExpenses(grouped)
    setMonthlySummary(summary)
  }

  useEffect(() => {
    const controller = new AbortController()
    refreshCategories(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const categoriesToLoad = categories.filter((category) => category !== 'All')

    if (categoriesToLoad.length === 0) {
      setThresholds({})
      setThresholdError('')
      setThresholdLoading(false)
      return undefined
    }

    const controller = new AbortController()

    async function loadThresholds() {
      setThresholdLoading(true)
      setThresholdError('')

      try {
        const thresholdEntries = await Promise.all(
          categoriesToLoad.map(async (category) => {
            try {
              const threshold = await fetchThreshold(category, controller.signal)
              return [category, threshold]
            } catch (thresholdFetchError) {
              if (thresholdFetchError.name === 'AbortError') {
                throw thresholdFetchError
              }

              return null
            }
          }),
        )

        setThresholds(
          thresholdEntries.filter(Boolean).reduce((accumulator, [category, threshold]) => {
            accumulator[category] = threshold
            return accumulator
          }, {}),
        )
      } catch (thresholdFetchError) {
        if (thresholdFetchError.name !== 'AbortError') {
          setThresholds({})
          setThresholdError('Could not load threshold data.')
        }
      } finally {
        setThresholdLoading(false)
      }
    }

    loadThresholds()
    return () => controller.abort()
  }, [categories])

  useEffect(() => {
    resetFormState()
    setFormError('')
    setFormMessage('')
    setExpensePendingDelete(null)
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    const controller = new AbortController()

    async function loadReports() {
      setLoading(true)
      setError('')

      try {
        await refreshReports(controller.signal)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError('Could not load report data from the backend.')
          setGroupedExpenses({})
          setMonthlySummary({ total: 0, categoryTotals: {} })
        }
      } finally {
        setLoading(false)
      }
    }

    loadReports()
    return () => controller.abort()
  }, [selectedYear, selectedMonth])

  const groupedEntries = Object.entries(groupedExpenses)
    .map(([date, expenses]) => [
      date,
      selectedCategory === 'All'
        ? expenses
        : expenses.filter((expense) => (expense.category || 'Uncategorized') === selectedCategory),
    ])
    .filter(([, expenses]) => expenses.length > 0)
    .sort((left, right) => new Date(right[0]) - new Date(left[0]))

  const derivedSummary = buildSummaryFromGrouped(groupedEntries)
  const isCategoryFiltered = selectedCategory !== 'All'
  const summaryTotal = isCategoryFiltered ? derivedSummary.total : Number(monthlySummary.total || 0)
  const summaryCategoryTotals = isCategoryFiltered
    ? derivedSummary.categoryTotals
    : monthlySummary.categoryTotals || {}
  const expenseCount = derivedSummary.expenseCount
  const categoryEntries = Object.entries(summaryCategoryTotals).sort((left, right) => right[1] - left[1])
  const topCategory = categoryEntries[0]?.[0] ?? 'No data'

  function resetFormState() {
    const nextDateTime = splitDateTime()
    setForm({
      ...initialForm,
      expenseDate: nextDateTime.date,
      expenseTime: nextDateTime.time,
    })
    setEditingExpense(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setFormMessage('')

    const title = form.title.trim()
    const category = form.category.trim()
    const amount = Number(form.amount)
    const createdAt =
      form.expenseDate && form.expenseTime ? `${form.expenseDate}T${form.expenseTime}` : ''

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
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          title,
          amount,
          category,
          createdAt,
        })
      } else {
        await createExpense({
          title,
          amount,
          category,
          createdAt,
        })
      }

      await Promise.all([refreshReports(), refreshCategories()])
      resetFormState()
      setFormMessage(editingExpense ? 'Expense updated successfully.' : 'Expense added successfully.')
      setThresholdMessage('')
    } catch {
      setFormError(editingExpense ? 'Could not update the expense.' : 'Could not save the expense.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(expense) {
    setEditingExpense(expense)
    setForm(toFormState(expense))
    setFormError('')
    setFormMessage('')
    setViewMode('detailed')
  }

  function handleCancelEdit() {
    resetFormState()
    setFormError('')
    setFormMessage('')
  }

  function handleDeleteRequest(expense) {
    setExpensePendingDelete(expense)
  }

  async function handleConfirmDelete() {
    if (!expensePendingDelete) {
      return
    }

    setDeletingId(expensePendingDelete.id)
    setError('')

    try {
      await deleteExpense(expensePendingDelete.id)
      await Promise.all([refreshReports(), refreshCategories()])

      if (editingExpense?.id === expensePendingDelete.id) {
        handleCancelEdit()
      }
    } catch {
      setError('Could not delete the selected expense.')
    } finally {
      setDeletingId(null)
      setExpensePendingDelete(null)
    }
  }

  async function handleThresholdSave({ category, thresholdAmount, onError }) {
    setThresholdSaving(true)
    setThresholdError('')
    setThresholdMessage('')

    try {
      const savedThreshold = await saveThreshold({ category, thresholdAmount })
      setThresholds((current) => ({
        ...current,
        [category]: savedThreshold,
      }))
      setThresholdMessage(`Threshold saved for ${category}.`)
    } catch {
      onError('Could not save the threshold.')
    } finally {
      setThresholdSaving(false)
    }
  }

  const thresholdWarnings = categoryEntries
    .map(([category, amount]) => {
      const threshold = thresholds[category]
      if (!threshold) {
        return null
      }

      return Number(amount || 0) > Number(threshold.thresholdAmount || 0)
        ? `Budget exceeded for ${category} category`
        : null
    })
    .filter(Boolean)

  return (
    <>
      <section className="hero-panel reports-hero">
        <div className="hero-copy">
          <p className="eyebrow">Reports</p>
          <h1>Monthly reporting with drill-down.</h1>
          <p className="hero-text">
            Filter by month and category, switch between summary and detailed views,
            and manage individual transactions directly from the report.
          </p>

          <div className="reports-filters">
            <label className="filter-control">
              <span>Year</span>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Month</span>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Category</span>
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
        </div>

        <div className="hero-card">
          <div className="hero-card-head">
            <span>View mode</span>
            <strong>{selectedCategory}</strong>
          </div>

          <div className="toggle-strip">
            <button
              type="button"
              className={viewMode === 'summary' ? 'tab-button active' : 'tab-button'}
              onClick={() => setViewMode('summary')}
            >
              Summary View
            </button>
            <button
              type="button"
              className={viewMode === 'detailed' ? 'tab-button active' : 'tab-button'}
              onClick={() => setViewMode('detailed')}
            >
              Detailed View
            </button>
          </div>

          <div className="cashflow-note">
            <div>
              <span>Transactions</span>
              <strong>{expenseCount}</strong>
            </div>
            <div>
              <span>Lead category</span>
              <strong>{topCategory}</strong>
            </div>
          </div>
        </div>
      </section>

      {error ? <section className="status-banner error">{error}</section> : null}
      {loading ? <section className="status-banner">Loading reports...</section> : null}
      {!loading && !error && thresholdWarnings.length > 0 ? (
        <section className="warning-stack">
          {thresholdWarnings.map((warning) => (
            <div key={warning} className="status-banner warning">
              {warning}
            </div>
          ))}
        </section>
      ) : null}
      {expensePendingDelete ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
          <div className="confirm-modal">
            <p className="panel-kicker">Delete expense</p>
            <h2 id="delete-confirm-title">Remove this transaction?</h2>
            <p className="confirm-copy">
              {expensePendingDelete.title} will be permanently deleted from your tracker.
            </p>
            <div className="confirm-meta">
              <span>{expensePendingDelete.category || 'Uncategorized'}</span>
              <strong>{formatCurrency(expensePendingDelete.amount)}</strong>
            </div>
            <div className="form-actions">
              <button type="button" className="danger-button" onClick={handleConfirmDelete}>
                Confirm Delete
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setExpensePendingDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="summary-grid">
            <SummaryCard
              label="Monthly total"
              value={formatCurrency(summaryTotal)}
              note={`${selectedYear}-${String(selectedMonth).padStart(2, '0')} reporting window`}
            />
            <SummaryCard
              label="Transactions"
              value={String(expenseCount)}
              note={selectedCategory === 'All' ? 'All categories included' : `${selectedCategory} only`}
            />
            <SummaryCard
              label="Top category"
              value={topCategory}
              note={`${categoryEntries.length} category buckets`}
            />
          </section>

          {viewMode === 'summary' ? (
            <section className="content-grid reports-grid">
              <article className="panel panel-large">
                <div className="panel-head">
                  <div>
                    <p className="panel-kicker">Monthly summary</p>
                    <h2>Category-wise totals</h2>
                  </div>
                </div>

                {categoryEntries.length > 0 ? (
                  <div className="category-list">
                    {categoryEntries.map(([category, amount], _, source) => (
                      <div key={category} className="category-row">
                        <div className="category-copy">
                          <strong>{category}</strong>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                        <div className="category-bar">
                          <span
                            style={{
                              width: `${Math.max((amount / Math.max(source[0]?.[1] || 1, 1)) * 100, 10)}%`,
                            }}
                          ></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel">No summary data for the selected month.</div>
                )}
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <p className="panel-kicker">Date coverage</p>
                    <h2>Reporting window</h2>
                  </div>
                </div>

                <div className="goal-list">
                  <div className="goal-card">
                    <div className="goal-top">
                      <strong>Start date</strong>
                      <span>{formatDate(groupedEntries.at(-1)?.[0])}</span>
                    </div>
                    <p>Beginning of the visible dataset.</p>
                  </div>
                  <div className="goal-card">
                    <div className="goal-top">
                      <strong>Latest activity</strong>
                      <span>{formatDate(groupedEntries[0]?.[0])}</span>
                    </div>
                    <p>Most recent day with transactions in this report.</p>
                  </div>
                </div>
              </article>

              <ThresholdPanel
                categories={categories.filter((category) => category !== 'All')}
                thresholds={thresholds}
                loading={thresholdLoading}
                saving={thresholdSaving}
                error={thresholdError}
                successMessage={thresholdMessage}
                onSave={handleThresholdSave}
              />
            </section>
          ) : (
            <section className="content-grid reports-grid">
              <ExpenseForm
                title={editingExpense ? 'Edit expense' : 'Add expense'}
                subtitle={editingExpense ? 'Update selected transaction' : 'Create from reports view'}
                form={form}
                setForm={setForm}
                minDate={minDate}
                maxDate={maxDate}
                onSubmit={handleSubmit}
                submitting={submitting}
                formError={formError}
                formMessage={formMessage}
                submitLabel={editingExpense ? 'Update Expense' : 'Add Expense'}
                onCancelEdit={handleCancelEdit}
                showCancelEdit={Boolean(editingExpense)}
              />

              <ThresholdPanel
                categories={categories.filter((category) => category !== 'All')}
                thresholds={thresholds}
                loading={thresholdLoading}
                saving={thresholdSaving}
                error={thresholdError}
                successMessage={thresholdMessage}
                onSave={handleThresholdSave}
              />

              <section className="panel panel-large">
                <div className="panel-head">
                  <div>
                    <p className="panel-kicker">Grouped expense view</p>
                    <h2>Daily drill-down</h2>
                  </div>
                </div>

                {groupedEntries.length > 0 ? (
                  <div className="grouped-report-list">
                    {groupedEntries.map(([date, expenses]) => (
                      <section key={date} className="group-day">
                        <div className="group-day-head">
                          <h3>{formatDate(date)}</h3>
                          <span>{expenses.length} items</span>
                        </div>

                        <div className="day-expense-list">
                          {expenses.map((expense) => (
                            <article key={expense.id} className="report-expense-item">
                              <div>
                                <strong>{expense.title}</strong>
                                <p>
                                  {expense.category || 'Uncategorized'} |{' '}
                                  {formatDateTime(expense.createdAt)}
                                </p>
                              </div>

                              <div className="expense-actions">
                                <span className="negative">{formatCurrency(expense.amount)}</span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => handleEdit(expense)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  disabled={deletingId === expense.id}
                                  onClick={() => handleDeleteRequest(expense)}
                                >
                                  {deletingId === expense.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="empty-panel">No expenses found for the selected filters.</div>
                )}
              </section>
            </section>
          )}
        </>
      ) : null}
    </>
  )
}
