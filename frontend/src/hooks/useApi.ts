import { API_CONFIG } from '../config';

interface ApiResponse<T = any> {
  data: T;
  error?: string;
}

export const useApi = () => {
  const baseUrl = API_CONFIG.backendUrl;

  const get = async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  const post = async <T>(endpoint: string, data: any): Promise<T> => {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return response.json();
  };

  return {
    get,
    post,
  };
}; 