import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Taj Mahal Express — India\'s Trust-First Marketplace',
    template: '%s | Taj Mahal Express',
  },
  description:
    'Shop from verified GST-registered sellers across India. Guaranteed returns, escrow payments, and 48-hour dispute resolution.',
  keywords: ['online shopping', 'india marketplace', 'verified sellers', 'upi payments', 'buy online india'],
  authors: [{ name: 'Taj Mahal Express' }],
  creator: 'Taj Mahal Express',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://taj-mahal-express.in'),
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Taj Mahal Express',
    title: 'Taj Mahal Express — India\'s Trust-First Marketplace',
    description: 'Shop from verified sellers with escrow protection and guaranteed returns.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Taj Mahal Express',
    description: 'India\'s trust-first multi-vendor marketplace',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ea580c' },
    { media: '(prefers-color-scheme: dark)',  color: '#c2410c' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
