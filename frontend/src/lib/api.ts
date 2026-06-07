import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const aiApi = {
  chat: async (messages: { role: string; content: string }[], provider: string, market: string, context: string) => {
    const res = await api.post('/ai/chat', { messages, provider, market, context })
    return res.data
  },
  summary: async (connections: unknown[], consumption: unknown, market: string) => {
    const res = await api.post('/ai/summary', { connections, consumption, market })
    return res.data
  },
}
