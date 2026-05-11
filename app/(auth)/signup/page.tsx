'use client'

import { useState, useRef, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

type Stage = 'details' | 'otp'

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

export default function SignupPage() {
  const router = useRouter()

  const [stage, setStage] = useState<Stage>('details')
  const [form, setForm]   = useState({ name: '', phone: '', email: '' })
  const [loading, setLoading]  = useState(false)
  const [errors, setErrors]    = useState<Partial<typeof form>>({})
  const [countdown, setCountdown] = useState(0)

  function startCountdown() {
    setCountdown(30)
    const id = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(id); return 0 } return c - 1 })
    }, 1000)
  }

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Full name is required'
    if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    return e
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

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
      router.push('/')
    }, 800)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold text-saffron-600">Taj Mahal Express</span>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">India&apos;s trusted marketplace</p>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          {stage === 'details' ? (
            <>
              <h1 className="mb-1 text-xl font-bold">Create account</h1>
              <p className="mb-6 text-sm text-muted-foreground">Join millions of shoppers on Taj Mahal Express</p>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Name */}
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Priya Sharma"
                    className={cn(
                      'w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500',
                      errors.name && 'border-destructive',
                    )}
                  />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">Mobile Number</label>
                  <div className={cn('flex overflow-hidden rounded-lg border focus-within:ring-1 focus-within:ring-saffron-500 transition-all', errors.phone && 'border-destructive')}>
                    <div className="flex items-center gap-1.5 border-r bg-muted px-3 text-sm font-medium text-muted-foreground">
                      <span className="text-base">🇮🇳</span> +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
                </div>

                {/* Email (optional) */}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                    Email <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="priya@example.com"
                    className={cn(
                      'w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500',
                      errors.email && 'border-destructive',
                    )}
                  />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </div>

                <Button type="submit" variant="saffron" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="underline">Terms</Link> and{' '}
                <Link href="/privacy" className="underline">Privacy Policy</Link>
              </p>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">Already have an account?</span></div>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStage('details')}
                className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <h1 className="mb-1 text-xl font-bold">Verify Mobile</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                OTP sent to <span className="font-semibold">+91 {form.phone}</span>
              </p>

              <div className="space-y-4">
                <OtpInput onComplete={handleOtpComplete} />

                {loading && (
                  <div className="flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-saffron-600" />
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  {countdown > 0 ? (
                    <>Resend OTP in <span className="font-semibold text-foreground">{countdown}s</span></>
                  ) : (
                    <button onClick={startCountdown} className="font-semibold text-saffron-600 hover:underline">
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
