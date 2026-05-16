'use client';

import React from 'react'

const Skeleton = () => {
 return (
    <div className="min-h-full w-full   p-2 flex justify-center">
      <div className=" w-full flex flex-col gap-8">
        
        {/* User message 1 */}
        <div className="flex justify-end w-full ">
          <div className="w-96 h-11 rounded-2xl bg-zinc-800 animate-pulse" />
        </div>

        {/* Bot response 1 */}
        <div className="flex justify-center">
          <div className="w-full max-w-lg">
            <div className="w-full h-20 rounded-xl bg-zinc-800 mb-2 animate-pulse" />
          </div>
        </div>

        {/* User message 2 */}
        <div className="flex justify-end">
          <div className="w-72 h-11 rounded-2xl bg-zinc-800 animate-pulse" />
        </div>

        {/* Bot response 2 */}
        <div className="flex justify-center">
          <div className="w-full max-w-xl">
            <div className="w-full h-16 rounded-xl bg-zinc-800 mb-2 animate-pulse" />
          </div>
        </div>

        {/* User message 3 */}
        <div className="flex justify-end">
          <div className="w-[26rem] h-11 rounded-2xl bg-zinc-800 animate-pulse" />
        </div>

        {/* Bot response 3 - Large */}
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="w-full h-52 rounded-xl bg-zinc-800 animate-pulse" />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Skeleton