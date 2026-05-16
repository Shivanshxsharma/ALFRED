import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
const queryClient = new QueryClient()
import "./globals.css"

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark"  
    speedupyoutubeads="false"
     resize="226,402">
      <body className="fixed inset-0">
        {/* <QueryClientProvider client={queryClient}> */}
         {children}
        {/* </QueryClientProvider> */}
      </body>
    </html>
  )
}


