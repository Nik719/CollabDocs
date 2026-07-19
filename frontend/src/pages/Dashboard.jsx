import React, { useState, useEffect } from 'react'
import { Card, StatCard, Badge, Avatar, Spinner, EmptyState } from '../components/ui.jsx'
import { listWorkspaces, listDocuments, listAuditLogs } from '../services/api.js'
import { useAppContext } from '../App.jsx'

export default function Dashboard() {
  const { navigate } = useAppContext()
  const [stats, setStats] = useState({ workspaces: 0, documents: 0, published: 0 })
  const [recentDocs, setRecentDocs] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [wsRes, docRes, logRes] = await Promise.allSettled([
          listWorkspaces(),
          listDocuments(),
          listAuditLogs(),
        ])
        if (wsRes.status === 'fulfilled') {
          const ws = wsRes.value.data
          setStats(prev => ({
            ...prev,
            workspaces: Array.isArray(ws) ? ws.length : ws.count || 0
          }))
        }
        if (docRes.status === 'fulfilled') {
          const docs = docRes.value.data
          const docList = Array.isArray(docs) ? docs : docs.results || []
          setRecentDocs(docList.slice(0, 5))
          const published = docList.filter(d => d.status === 'published').length
          setStats(prev => ({ ...prev, documents: docList.length, published }))
        }
        if (logRes.status === 'fulfilled') {
          const logs = logRes.value.data
          const logList = Array.isArray(logs) ? logs : logs.results || []
          setAuditLogs(logList.slice(0, 6))
        }
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [])

  const statusColor = { draft: 'draft', published: 'published', archived: 'archived' }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1.2 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginTop: 4 }}>
          Welcome back — here's what's happening in CollabDocs.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
          <Spinner size={32} color="var(--color-brand-500)" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--space-4)', marginBottom: 'var(--space-8)',
          }}>
            <StatCard label="Workspaces" value={stats.workspaces} icon="⬡" color="var(--color-brand-600)" />
            <StatCard label="Documents" value={stats.documents} icon="◻" color="var(--color-info)" />
            <StatCard label="Published" value={stats.published} icon="✓" color="var(--color-success)" />
            <StatCard label="Audit Events" value={auditLogs.length} icon="◈" color="var(--color-warning)" />
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            {/* Recent Documents */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)' }}>Recent Documents</h2>
                <button
                  onClick={() => navigate('documents')}
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-600)', fontWeight: 500 }}
                >
                  View all →
                </button>
              </div>
              {recentDocs.length === 0 ? (
                <EmptyState
                  icon="◻"
                  title="No documents yet"
                  description="Create your first document in a workspace."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {recentDocs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => navigate('document-editor', { doc })}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 'var(--text-sm)', fontWeight: 500,
                          color: 'var(--color-gray-900)', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {doc.title}
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                          {doc.workspace_name}
                        </p>
                      </div>
                      <Badge variant={statusColor[doc.status] || 'default'}>{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Audit Log */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)' }}>Recent Activity</h2>
                <button
                  onClick={() => navigate('audit-logs')}
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-600)', fontWeight: 500 }}
                >
                  View all →
                </button>
              </div>
              {auditLogs.length === 0 ? (
                <EmptyState icon="◈" title="No activity yet" description="Actions on documents will appear here." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {auditLogs.map(log => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      <Avatar name={log.actor_name || '?'} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-800)' }}>
                          <strong>{log.actor_name || 'Unknown'}</strong>
                          {' '}<span style={{ color: 'var(--color-gray-500)' }}>{log.action}</span>{' '}
                          <span style={{ color: 'var(--color-gray-500)' }}>{log.model_name}</span>
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={log.action === 'created' ? 'success' : 'info'} size="xs">
                        {log.action}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
