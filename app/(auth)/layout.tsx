import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      {/* Minimal header */}
      <header className="border-b bg-white px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="text-xl font-bold text-saffron-600">Taj Mahal Express</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="border-t bg-white px-4 py-4 text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>Your data is protected. We never sell your information.</span>
        </div>
        <div className="mt-2 space-x-4">
          <Link href="/help/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/help/terms" className="hover:underline">Terms of Use</Link>
        </div>
      </footer>
    </div>
  )
}
