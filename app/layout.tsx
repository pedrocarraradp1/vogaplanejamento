import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Voga Planejamento Financeiro',
  description: 'Planejamento financeiro personalizado - BTG Pactual',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#080C18',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 50 }}>
          <Image
            src="/logo-voga.png"
            alt="Voga"
            width={160}
            height={52}
            style={{ objectFit: 'contain' }}
          />
        </div>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
