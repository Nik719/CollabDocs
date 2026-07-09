import React from 'react'

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',   icon: '▦' },
  { id: 'workspaces',  label: 'Workspaces',  icon: '⬡' },
  { id: 'documents',   label: 'Documents',   icon: '◻' },
  { id: 'users',       label: 'Users',       icon: '◯' },
  { id: 'audit-logs',  label: 'Audit Logs',  icon: '◈' },
]

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: 232,
      flexShrink: 0,
      background: 'white',
      borderRight: '1px solid var(--color-gray-200)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: 'var(--space-5) var(--space-5)',
        borderBottom: '1px solid var(--color-gray-100)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--color-brand-600)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 16, fontWeight: 700,
          flexShrink: 0,
        }}>
          C
        </div>
        <div>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1.2 }}>CollabDocs</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>Collaborative Docs</p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: 'var(--space-3)', overflow: 'auto' }}>
        <p style={{
          fontSize: 'var(--text-xs)', fontWeight: 600,
          color: 'var(--color-gray-400)', textTransform: 'uppercase',
          letterSpacing: '0.07em', padding: 'var(--space-2) var(--space-3)',
          marginBottom: 'var(--space-1)',
        }}>
          Menu
        </p>
        {navItems.map(item => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-brand-700)' : 'var(--color-gray-600)',
                background: isActive ? 'var(--color-brand-50)' : 'transparent',
                transition: 'background var(--transition-fast), color var(--transition-fast)',
                marginBottom: 2,
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--color-gray-50)'
                  e.currentTarget.style.color = 'var(--color-gray-900)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-gray-600)'
                }
              }}
            >
              <span style={{
                width: 20, fontSize: 15,
                color: isActive ? 'var(--color-brand-600)' : 'var(--color-gray-400)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--color-gray-100)',
      }}>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', textAlign: 'center' }}>
          CollabDocs API v1.0
        </p>
      </div>
    </aside>
  )
}
