import "./globals.css"
import Providers from './providers'
import { ErrorBanner } from '@/components/feedback/ErrorBanner'
 
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" speedupyoutubeads="false" resize="226,402">
      <body className="fixed inset-0">
        <Providers>
          <ErrorBanner />
          {children}
        </Providers>
      </body>
    </html>
  )
}
 