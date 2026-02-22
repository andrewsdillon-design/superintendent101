import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="blueprint-bg min-h-screen">
        {children}
      </body>
    </html>
  )
}
