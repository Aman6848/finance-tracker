import { useState } from 'react'
import './App.css'
import DashboardPage from './components/DashboardPage'
import NavigationTabs from './components/NavigationTabs'
import ReportsPage from './components/ReportsPage'

function App() {
  const [activePage, setActivePage] = useState('dashboard')

  return (
    <main className="dashboard-shell">
      <NavigationTabs activePage={activePage} onChange={setActivePage} />
      {activePage === 'dashboard' ? <DashboardPage /> : <ReportsPage />}
    </main>
  )
}

export default App
