import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
const queryClient = new QueryClient()
import "./globals.css"
import { ErrorBanner } from '@/components/ui/ErrorBanner'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark"  
    speedupyoutubeads="false"
     resize="226,402">
      <body className="fixed inset-0">
        <ErrorBanner />
        
         {children}
        
      </body>
    </html>
  )
}


