// fetch_info.js
import axios from "axios"
import { user_contextStore } from "./contextStrore";


const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true 
});


// ── Refresh state — single source of truth for "when did we last refresh" ───
let lastRefreshTime = 0;
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60_000;
const REFRESH_BUFFER_MS = 60_000;

// Every successful refresh, from ANY code path, goes through here so the
// clock never drifts out of sync across the interceptor / proactive check / SSE recovery.
export async function doRefresh() {
  await api.post('/refresh');
  lastRefreshTime = Date.now();
}

// Call this before opening any connection that the axios interceptor can't
// protect (e.g. fetchEventSource for SSE). Skips the call entirely if a
// refresh already happened recently enough.
export async function ensureFreshToken() {
  const now = Date.now();
  if (now - lastRefreshTime > (ACCESS_TOKEN_LIFETIME_MS - REFRESH_BUFFER_MS)) {
    try {
      await doRefresh();
    } catch (err) {
      console.error("Proactive refresh failed:", err);
      // let the caller's own 401 handling be the fallback
    }
  }
}


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
                await doRefresh();
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


export async function fetchuserHistory(page, PAGE_SIZE) {
  try {
    const response = await api.get(`/getChatHistory?page=${page}&size=${PAGE_SIZE}`);
    return response.data; 
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    throw error;
  }
}


export async function fetchOldMessages(chatId) {
  try {
    const response = await api.get(`/getChatMessages?chatId=${chatId}`);
    if (response.data && response.data.length === 1 && response.data[0].role == "human") {
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
  
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    redirect_uri: `http://localhost:3000/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state }
}


// ── Session-end triggers ──────────────────────────────────────────────────────
// Trigger 1: New Chat button — fire-and-forget, non-blocking.
export async function fireSessionEnd(chatId) {
  if (!chatId) return;
  try {
    await api.post(`/session-end/${chatId}`);
  } catch (error) {
    // Non-fatal — summarizer failure should never block the user
    console.error("[session-end] axios trigger failed:", error);
  }
}


// Trigger 2: Tab close (beforeunload) — sendBeacon is the only reliable
// way to fire on tab close; axios/fetch get cancelled mid-close.
export function fireSessionEndBeacon(chatId) {
  if (!chatId) return;
  navigator.sendBeacon(
    `http://localhost:8000/session-end/${chatId}`
  );
}


export async function logoutUser() {
  try {
    const res = await api.post('/logout',
      { withCredentials: true }
    )
    return res.data
  } catch (err) {
    console.error("Logout error:", err)
    throw err
  }
}


export async function saveProviderKey(provider, key) {
  try {
    const response = await api.post(`/api-keys`, {
      provider,
      api_key: key
    });
    return response.data; 
  } catch (error) {
    console.error('Failed to save provider key:', error);
    throw error;
  }
}