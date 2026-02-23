import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Superintendent101',
  description: 'Field Staff. Connected.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="blueprint-bg min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
