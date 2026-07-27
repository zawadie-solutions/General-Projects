import { Outlet } from 'react-router-dom'
import { NavBar } from './components/NavBar'

function App() {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-text-soft">
        Built for practicing prompt engineering — your progress is saved on this device.
      </footer>
    </div>
  )
}

export default App
