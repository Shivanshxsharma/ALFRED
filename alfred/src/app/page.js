"use client"
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchUserInfo } from '../services/fetch_info'

const Page = () => {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const userInfo = await fetchUserInfo()
      if (!userInfo) {
        router.replace("/auth")
      }else {
        router.replace("/chats")
      }
    }
    checkAuth()
  }, [router])

  return <div></div>
}

export default Page