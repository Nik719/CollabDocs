import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Badge, Avatar, Modal, EmptyState, Spinner, StatCard } from '../components/ui.jsx'
import { listWorkspaces, createWorkspace, listMembers, addMember, getWorkspaceSummary, listUsers } from '../services/api.js'
import { useToastContext, useAppContext } from '../App.jsx'

export default function WorkspacesPage() {
  const toast = useToastContext()
  const { activeUser, navigate } = useAppContext()
  const [users, setUsers] = useState([])
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedWs, setSelectedWs] = useState(null)
  const [members, setMembers] = useState([])
  const [summary, setSummary] = useState(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [form, setForm] = useState({ name: '' })
  const [memberForm, setMemberForm] = useState({ user: '', role: 'viewer' })
  const [creating, setCreating] = useState(false)
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => { fetchWorkspaces(); fetchUsers() }, [])

  async function fetchUsers() {
    try {
      const res = await listUsers()
      const data = res.data
      setUsers(Array.isArray(data) ? data : data.results || [])
    } catch (_) {}
  }

  async function fetchWorkspaces() {
    setLoading(true)
    try {
      const res = await listWorkspaces()
      const data = res.data
      setWorkspaces(Array.isArray(data) ? data : data.results || [])
    } catch (_) {
      toast.error('Failed to load workspaces')
    }
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!activeUser) {
      toast.warning('Select an acting user first (sidebar)')
      navigate('users')
      return
    }
    if (!form.name.trim()) {
      toast.warning('Workspace name is required')
      return
    }
    setCreating(true)
    try {
      await createWorkspace({ name: form.name.trim(), owner: activeUser.id })
      toast.success('Workspace created!')
      setShowCreate(false)
      setForm({ name: '' })
      fetchWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create workspace')
    }
    setCreating(false)
  }

  async function handleSelectWs(ws) {
    setSelectedWs(ws)
    setSummary(null)
    setMembers([])
    try {
      const [membersRes, summaryRes] = await Promise.allSettled([
        listMembers(ws.id),
        getWorkspaceSummary(ws.id),
      ])
      if (membersRes.status === 'fulfilled') {
        const d = membersRes.value.data
        setMembers(Array.isArray(d) ? d : d.results || [])
      }
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data)
    } catch (_) {}
  }

  async function handleAddMember(e) {
    e.preventDefault()
    if (!memberForm.user) {
      toast.warning('Select a user to add')
      return
    }
    setAddingMember(true)
    try {
      await addMember(selectedWs.id, memberForm)
      toast.success('Member added!')
      setShowAddMember(false)
      setMemberForm({ user: '', role: 'viewer' })
      handleSelectWs(selectedWs)
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add member'
      toast.error(err.response?.status === 409 ? 'User is already a member' : msg)
    }
    setAddingMember(false)
  }

  const roleColor = { admin: 'admin', editor: 'editor', viewer: 'viewer' }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Workspaces</h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginTop: 4 }}>
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon="+" variant="primary">
          New Workspace
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedWs ? '1fr 1.4fr' : '1fr', gap: 'var(--space-6)' }}>
        {/* Workspace List */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
              <Spinner size={28} color="var(--color-brand-500)" />
            </div>
          ) : workspaces.length === 0 ? (
            <Card>
              <EmptyState
                icon="⬡"
                title="No workspaces yet"
                description="Create your first workspace to start collaborating."
                action={<Button onClick={() => setShowCreate(true)}>Create Workspace</Button>}
              />
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  onClick={() => handleSelectWs(ws)}
                  style={{
                    background: 'white',
                    border: `1px solid ${selectedWs?.id === ws.id ? 'var(--color-brand-300)' : 'var(--color-gray-200)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4) var(--space-5)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)',
                    boxShadow: selectedWs?.id === ws.id ? '0 0 0 3px rgba(99,102,241,0.12)' : 'var(--shadow-sm)',
                  }}
                  onMouseEnter={e => {
                    if (selectedWs?.id !== ws.id) e.currentTarget.style.borderColor = 'var(--color-gray-300)'
                  }}
                  onMouseLeave={e => {
                    if (selectedWs?.id !== ws.id) e.currentTarget.style.borderColor = 'var(--color-gray-200)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)' }}>{ws.name}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                        Owner: {ws.owner_name}
                      </p>
                    </div>
                    <Badge variant={ws.is_active ? 'success' : 'archived'}>
                      {ws.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                      ◯ {ws.member_count ?? 0} member{ws.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Detail Panel */}
        {selectedWs && (
          <div style={{ animation: 'fadeIn 200ms ease' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
                <div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>{selectedWs.name}</h2>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 2 }}>
                    Created by {selectedWs.owner_name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedWs(null)}
                  style={{ color: 'var(--color-gray-400)', fontSize: 18, padding: 4 }}
                >✕</button>
              </div>

              {/* Summary Stats */}
              {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                  <div style={{ background: 'var(--color-brand-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-brand-700)' }}>{summary.document_count}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-500)' }}>Documents</p>
                  </div>
                  <div style={{ background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#1e40af' }}>{summary.member_count}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: '#3b82f6' }}>Members</p>
                  </div>
                  <div style={{ background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: '#065f46' }}>{summary.total_comments}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>Comments</p>
                  </div>
                </div>
              )}

              {/* Members */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                  Members ({members.length})
                </h3>
                <Button size="sm" variant="secondary" onClick={() => setShowAddMember(true)}>
                  + Add Member
                </Button>
              </div>

              {members.length === 0 ? (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-400)', textAlign: 'center', padding: 'var(--space-6)' }}>
                  No members yet
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {members.map(m => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-gray-50)',
                    }}>
                      <Avatar name={m.user_detail?.first_name + ' ' + m.user_detail?.last_name} size={32} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-gray-900)' }}>
                          {m.user_detail?.first_name} {m.user_detail?.last_name}
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{m.user_detail?.email}</p>
                      </div>
                      <Badge variant={roleColor[m.role] || 'default'}>{m.role}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Workspace">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Workspace Name"
            placeholder="e.g. Engineering Team"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            background: 'var(--color-brand-50)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
          }}>
            <Avatar name={activeUser ? `${activeUser.first_name} ${activeUser.last_name}` : '?'} size={28} />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-800)' }}>
              Owner: <strong>{activeUser ? `${activeUser.first_name} ${activeUser.last_name}` : 'no acting user selected'}</strong> — added as admin automatically
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create Workspace</Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal open={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Select
            label="User"
            value={memberForm.user}
            onChange={e => setMemberForm(f => ({ ...f, user: e.target.value }))}
            options={[
              { value: '', label: 'Select a user...' },
              ...users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name} (${u.email})` })),
            ]}
          />
          <Select
            label="Role"
            value={memberForm.role}
            onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'viewer', label: 'Viewer' },
              { value: 'editor', label: 'Editor' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={addingMember}>Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
