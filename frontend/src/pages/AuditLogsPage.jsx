import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Badge, Avatar, EmptyState, Spinner } from '../components/ui.jsx'
import { listAuditLogs } from '../services/api.js'
import { useToastContext } from '../App.jsx'

export default function AuditLogsPage() {
  const toast = useToastContext()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ actor: '', from: '', to: '', model: '' })

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs(f = filters) {
    setLoading(true)
    try {
      const params = {}
      if (f.actor) params.actor = f.actor
      if (f.from) params.from = f.from
      if (f.to) params.to = f.to
      if (f.model) params.model = f.model
      const res = await listAuditLogs(params)
      const data = res.data
      setLogs(Array.isArray(data) ? data : data.results || [])
    } catch (_) {
      toast.error('Failed to load audit logs')
    }
    setLoading(false)
  }

  function handleChange(key, value) {
    setFilters(f => ({ ...f, [key]: value }))
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1000 }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Audit Logs</h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginTop: 4 }}>
          Track all actions performed on documents and resources.
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <Input
            label="Actor User ID"
            placeholder="Filter by user UUID"
            value={filters.actor}
            onChange={e => handleChange('actor', e.target.value)}
          />
          <Input
            label="From Date"
            type="date"
            value={filters.from}
            onChange={e => handleChange('from', e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={filters.to}
            onChange={e => handleChange('to', e.target.value)}
          />
          <Input
            label="Model"
            placeholder="e.g. Document"
            value={filters.model}
            onChange={e => handleChange('model', e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Button onClick={() => fetchLogs()} variant="primary" size="sm">Apply Filters</Button>
          <Button
            onClick={() => {
              const reset = { actor: '', from: '', to: '', model: '' }
              setFilters(reset)
              fetchLogs(reset)
            }}
            variant="secondary" size="sm"
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Log count */}
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>
        {logs.length} event{logs.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
          <Spinner size={28} color="var(--color-brand-500)" />
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <EmptyState
            icon="◈"
            title="No audit events"
            description="No activity matches your filters. Try adjusting the date range or clear filters."
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {logs.map(log => (
            <div key={log.id} style={{
              background: 'white',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
            }}>
              {/* Action indicator */}
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-full)',
                background: log.action === 'created' ? 'var(--color-success-bg)' : 'var(--color-info-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
                color: log.action === 'created' ? 'var(--color-success)' : 'var(--color-info)',
              }}>
                {log.action === 'created' ? '+' : '✎'}
              </div>

              {/* Avatar + Info */}
              <Avatar name={log.actor_name || '?'} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                  <strong>{log.actor_name || 'System'}</strong>
                  {' '}<span style={{ color: 'var(--color-gray-500)' }}>{log.action}</span>{' '}
                  <strong>{log.model_name}</strong>
                </p>
                <p style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)',
                  fontFamily: 'var(--font-mono)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginTop: 2,
                }}>
                  ID: {log.object_id}
                </p>
              </div>

              {/* Right side */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Badge variant={log.action === 'created' ? 'success' : 'info'}>
                  {log.action}
                </Badge>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 4 }}>
                  {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
