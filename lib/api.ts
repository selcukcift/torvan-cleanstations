import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// [Per Coding Prompt Chains v5 - Hybrid Backend]
// Provide two distinct Axios clients for clarity

// Plain Node.js backend (core data/auth)
export const plainNodeApiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Next.js API routes (order workflow, configurator, accessories, uploads)
export const nextJsApiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Add response interceptor to handle auth errors
const attachResponseInterceptor = (client: AxiosInstance) => {
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Let NextAuth handle the auth error
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          // Import signOut dynamically to avoid SSR issues
          const { signOut } = await import('next-auth/react')
          signOut({ callbackUrl: '/login' })
        }
      }
      return Promise.reject(error)
    }
  )
}
attachResponseInterceptor(plainNodeApiClient)
attachResponseInterceptor(nextJsApiClient)

// Generic API helper functions (default to nextJsApiClient for new features)
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    nextJsApiClient.get(url, config),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    nextJsApiClient.post(url, data, config),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    nextJsApiClient.put(url, data, config),
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    nextJsApiClient.delete(url, config),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    nextJsApiClient.patch(url, data, config),
}

export default api
