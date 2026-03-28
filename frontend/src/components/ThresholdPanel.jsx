import { useEffect, useState } from 'react'

export default function ThresholdPanel({
  categories,
  thresholds,
  loading,
  saving,
  error,
  successMessage,
  onSave,
}) {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [thresholdAmount, setThresholdAmount] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory('')
      setThresholdAmount('')
      return
    }

    setSelectedCategory((currentCategory) => {
      if (currentCategory && categories.includes(currentCategory)) {
        return currentCategory
      }

      return categories[0]
    })
  }, [categories])

  useEffect(() => {
    if (!selectedCategory) {
      setThresholdAmount('')
      return
    }

    const currentThreshold = thresholds[selectedCategory]
    setThresholdAmount(
      currentThreshold?.thresholdAmount !== undefined ? String(currentThreshold.thresholdAmount) : '',
    )
  }, [selectedCategory, thresholds])

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    if (!selectedCategory) {
      setFormError('Select a category first.')
      return
    }

    const amount = Number(thresholdAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      setFormError('Threshold amount must be zero or greater.')
      return
    }

    await onSave({
      category: selectedCategory,
      thresholdAmount: amount,
      onError: setFormError,
    })
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">Budget thresholds</p>
          <h2>Set category limits</h2>
        </div>
        {loading ? <span className="panel-badge">Loading...</span> : null}
      </div>

      {categories.length === 0 ? (
        <div className="empty-panel">Add expenses first to configure category thresholds.</div>
      ) : (
        <form className="expense-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            <span>Threshold amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={thresholdAmount}
              onChange={(event) => setThresholdAmount(event.target.value)}
              placeholder="5000"
            />
          </label>

          {formError ? <p className="form-feedback error-text">{formError}</p> : null}
          {error ? <p className="form-feedback error-text">{error}</p> : null}
          {successMessage ? <p className="form-feedback success-text">{successMessage}</p> : null}

          <div className="form-actions">
            <button className="submit-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Threshold'}
            </button>
          </div>
        </form>
      )}
    </article>
  )
}
