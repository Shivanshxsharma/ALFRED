"use client"
import { animate, useMotionValue } from 'framer-motion'
import React, { useEffect, useState } from 'react'

export const Animated_text = (text) => {

    let animatedCursor=useMotionValue(0)
    let [Cursor,setCursor]=useState(0)
   useEffect(() => {
      
       let controls=animate(animatedCursor,text.length,{
        duration:10,
        ease:"circOut",
        onUpdate(latest){
          setCursor(Math.floor(latest))
        }
       })

       return ()=> controls.stop();
   },[text.length,animatedCursor ])
      
return text.slice(0,Cursor)
}
