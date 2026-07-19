import React, { useState, createContext, useContext } from 'react'
import { Toast } from './components/ui.jsx'
import { useToast } from './hooks/useToast.js'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import WorkspacesPage from './pages/WorkspacesPage.jsx'
import DocumentsPage from './pages/DocumentsPage.jsx'
import DocumentEditor from './pages/DocumentEditor.jsx'
import UsersPage from './pages/UsersPage.jsx'
import AuditLogsPage from './pages/AuditLogsPage.jsx'

export const ToastContext = createContext(null)
export const AppContext = createContext(null)

export function useAppContext() {
  return useContext(AppContext)
}

export function useToastContext() {
  return useContext(ToastContext)
}

export default function App() {
  const { toasts, toast, removeToast } = useToast()
  const [page, setPage] = useState('dashboard')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState(null)
  const [activeUser, setActiveUser] = useState(null)

  const navigate = (p, data = {}) => {
    setPage(p)
    if (data.doc !== undefined) setSelectedDoc(data.doc)
    if (data.workspace !== undefined) setSelectedWorkspace(data.workspace)
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard />
      case 'workspaces':    return <WorkspacesPage />
      case 'documents':     return <DocumentsPage />
      case 'document-editor': return <DocumentEditor doc={selectedDoc} />
      case 'users':         return <UsersPage />
      case 'audit-logs':    return <AuditLogsPage />
      default:              return <Dashboard />
    }
  }

  return (
    <ToastContext.Provider value={toast}>
      <AppContext.Provider value={{ page, navigate, selectedDoc, setSelectedDoc, selectedWorkspace, setSelectedWorkspace, activeUser, setActiveUser }}>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-gray-50)' }}>
          <Sidebar activePage={page} onNavigate={navigate} />
          <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {renderPage()}
          </main>
        </div>
        <Toast toasts={toasts} removeToast={removeToast} />
      </AppContext.Provider>
    </ToastContext.Provider>
  )
}
