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











// ─────────────────────────────────────────────────────────────────────────────
// Add these two functions to your existing fetch_info.js
// The existing axios `api` instance is already configured correctly:
//   - baseURL: 'http://localhost:8000'
//   - withCredentials: true   ← sends your auth cookies
//   - 401 interceptor         ← auto-refreshes token if expired
// ─────────────────────────────────────────────────────────────────────────────


// ── Trigger 1: New Chat button ────────────────────────────────────────────────
//
// Uses your axios api instance — gets the 401 refresh interceptor for free.
// Call this BEFORE navigating to the new chat page.
// Fire-and-forget — no need to await at the call site.
//
// Usage:
//   import { fireSessionEnd } from "@/store/fetch_info"
//   fireSessionEnd(curr_chatid)   // non-blocking
//   router.push("/chats")
//
export async function fireSessionEnd(chatId) {
  if (!chatId) return;
  try {
    await api.post(`/session-end/${chatId}`);
  } catch (error) {
    // Non-fatal — summarizer failure should never block the user
    console.error("[session-end] axios trigger failed:", error);
  }
}


// ── Trigger 2: Tab close (beforeunload) ───────────────────────────────────────
//
// Uses navigator.sendBeacon — the ONLY reliable way to fire on tab close.
// axios / fetch get cancelled when the tab closes before they complete.
// sendBeacon is queued by the browser and guaranteed to finish even mid-close.
//
// ⚠️  sendBeacon is cross-origin here (localhost:3000 → localhost:8000).
//     Cookies ARE sent as long as your FastAPI CORS is configured with:
//       allow_origins=["http://localhost:3000"]
//       allow_credentials=True
//     Which you already have in your CORSMiddleware.
//
// Usage: call this inside a beforeunload event listener only.
//
export function fireSessionEndBeacon(chatId) {
  if (!chatId) return;
  // sendBeacon sends a POST — no body needed, auth comes from cookies
  navigator.sendBeacon(
    `http://localhost:8000/session-end/${chatId}`
  );
}





// services/fetch_info.js — add this alongside your existing functions
// services/fetch_info.js
export async function logoutUser() {
  try {
    const res = await api.post('/logout',
      { withCredentials: true }   // axios equivalent of fetch's credentials: "include"
    )
    return res.data   // ✅ axios already parses JSON — no res.json() needed
  } catch (err) {
    console.error("Logout error:", err)
    throw err
  }
}