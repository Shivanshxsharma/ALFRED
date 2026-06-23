"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }) {
  // useState ensures the QueryClient is created exactly once per browser
  // session, not recreated on every re-render of this component.
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,       // treat data as fresh for 1 minute
        retry: 1,                    // retry failed requests once before surfacing the error
        refetchOnWindowFocus: false, // avoid surprise refetches while demoing
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}