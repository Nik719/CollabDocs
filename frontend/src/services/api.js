import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ---- Users ----
export const createUser = (data) => api.post('/users/', data)
export const getUser = (id) => api.get(`/users/${id}/`)

// ---- Workspaces ----
export const createWorkspace = (data) => api.post('/workspaces/', data)
export const getWorkspace = (id) => api.get(`/workspaces/${id}/`)
export const listWorkspaces = () => api.get('/workspaces/')
export const addMember = (workspaceId, data) => api.post(`/workspaces/${workspaceId}/members/`, data)
export const listMembers = (workspaceId) => api.get(`/workspaces/${workspaceId}/members/`)
export const getWorkspaceSummary = (workspaceId) => api.get(`/workspaces/${workspaceId}/summary/`)

// ---- Documents ----
export const createDocument = (data) => api.post('/documents/', data)
export const updateDocument = (id, data) => api.put(`/documents/${id}/`, data)
export const listDocuments = (params) => api.get('/documents/', { params })
export const getDocument = (id) => api.get(`/documents/${id}/`)
export const getVersions = (id) => api.get(`/documents/${id}/versions/`)
export const getDocStats = (id) => api.get(`/documents/${id}/stats/`)
export const addTags = (id, tags) => api.post(`/documents/${id}/tags/`, { tags })

// ---- Comments ----
export const createComment = (data) => api.post('/comments/', data)
export const listComments = (documentId) => api.get('/comments/', { params: { document: documentId } })

// ---- Tags ----
export const createTag = (data) => api.post('/tags/', data)
export const listTags = () => api.get('/tags/')

// ---- Audit Logs ----
export const listAuditLogs = (params) => api.get('/audit-logs/', { params })

export default api
