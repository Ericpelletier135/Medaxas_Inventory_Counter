import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject the token securely on every request
client.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle 401s globally ensuring best practice 
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (!refreshToken) {
        return Promise.reject(error); // Trigger logout later where appropriate
      }

      try {
        const refreshRes = await axios.post(
          `${API_URL}/api/auth/refresh`,
          new URLSearchParams({ refresh_token: refreshToken }).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const newAccessToken = refreshRes.data.access_token;
        const newRefreshToken = refreshRes.data.refresh_token;

        await SecureStore.setItemAsync('access_token', newAccessToken);
        await SecureStore.setItemAsync('refresh_token', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    console.error('API Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default client;
