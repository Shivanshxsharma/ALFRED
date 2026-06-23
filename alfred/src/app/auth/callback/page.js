// app/auth/callback/page.tsx
'use client'
import axios from 'axios'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AlfredLoader from '@/components/feedback/AlfredLoader'

export default function CallbackPage() {
  const router = useRouter()

  useEffect( () => {


    const handleGoogleAuth = async () => {
    const params = new URLSearchParams(window.location.search)
    const code  = params.get('code')
    const state = params.get('state')

    // Verify state — CSRF protection
    if (state !== sessionStorage.getItem('oauth_state')) {
      console.error('State mismatch — possible CSRF attack')
      router.push('/login')
      return
    }

        
    const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/google-auth`, { "code": code,"provider": "google" },
      {
      withCredentials: true
    })
     

    try {
      if (response.status === 200) {
        router.push('/chats') // Redirect to homepage on success
        } else {        
        console.error('Authentication failed:', response.data)
        router.push('/login')
      }
    } catch (error) {
      console.error('Error during authentication:', error)
      router.push('/login')
    }
    }

    handleGoogleAuth()




  }, [])

  return <AlfredLoader/>
}