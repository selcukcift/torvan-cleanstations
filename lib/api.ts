import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

// Native Next.js API client - all functionality is now in Next.js
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
          signOut({ callbackUrl: '/login' }).catch(signOutError => {
            console.error('Error during sign out:', signOutError)
          })
        }
      }
      return Promise.reject(error)
    }
  )
}
attachResponseInterceptor(nextJsApiClient)

// Generic API helper functions (all using Next.js API routes)
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
