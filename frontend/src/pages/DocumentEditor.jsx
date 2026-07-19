import React, { useState, useEffect } from 'react'
import { Button, Badge, Avatar, Spinner, Card, Input, Divider, Modal, Textarea } from '../components/ui.jsx'
import { getDocument, updateDocument, getVersions, getDocStats, listComments, createComment, addTags } from '../services/api.js'
import { useToastContext, useAppContext } from '../App.jsx'

export default function DocumentEditor({ doc: initialDoc }) {
  const toast = useToastContext()
  const { navigate, activeUser } = useAppContext()
  const [doc, setDoc] = useState(initialDoc)
  const [content, setContent] = useState(initialDoc?.content || '')
  const [title, setTitle] = useState(initialDoc?.title || '')
  const [status, setStatus] = useState(initialDoc?.status || 'draft')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [versions, setVersions] = useState([])
  const [stats, setStats] = useState(null)
  const [comments, setComments] = useState([])
  const [activeTab, setActiveTab] = useState('editor')
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [postingComment, setPostingComment] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagModal, setShowTagModal] = useState(false)
  const [addingTags, setAddingTags] = useState(false)

  useEffect(() => {
    if (!doc?.id) return
    loadVersions()
    loadStats()
    loadComments()
  }, [doc?.id])

  async function loadVersions() {
    try {
      const res = await getVersions(doc.id)
      const data = res.data
      setVersions(Array.isArray(data) ? data : data.results || [])
    } catch (_) {}
  }

  async function loadStats() {
    try {
      const res = await getDocStats(doc.id)
      setStats(res.data)
    } catch (_) {}
  }

  async function loadComments() {
    try {
      const res = await listComments(doc.id)
      const data = res.data
      setComments(Array.isArray(data) ? data : data.results || [])
    } catch (_) {}
  }

  async function handleSave() {
    if (!title.trim()) { toast.warning('Title cannot be empty'); return }
    setSaving(true)
    try {
      const res = await updateDocument(doc.id, {
        title: title.trim(),
        content,
        workspace: doc.workspace,
        created_by: doc.created_by,
        status,
        saved_by: activeUser?.id || doc.created_by,
      })
      setDoc(res.data)
      setDirty(false)
      toast.success('Saved — new version created')
      loadVersions()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save')
    }
    setSaving(false)
  }

  async function handlePostComment(e) {
    e.preventDefault()
    if (!newComment.trim()) { toast.warning('Comment cannot be empty'); return }
    if (!activeUser) { toast.warning('Select an acting user first (sidebar)'); return }
    setPostingComment(true)
    try {
      await createComment({
        document: doc.id,
        author: activeUser.id,
        content: newComment.trim(),
        parent: replyTo,
      })
      toast.success('Comment posted')
      setNewComment('')
      setReplyTo(null)
      loadComments()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post comment')
    }
    setPostingComment(false)
  }

  async function handleAddTags(e) {
    e.preventDefault()
    if (!tagInput.trim()) return
    setAddingTags(true)
    try {
      const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
      await addTags(doc.id, tags)
      toast.success(`Added ${tags.length} tag(s)`)
      setTagInput('')
      setShowTagModal(false)
      const res = await getDocument(doc.id)
      setDoc(res.data)
    } catch (_) {
      toast.error('Failed to add tags')
    }
    setAddingTags(false)
  }

  const statusColor = { draft: 'draft', published: 'published', archived: 'archived' }
  const tabs = [
    { id: 'editor', label: 'Editor' },
    { id: 'versions', label: `Versions (${versions.length})` },
    { id: 'comments', label: `Comments (${stats?.comment_count ?? comments.length})` },
  ]

  if (!doc) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--color-gray-400)' }}>No document selected</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--color-gray-200)',
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('documents')}
          style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          ← Documents
        </button>

        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
            style={{
              fontSize: 'var(--text-xl)', fontWeight: 700,
              border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--color-gray-900)', width: '100%',
            }}
            placeholder="Document title"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setDirty(true) }}
            style={{
              height: 32, padding: '0 var(--space-2)',
              border: '1px solid var(--color-gray-300)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)', background: 'white', cursor: 'pointer',
            }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <Button size="sm" variant="secondary" onClick={() => setShowTagModal(true)}>⊕ Tags</Button>

          <Button
            size="sm"
            variant={dirty ? 'primary' : 'secondary'}
            loading={saving}
            onClick={handleSave}
          >
            {dirty ? '● Save' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{
          background: 'var(--color-gray-50)',
          borderBottom: '1px solid var(--color-gray-200)',
          padding: 'var(--space-2) var(--space-6)',
          display: 'flex', gap: 'var(--space-6)', alignItems: 'center',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
            ◻ {stats.version_count} version{stats.version_count !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
            ◯ {stats.comment_count} comment{stats.comment_count !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
            ✦ {stats.contributor_count} contributor{stats.contributor_count !== 1 ? 's' : ''}
          </span>
          {/* Tags */}
          {doc.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {doc.tags.map(tag => (
                <Badge key={tag.id || tag.name} variant="brand" size="xs">{tag.name}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--color-gray-200)',
        padding: '0 var(--space-6)',
        display: 'flex', gap: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--text-sm)', fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--color-brand-600)' : 'var(--color-gray-500)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-brand-600)' : '2px solid transparent',
              transition: 'color var(--transition-fast)',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-8)' }}>
        {activeTab === 'editor' && (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value); setDirty(true) }}
              placeholder="Start writing your document..."
              style={{
                width: '100%', minHeight: 480,
                border: 'none', outline: 'none',
                fontSize: 'var(--text-base)', lineHeight: 1.8,
                color: 'var(--color-gray-800)',
                background: 'transparent',
                resize: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        )}

        {activeTab === 'versions' && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--space-5)' }}>
              Version History
            </h3>
            {versions.length === 0 ? (
              <p style={{ color: 'var(--color-gray-400)', textAlign: 'center', padding: 'var(--space-10)' }}>No versions yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[...versions].reverse().map((v, i) => (
                  <div key={v.id} style={{
                    background: 'white',
                    border: '1px solid var(--color-gray-200)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-4) var(--space-5)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 'var(--radius-full)',
                          background: i === 0 ? 'var(--color-brand-600)' : 'var(--color-gray-200)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'var(--text-xs)', fontWeight: 700,
                          color: i === 0 ? 'white' : 'var(--color-gray-500)',
                          flexShrink: 0,
                        }}>
                          {v.version_number}
                        </div>
                        <div>
                          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                            Version {v.version_number}
                            {i === 0 && <span style={{ marginLeft: 8, fontSize: 'var(--text-xs)', color: 'var(--color-brand-600)', fontWeight: 500 }}>Latest</span>}
                          </p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                            {v.saved_by_name ? `by ${v.saved_by_name}` : 'Unknown'} · {new Date(v.saved_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p style={{
                      fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)',
                      background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                      lineHeight: 1.6,
                    }}>
                      {v.content || '(empty)'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 'var(--space-5)' }}>
              Comments
            </h3>

            {/* Comment list */}
            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>
                No comments yet. Start the conversation.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                {comments.map(comment => (
                  <CommentThread key={comment.id} comment={comment} onReply={id => setReplyTo(id)} />
                ))}
              </div>
            )}

            <Divider label="Add a comment" />

            {/* New comment form */}
            <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              {replyTo && (
                <div style={{
                  background: 'var(--color-brand-50)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-700)' }}>
                    Replying to comment
                  </span>
                  <button type="button" onClick={() => setReplyTo(null)} style={{ fontSize: 12, color: 'var(--color-brand-500)' }}>
                    ✕ Cancel reply
                  </button>
                </div>
              )}
              {activeUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Avatar name={`${activeUser.first_name} ${activeUser.last_name}`} size={24} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                    Commenting as <strong>{activeUser.first_name} {activeUser.last_name}</strong>
                  </span>
                </div>
              )}
              <Textarea
                placeholder="Write a comment..."
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <Button type="submit" loading={postingComment} variant="primary">
                {replyTo ? 'Post Reply' : 'Post Comment'}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Tag Modal */}
      <Modal open={showTagModal} onClose={() => setShowTagModal(false)} title="Add Tags">
        <form onSubmit={handleAddTags} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Tags"
            placeholder="python, backend, api (comma-separated)"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            hint="Separate multiple tags with commas"
          />
          {doc.tags?.length > 0 && (
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 6 }}>Current tags:</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {doc.tags.map(t => <Badge key={t.id} variant="brand">{t.name}</Badge>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setShowTagModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={addingTags}>Add Tags</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function CommentThread({ comment, onReply }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid var(--color-gray-200)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Avatar name={comment.author_name || '?'} size={32} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-900)' }}>
              {comment.author_name || 'Unknown'}
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
              {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', marginTop: 4, lineHeight: 1.6 }}>
            {comment.content}
          </p>
          <button
            onClick={() => onReply(comment.id)}
            style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-600)', marginTop: 6, fontWeight: 500 }}
          >
            ↩ Reply
          </button>
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div style={{ marginLeft: 44, marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {comment.replies.map(reply => (
            <div key={reply.id} style={{
              borderLeft: '2px solid var(--color-gray-200)',
              paddingLeft: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                <Avatar name={reply.author_name || '?'} size={24} />
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-gray-900)' }}>
                    {reply.author_name || 'Unknown'}
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)', lineHeight: 1.6 }}>{reply.content}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', marginTop: 2 }}>
                    {new Date(reply.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
