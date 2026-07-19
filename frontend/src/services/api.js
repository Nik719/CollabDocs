/**
 * API client — plain fetch (no axios, per Rules.md).
 *
 * Mirrors the axios response/error shape the pages rely on:
 *   resolves to { data, status }; rejects with err.response = { status, data }.
 */
const BASE_URL = '/api'

async function request(method, path, { params, data } = {}) {
  let url = BASE_URL + path
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    if (qs) url += `?${qs}`
  }
  const res = await fetch(url, {
    method,
    headers: data !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: data !== undefined ? JSON.stringify(data) : undefined,
  })
  const text = await res.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const error = new Error(body?.error || `Request failed with status ${res.status}`)
    error.response = { status: res.status, data: body }
    throw error
  }
  return { data: body, status: res.status }
}

const get = (path, opts) => request('GET', path, opts)
const post = (path, data) => request('POST', path, { data })
const put = (path, data) => request('PUT', path, { data })

// ---- Users ----
export const createUser = (data) => post('/users/', data)
export const getUser = (id) => get(`/users/${id}/`)
export const listUsers = () => get('/users/')

// ---- Workspaces ----
export const createWorkspace = (data) => post('/workspaces/', data)
export const getWorkspace = (id) => get(`/workspaces/${id}/`)
export const listWorkspaces = () => get('/workspaces/')
export const addMember = (workspaceId, data) => post(`/workspaces/${workspaceId}/members/`, data)
export const listMembers = (workspaceId) => get(`/workspaces/${workspaceId}/members/`)
export const getWorkspaceSummary = (workspaceId) => get(`/workspaces/${workspaceId}/summary/`)

// ---- Documents ----
export const createDocument = (data) => post('/documents/', data)
export const updateDocument = (id, data) => put(`/documents/${id}/`, data)
export const listDocuments = (params) => get('/documents/', { params })
export const getDocument = (id) => get(`/documents/${id}/`)
export const getVersions = (id) => get(`/documents/${id}/versions/`)
export const getDocStats = (id) => get(`/documents/${id}/stats/`)
export const addTags = (id, tags) => post(`/documents/${id}/tags/`, { tags })

// ---- Comments ----
export const createComment = (data) => post('/comments/', data)
export const listComments = (documentId) => get('/comments/', { params: { document: documentId } })

// ---- Tags ----
export const createTag = (data) => post('/tags/', data)
export const listTags = () => get('/tags/')

// ---- Audit Logs ----
export const listAuditLogs = (params) => get('/audit-logs/', { params })
