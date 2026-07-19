import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Modal, EmptyState, Avatar, Spinner, Badge } from '../components/ui.jsx'
import { createUser, getUser } from '../services/api.js'
import { useToastContext } from '../App.jsx'

export default function UsersPage() {
  const toast = useToastContext()
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [createdUsers, setCreatedUsers] = useState([])
  const [lookupId, setLookupId] = useState('')
  const [lookedUpUser, setLookedUpUser] = useState(null)
  const [looking, setLooking] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.first_name || !form.email || !form.phone) {
      toast.warning('First name, email, and phone are required')
      return
    }
    setCreating(true)
    try {
      const res = await createUser(form)
      const newUser = res.data
      setCreatedUsers(prev => [newUser, ...prev])
      toast.success('User created!')
      setShowCreate(false)
      setForm({ first_name: '', last_name: '', email: '', phone: '' })
    } catch (err) {
      const errData = err.response?.data
      if (errData?.email) toast.error('Email already in use')
      else if (errData?.phone) toast.error('Phone number already in use')
      else toast.error('Failed to create user')
    }
    setCreating(false)
  }

  async function handleLookup(e) {
    e.preventDefault()
    if (!lookupId.trim()) return
    setLooking(true)
    setLookedUpUser(null)
    try {
      const res = await getUser(lookupId.trim())
      setLookedUpUser(res.data)
    } catch (err) {
      toast.error(err.response?.status === 404 ? 'User not found' : 'Failed to lookup user')
    }
    setLooking(false)
  }

  function copyId(id) {
    navigator.clipboard.writeText(id)
    toast.success('UUID copied!')
  }

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>Users</h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-gray-500)', marginTop: 4 }}>
            Create users and look them up by ID.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon="+" variant="primary">
          New User
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Lookup by ID */}
        <Card>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--space-4)' }}>
            Look Up User
          </h2>
          <form onSubmit={handleLookup} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input
              placeholder="Paste User UUID..."
              value={lookupId}
              onChange={e => setLookupId(e.target.value)}
              style={{
                flex: 1, height: '2.5rem', padding: '0 var(--space-3)',
                border: '1px solid var(--color-gray-300)', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)', outline: 'none',
              }}
            />
            <Button type="submit" variant="secondary" size="md" loading={looking}>
              Find
            </Button>
          </form>
          {lookedUpUser && (
            <UserCard user={lookedUpUser} onCopy={copyId} />
          )}
        </Card>

        {/* Recently Created */}
        <Card>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--space-4)' }}>
            Created This Session
          </h2>
          {createdUsers.length === 0 ? (
            <EmptyState
              icon="◯"
              title="No users created yet"
              description="Users you create this session will appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {createdUsers.map(u => (
                <UserCard key={u.id} user={u} onCopy={copyId} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 'var(--space-6)',
        background: 'var(--color-brand-50)',
        border: '1px solid var(--color-brand-100)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex', gap: 'var(--space-3)',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ</span>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-brand-800)', lineHeight: 1.6 }}>
          <strong>Tip:</strong> Copy a user's UUID to use when creating workspaces (Owner ID), documents (Created By), or adding workspace members.
        </p>
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create User">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="First Name"
              placeholder="Alice"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              placeholder="Sharma"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <Input
            label="Email"
            placeholder="alice@example.com"
            type="text"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            placeholder="+911234567890"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            required
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function UserCard({ user, onCopy }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: 'var(--color-gray-50)',
      borderRadius: 'var(--radius-md)',
    }}>
      <Avatar name={`${user.first_name} ${user.last_name}`} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-900)' }}>
          {user.first_name} {user.last_name}
        </p>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </p>
        <p style={{
          fontSize: '0.65rem', color: 'var(--color-gray-400)',
          fontFamily: 'var(--font-mono)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {user.id}
        </p>
      </div>
      <button
        onClick={() => onCopy(user.id)}
        style={{
          padding: 'var(--space-1) var(--space-2)',
          fontSize: 'var(--text-xs)', color: 'var(--color-brand-600)',
          background: 'var(--color-brand-50)',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        Copy ID
      </button>
    </div>
  )
}
