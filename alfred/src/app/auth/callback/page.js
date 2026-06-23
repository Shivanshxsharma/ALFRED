'use client'
import axios from 'axios'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AlfredLoader from '@/components/feedback/AlfredLoader'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleGoogleAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code  = params.get('code')
        const state = params.get('state')

        if (state !== sessionStorage.getItem('oauth_state')) {
          console.error('State mismatch — possible CSRF attack')
          router.push('/auth')
          return
        }

        if (!code) {
          console.error('No code in callback URL')
          router.push('/auth')
          return
        }

        // ✅ try/catch wraps the actual request
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/google-auth`,
          { code, provider: "google" },
          { withCredentials: true }
        )

        if (response.status === 200) {
          router.push('/chats')
        } else {
          console.error('Authentication failed:', response.data)
          router.push('/auth')
        }

      } catch (error) {
        // ✅ now actually catches axios errors too
        console.error('Error during Google authentication:', error.response?.data || error)
        router.push('/auth')
      }
    }

    handleGoogleAuth()
  }, [])

  return <AlfredLoader />
}