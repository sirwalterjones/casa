import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse } from '@/types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Use environment variable for WordPress URL (supports GCP Cloud Run)
    this.baseURL = process.env.NEXT_PUBLIC_WORDPRESS_URL ||
                   (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000');
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add Formidable Forms API key for frm/v2 endpoints using Basic Auth
        if (config.url && config.url.includes('/frm/v2/')) {
          config.headers.Authorization = `Basic ${btoa('1L5B-SY7E-7J6S-DOAN:x')}`;
        }
        
        // Note: Removed X-Tenant-ID header to avoid CORS issues in development

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - remove with path to match how they were set
          const removeOptions = { path: '/' };
          Cookies.remove('auth_token', removeOptions);
          Cookies.remove('user_data', removeOptions);
          Cookies.remove('organization_id', removeOptions);
          Cookies.remove('tenant_id', removeOptions);

          // Redirect to login (you might want to use router here)
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.get(endpoint, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.post(endpoint, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.put(endpoint, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Generic DELETE request
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.delete(endpoint, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // File upload with progress
  async uploadFile(
    endpoint: string,
    file: File,
    fieldName: string = 'file',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      };

      const response = await this.client.post(endpoint, formData, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // WordPress specific endpoints
  async wpGet<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.get(`/wp-json/${endpoint}`, config);
  }

  async wpPost<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.post(`/wp-json/${endpoint}`, data, config);
  }

  async wpPut<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.put(`/wp-json/${endpoint}`, data, config);
  }

  async wpDelete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.delete(`/wp-json/${endpoint}`, config);
  }

  // Formidable Forms specific endpoints
  async frmGet<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.get(`/wp-json/frm/v2/${endpoint}`, config);
  }

  async frmPost<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.post(`/wp-json/frm/v2/${endpoint}`, data, config);
  }
  
  async frmPut<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.put(`/wp-json/frm/v2/${endpoint}`, data, config);
  }

  // Custom CASA endpoints
  async casaGet<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.get(`/wp-json/casa/v1/${endpoint}`, config);
  }

  async casaPost<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Handle FormData uploads by removing Content-Type header to let browser set it
    let requestConfig = config;
    if (data instanceof FormData) {
      requestConfig = {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': undefined, // Let browser set multipart/form-data with boundary
        },
      };
    }
    return this.post(`/wp-json/casa/v1/${endpoint}`, data, requestConfig);
  }

  async casaPut<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.put(`/wp-json/casa/v1/${endpoint}`, data, config);
  }

  async casaDelete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.delete(`/wp-json/casa/v1/${endpoint}`, config);
  }

  // Legacy SaaS endpoints (keeping for backward compatibility)
  async saasGet<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.casaGet(endpoint, config);
  }

  async saasPost<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.casaPost(endpoint, data, config);
  }

  async saasPut<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.casaPut(endpoint, data, config);
  }

  async saasDelete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.casaDelete(endpoint, config);
  }

  private handleError(error: any): ApiResponse<any> {
    let errorMessage: string = 'An unexpected error occurred';
    
    if (error.response) {
      // Server responded with error status
      const msg = error.response.data?.message;
      if (typeof msg === 'string') {
        errorMessage = msg;
      } else if (msg && typeof msg === 'object') {
        try {
          errorMessage = JSON.stringify(msg);
        } catch {
          errorMessage = error.response.statusText || errorMessage;
        }
      } else {
        errorMessage = error.response.statusText || errorMessage;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      // Error in request setup
      errorMessage = error.message || errorMessage;
    }

    console.error('API Error:', error);

    return {
      success: false,
      error: errorMessage,
    };
  }

  // Utility method to set tenant context
  setTenant(tenantId: string): void {
    Cookies.set('tenant_id', tenantId, { expires: 7 });
  }

  // Utility method to get current tenant
  getCurrentTenant(): string | undefined {
    return Cookies.get('tenant_id');
  }

  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/wp-json/wp/v2/');
      return response.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;