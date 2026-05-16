import axios from "axios"
import { user_contextStore } from "./contextStrore";


const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true 
});



api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (originalRequest.url === '/refresh') {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                await api.post('/refresh');
                return api(originalRequest);
            } catch (refreshError) {
               window.location.href = '/auth';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);






export async function fetchUserInfo() {
  try {
    const response = await api.get('/getUserInfo');
    return response.data; 
  } catch (error) {
    console.error('Failed to fetch user info:', error);
    throw error;
  }
}




export async function fetchuserHistory(page,PAGE_SIZE) {
  try {
    const response = await api.get(`/getChatHistory?page=${page}&size=${PAGE_SIZE}`);
    // console.log('Chat history:', response.data);
    return response.data; 
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    throw error;
  }
}




export async function fetchOldMessages(chatId) {
  try {
    const response = await api.get(`/getChatMessages?chatId=${chatId}`);
    console.log('Old messages:', response.data);
    if(response.data && response.data.length === 1 && response.data[0].role=="human" ){
      response.data.push({
        role: "ai",
        content: ""
      });

    }
    return response.data; 
  } catch (error) {
    console.error('Failed to fetch old messages:', error);
    throw error;
  } 
}



 export function getGoogleAuthUrl() {
  const state = crypto.randomUUID() // CSRF token
  
  // Store state in a short-lived cookie (Next.js server action or API route)
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: `http://localhost:3000/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state }
}
