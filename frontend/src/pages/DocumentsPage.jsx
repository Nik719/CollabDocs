import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Badge, Modal, EmptyState, Spinner, Textarea, Divider } from '../components/ui.jsx'
import { listDocuments, createDocument, listWorkspaces, addTags, listTags } from '../services/api.js'
import { useToastContext, useAppContext } from '../App.jsx'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

export default function DocumentsPage() {
  const toast = useToastContext()
  const { navigate } = useAppContext()
  const [docs, setDocs] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filters, setFilters] = useState({ workspace: '', status: '', search: '' })
  const [form, setForm] = useState({ title: '', content: '', workspace: '', created_by: '', status: 'draft' })
  const [tagsInput, setTagsInput] = useState('')

  useEffect(() => {
    fetchWorkspaces()
    fetchDocs()
  }, [])

  async function fetchWorkspaces() {
    try {
      const res = await listWorkspaces()
      const data = res.data
      setWorkspaces(Array.isArray(data) ? data : data.results || [])
    } catch (_) {}
  }

  async function fetchDocs(f = filters) {
    setLoading(true)
    try {
      const params = {}
      if (f.workspace) params.workspace = f.workspace
      if (f.status) params.status = f.status
      if (f.search) params.search = f.search
      const res = await listDocuments(params)
      const data = res.data
      setDocs(Array.isArray(data) ? data : data.results || [])
    } catch (_) {
      toast.error('Failed to load documents')
    }
    setLoading(false)
  }

  function handleFilterChange(key, value) {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    fetchDocs(newFilters)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.workspace || !form.created_by.trim()) {
      toast.warning('Title, Workspace, and Creator ID are required')
      return
    }
    setCreating(true)
    try {
      const res = await createDocument({
        title: form.title.trim(),
        content: form.content,
        workspace: form.workspace,
        created_by: form.created_by.trim(),
        status: form.status,
      })
      const newDoc = res.data

      // Add tags if any
      if (tagsInput.trim()) {
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        if (tags.length) await addTags(newDoc.id, tags)
      }

      toast.success('Document created!')
      setShowCreate(false)
      setForm({ title: '', content: '', workspace: '', created_by: '', status: 'draft' })
      setTagsInput('')
      fetchDocs()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create document')
    }
    setCreating(false)
  }

  const statusColor = { draft: 'draft', published: 'published', archived: 'archived' }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Documents</h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginTop: 4 }}>
            {docs.length} document{docs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon="+" variant="primary">
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)',
        flexWrap: 'wrap',
      }}>
        <input
          placeholder="Search title or content..."
          value={filters.search}
          onChange={e => handleFilterChange('search', e.target.value)}
          style={{
            height: '2.5rem', padding: '0 var(--space-3)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)', flex: '1 1 220px',
            outline: 'none', background: 'white',
          }}
        />
        <select
          value={filters.workspace}
          onChange={e => handleFilterChange('workspace', e.target.value)}
          style={{
            height: '2.5rem', padding: '0 var(--space-3)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)', background: 'white',
            cursor: 'pointer', flex: '0 0 180px',
          }}
        >
          <option value="">All Workspaces</option>
          {workspaces.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
          style={{
            height: '2.5rem', padding: '0 var(--space-3)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)', background: 'white',
            cursor: 'pointer', flex: '0 0 160px',
          }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
          <Spinner size={28} color="var(--color-brand-500)" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <EmptyState
            icon="◻"
            title="No documents found"
            description="Try adjusting your filters or create a new document."
            action={<Button onClick={() => setShowCreate(true)}>Create Document</Button>}
          />
        </Card>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--space-4)',
        }}>
          {docs.map(doc => (
            <div
              key={doc.id}
              onClick={() => navigate('document-editor', { doc })}
              style={{
                background: 'white',
                border: '1px solid var(--color-gray-200)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-sm)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                e.currentTarget.style.borderColor = 'var(--color-brand-200)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)',
                  background: 'var(--color-brand-50)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-brand-600)', fontSize: 16, flexShrink: 0,
                }}>
                  ◻
                </div>
                <Badge variant={statusColor[doc.status] || 'default'}>{doc.status}</Badge>
              </div>

              <h3 style={{
                fontSize: 'var(--text-base)', fontWeight: 600,
                color: 'var(--color-gray-900)', marginBottom: 'var(--space-2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {doc.title}
              </h3>

              <p style={{
                fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)',
                overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                marginBottom: 'var(--space-4)',
                lineHeight: 1.5,
              }}>
                {doc.content || 'No content yet.'}
              </p>

              {/* Tags */}
              {doc.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                  {doc.tags.slice(0, 3).map(tag => (
                    <Badge key={tag.id || tag.name} variant="brand" size="xs">{tag.name}</Badge>
                  ))}
                  {doc.tags.length > 3 && (
                    <Badge variant="default" size="xs">+{doc.tags.length - 3}</Badge>
                  )}
                </div>
              )}

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-gray-100)',
              }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                  {doc.workspace_name}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                  v{doc.version_count || 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Document Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Document" width={560}>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Title"
            placeholder="Document title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
          <Select
            label="Workspace"
            value={form.workspace}
            onChange={e => setForm(f => ({ ...f, workspace: e.target.value }))}
            options={[
              { value: '', label: 'Select a workspace...' },
              ...workspaces.map(ws => ({ value: ws.id, label: ws.name }))
            ]}
          />
          <Input
            label="Created By (User ID)"
            placeholder="UUID of the author"
            value={form.created_by}
            onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
            required
          />
          <Select
            label="Status"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <Textarea
            label="Content"
            placeholder="Start writing..."
            rows={5}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          />
          <Input
            label="Tags (optional)"
            placeholder="python, backend, api (comma-separated)"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            hint="Separate tags with commas"
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create Document</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
