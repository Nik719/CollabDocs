import React from 'react'

/* ============================================================
   CollabDocs — Core UI Component Library
   ============================================================ */

// ---- Button ----
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, fullWidth = false,
  className = '', ...props
}) {
  const base = `
    inline-flex items-center justify-center gap-2 font-medium
    rounded-lg transition-all duration-200 focus-visible:outline-none
    focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed select-none
  `
  const variants = {
    primary: `
      bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800
      focus-visible:ring-brand-500
    `,
    secondary: `
      bg-white text-gray-700 border border-gray-200 hover:bg-gray-50
      active:bg-gray-100 focus-visible:ring-brand-500
    `,
    ghost: `
      text-gray-600 hover:bg-gray-100 active:bg-gray-200
      focus-visible:ring-gray-400
    `,
    danger: `
      bg-error text-white hover:bg-red-600 active:bg-red-700
      focus-visible:ring-red-500
    `,
    success: `
      bg-success text-white hover:bg-emerald-600 active:bg-emerald-700
      focus-visible:ring-emerald-500
    `,
  }
  const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-base',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        background: variant === 'primary' ? 'var(--color-brand-600)' : undefined,
        color: variant === 'primary' ? 'white' : undefined,
      }}
      {...props}
    >
      {loading ? <Spinner size={16} /> : icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

// ---- Input ----
export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          {label}
        </label>
      )}
      <input
        style={{
          height: '2.5rem',
          padding: '0 var(--space-3)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-gray-900)',
          background: 'white',
          transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
          outline: 'none',
          width: '100%',
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-brand-500)'
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-gray-300)'
          e.target.style.boxShadow = 'none'
        }}
        className={className}
        {...props}
      />
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{hint}</p>}
    </div>
  )
}

// ---- Textarea ----
export function Textarea({ label, error, hint, rows = 4, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        style={{
          padding: 'var(--space-3)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-gray-900)',
          background: 'white',
          transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
          outline: 'none',
          resize: 'vertical',
          width: '100%',
          lineHeight: 1.6,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--color-brand-500)'
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-gray-300)'
          e.target.style.boxShadow = 'none'
        }}
        className={className}
        {...props}
      />
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</p>}
      {hint && !error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{hint}</p>}
    </div>
  )
}

// ---- Select ----
export function Select({ label, error, options = [], className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-gray-700)' }}>
          {label}
        </label>
      )}
      <select
        style={{
          height: '2.5rem',
          padding: '0 var(--space-3)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-gray-300)'}`,
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-gray-900)',
          background: 'white',
          outline: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</p>}
    </div>
  )
}

// ---- Card ----
export function Card({ children, className = '', padding = true, hover = false, onClick, ...props }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: padding ? 'var(--space-6)' : undefined,
        transition: hover ? 'box-shadow var(--transition-base), border-color var(--transition-base), transform var(--transition-base)' : undefined,
        cursor: onClick ? 'pointer' : undefined,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = 'var(--color-brand-200)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--color-gray-200)'
        e.currentTarget.style.transform = 'translateY(0)'
      } : undefined}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

// ---- Badge ----
export function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default:    { bg: 'var(--color-gray-100)',         color: 'var(--color-gray-700)' },
    brand:      { bg: 'var(--color-brand-100)',        color: 'var(--color-brand-700)' },
    success:    { bg: 'var(--color-success-bg)',       color: '#065f46' },
    warning:    { bg: 'var(--color-warning-bg)',       color: '#92400e' },
    error:      { bg: 'var(--color-error-bg)',         color: '#991b1b' },
    info:       { bg: 'var(--color-info-bg)',          color: '#1e40af' },
    draft:      { bg: 'var(--color-draft-bg)',         color: '#92400e' },
    published:  { bg: 'var(--color-published-bg)',     color: '#065f46' },
    archived:   { bg: 'var(--color-archived-bg)',      color: 'var(--color-gray-600)' },
    admin:      { bg: 'var(--color-brand-100)',        color: 'var(--color-brand-700)' },
    editor:     { bg: 'var(--color-info-bg)',          color: '#1e40af' },
    viewer:     { bg: 'var(--color-success-bg)',       color: '#065f46' },
  }
  const v = variants[variant] || variants.default
  const sizes = {
    xs: { fontSize: '0.65rem', padding: '1px 6px' },
    sm: { fontSize: 'var(--text-xs)', padding: '2px 8px' },
    md: { fontSize: 'var(--text-sm)', padding: '4px 10px' },
  }
  const s = sizes[size] || sizes.sm

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: v.bg,
      color: v.color,
      borderRadius: 'var(--radius-full)',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      ...s
    }}>
      {children}
    </span>
  )
}

// ---- Avatar ----
export function Avatar({ name = '', size = 36 }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div style={{
      width: size, height: size,
      borderRadius: 'var(--radius-full)',
      background: `hsl(${hue}, 65%, 92%)`,
      color: `hsl(${hue}, 60%, 30%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 600,
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {initials}
    </div>
  )
}

// ---- Spinner ----
export function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 700ms linear infinite', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  )
}

// ---- EmptyState ----
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--space-16) var(--space-8)',
      textAlign: 'center', gap: 'var(--space-4)',
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56,
          background: 'var(--color-brand-50)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-brand-500)',
          fontSize: 24,
        }}>
          {icon}
        </div>
      )}
      <div>
        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 4 }}>{title}</h3>
        {description && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', maxWidth: 320 }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ---- Modal ----
export function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 'var(--space-4)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%', maxWidth: width,
          maxHeight: '90vh', overflow: 'auto',
          animation: 'fadeIn 180ms ease forwards',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-5) var(--space-6)',
            borderBottom: '1px solid var(--color-gray-100)',
          }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-gray-900)' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-gray-500)',
                transition: 'background var(--transition-fast)',
              }}
              onMouseEnter={e => e.target.style.background = 'var(--color-gray-100)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--space-6)' }}>{children}</div>
      </div>
    </div>
  )
}

// ---- Toast ----
export function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 'var(--z-toast)',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'white',
          border: `1px solid ${t.type === 'error' ? 'var(--color-error-bg)' : t.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-gray-200)'}`,
          borderLeft: `4px solid ${t.type === 'error' ? 'var(--color-error)' : t.type === 'success' ? 'var(--color-success)' : t.type === 'warning' ? 'var(--color-warning)' : 'var(--color-brand-500)'}`,
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 'var(--space-3) var(--space-4)',
          minWidth: 280, maxWidth: 360,
          animation: 'slideDown 200ms ease forwards',
        }}>
          <span style={{ fontSize: 16 }}>
            {t.type === 'error' ? '✕' : t.type === 'success' ? '✓' : t.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <p style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-gray-800)' }}>{t.message}</p>
          <button onClick={() => removeToast(t.id)} style={{ color: 'var(--color-gray-400)', fontSize: 14 }}>✕</button>
        </div>
      ))}
    </div>
  )
}

// ---- Divider ----
export function Divider({ label, margin = 'var(--space-6)' }) {
  if (!label) return (
    <hr style={{ border: 'none', borderTop: '1px solid var(--color-gray-200)', margin: `${margin} 0` }} />
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: `${margin} 0` }}>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
      <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-gray-200)' }} />
    </div>
  )
}

// ---- StatCard ----
export function StatCard({ label, value, icon, color = 'var(--color-brand-600)' }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)',
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1.2, marginTop: 2 }}>{value}</p>
      </div>
    </div>
  )
}
