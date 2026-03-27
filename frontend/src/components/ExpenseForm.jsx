export default function ExpenseForm({
  title,
  subtitle,
  form,
  setForm,
  minDate,
  maxDate,
  onSubmit,
  submitting,
  formError,
  formMessage,
  submitLabel,
  onCancelEdit,
  showCancelEdit = false,
}) {
  return (
    <article className="panel">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">{title}</p>
          <h2>{subtitle}</h2>
        </div>
      </div>

      <form className="expense-form" onSubmit={onSubmit}>
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
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
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

        <div className="form-actions">
          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : submitLabel}
          </button>

          {showCancelEdit ? (
            <button type="button" className="secondary-button" onClick={onCancelEdit}>
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>
    </article>
  )
}
