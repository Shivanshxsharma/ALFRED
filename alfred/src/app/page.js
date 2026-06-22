"use client"
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const page = () => {

    const router=useRouter();


    useEffect(() => {
      router.replace("auth")
    

    }, [])
    
  return (
    <div></div>
  )
}

export default page