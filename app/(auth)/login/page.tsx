'use client'

import { useState, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Phone, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

type Stage = 'phone' | 'otp'

function OtpInput({ onComplete }: { onComplete: (otp: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null))

  function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) refs[i + 1]?.current?.focus()
    if (next.every((d) => d !== '')) onComplete(next.join(''))
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1]?.current?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            'h-12 w-10 rounded-lg border text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-saffron-500 transition-colors',
            d ? 'border-saffron-500 bg-saffron-50' : 'border-border bg-background',
          )}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router  = useRouter()
  const [stage, setStage]   = useState<Stage>('phone')
  const [phone, setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [countdown, setCountdown] = useState(0)

  function startCountdown() {
    setCountdown(30)
    const id = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(id); return 0 } return c - 1 })
    }, 1000)
  }

  function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit Indian mobile number')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStage('otp')
      startCountdown()
    }, 800)
  }

  function handleOtpComplete(otp: string) {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (otp === '000000') {
        setError('Invalid OTP. Please try again.')
      } else {
        router.push('/')
      }
    }, 800)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-saffron-600">Taj Mahal Express</span>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">India&apos;s trusted marketplace</p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {stage === 'phone' ? (
            <>
              <h1 className="mb-1 text-xl font-bold">Log in</h1>
              <p className="mb-6 text-sm text-muted-foreground">Enter your mobile number to receive a one-time password</p>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Mobile Number</label>
                  <div className="flex overflow-hidden rounded-lg border focus-within:ring-1 focus-within:ring-saffron-500 focus-within:border-saffron-500 transition-all">
                    <div className="flex items-center gap-1.5 border-r bg-muted px-3 text-sm font-medium text-muted-foreground">
                      <span className="text-base">🇮🇳</span> +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>

                <Button type="submit" variant="saffron" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="underline">Terms</Link> and{' '}
                <Link href="/privacy" className="underline">Privacy Policy</Link>
              </p>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">OR</span></div>
              </div>

              <p className="text-center text-sm">
                New to TME?{' '}
                <Link href="/signup" className="font-semibold text-saffron-600 hover:underline">Create account</Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStage('phone'); setError('') }}
                className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <h1 className="mb-1 text-xl font-bold">Enter OTP</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Sent to <span className="font-semibold">+91 {phone}</span>
              </p>

              <div className="space-y-4">
                <OtpInput onComplete={handleOtpComplete} />
                {error && <p className="text-center text-xs text-destructive">{error}</p>}

                {loading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-saffron-600" />
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  {countdown > 0 ? (
                    <>Resend OTP in <span className="font-semibold text-foreground">{countdown}s</span></>
                  ) : (
                    <button onClick={() => { startCountdown() }} className="font-semibold text-saffron-600 hover:underline">
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
