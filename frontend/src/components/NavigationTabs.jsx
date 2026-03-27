const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reports', label: 'Reports' },
]

export default function NavigationTabs({ activePage, onChange }) {
  return (
    <nav className="top-nav" aria-label="Primary">
      <div className="brand-block">
        <p className="eyebrow">Expense Tracker</p>
        <strong>Control center</strong>
      </div>

      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activePage === tab.id ? 'tab-button active' : 'tab-button'}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
