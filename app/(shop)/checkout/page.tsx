'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronRight, MapPin, Truck, CreditCard, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  fullName: string; phone: string; pincode: string; addressLine: string; city: string; state: string
}

type Step = 'address' | 'delivery' | 'payment'

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'address',  label: 'Address',  icon: MapPin },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'payment',  label: 'Payment',  icon: CreditCard },
]

const DELIVERY_OPTIONS = [
  { id: 'standard', label: 'Standard Delivery', desc: 'Arrives in 4–6 business days', price: 0 },
  { id: 'express',  label: 'Express Delivery',  desc: 'Arrives in 1–2 business days', price: 99 },
]

const SAVED_ADDRESSES: (Address & { id: string })[] = [
  { id: 'a1', fullName: 'Meher Awadikian', phone: '9876543210', pincode: '400001', addressLine: '42, Marine Drive, Flat 5B', city: 'Mumbai', state: 'Maharashtra' },
]

const ORDER_TOTAL = 28346

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current)
  return (
    <div className="flex items-center gap-0">
      {STEPS.map(({ key, label, icon: Icon }, i) => {
        const done    = i < currentIdx
        const active  = key === current
        return (
          <div key={key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                done   ? 'bg-green-500 text-white' :
                active ? 'bg-saffron-600 text-white' :
                         'bg-muted text-muted-foreground',
              )}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn('text-xs font-medium', active ? 'text-saffron-600' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-2 mb-4 h-px w-12 sm:w-20 transition-colors', i < currentIdx ? 'bg-green-500' : 'bg-muted')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

function AddressStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<string>(SAVED_ADDRESSES[0]?.id ?? '')
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState<Address>({ fullName: '', phone: '', pincode: '', addressLine: '', city: '', state: '' })

  const addr = SAVED_ADDRESSES.find((a) => a.id === selected)

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Delivery Address</h2>

      {SAVED_ADDRESSES.map((a) => (
        <label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors', selected === a.id && 'border-saffron-500 bg-saffron-50/50')}>
          <input type="radio" name="address" value={a.id} checked={selected === a.id} onChange={() => { setSelected(a.id); setShowNew(false) }} className="mt-1 accent-saffron-600" />
          <div className="text-sm">
            <p className="font-semibold">{a.fullName} <span className="font-normal text-muted-foreground">{a.phone}</span></p>
            <p className="mt-0.5 text-muted-foreground">{a.addressLine}, {a.city}, {a.state} — {a.pincode}</p>
          </div>
        </label>
      ))}

      <button
        type="button"
        onClick={() => { setShowNew((p) => !p); setSelected('') }}
        className="flex items-center gap-2 text-sm font-medium text-saffron-600 hover:underline"
      >
        + Add new address
      </button>

      {showNew && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
          {(Object.keys(form) as (keyof Address)[]).map((key) => (
            <div key={key} className={cn('flex flex-col gap-1', ['addressLine', 'fullName'].includes(key) && 'col-span-2')}>
              <label className="text-xs font-medium capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type={key === 'phone' ? 'tel' : 'text'}
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
              />
            </div>
          ))}
        </div>
      )}

      <Button variant="saffron" className="w-full mt-2" onClick={onNext} disabled={!addr && !showNew}>
        Deliver Here <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function DeliveryStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState('standard')
  return (
    <div className="space-y-4">
      <h2 className="font-bold">Delivery Options</h2>
      {DELIVERY_OPTIONS.map((opt) => (
        <label key={opt.id} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors', selected === opt.id && 'border-saffron-500 bg-saffron-50/50')}>
          <input type="radio" name="delivery" value={opt.id} checked={selected === opt.id} onChange={() => setSelected(opt.id)} className="accent-saffron-600" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">{opt.label}</p>
            <p className="text-muted-foreground">{opt.desc}</p>
          </div>
          <span className={cn('text-sm font-bold', opt.price === 0 ? 'text-green-600' : '')}>
            {opt.price === 0 ? 'FREE' : formatINR(opt.price)}
          </span>
        </label>
      ))}
      <Button variant="saffron" className="w-full mt-2" onClick={onNext}>
        Continue to Payment <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function PaymentStep() {
  const [method, setMethod] = useState<'upi' | 'card' | 'cod'>('upi')
  const [upiId, setUpiId]   = useState('')
  const [placed, setPlaced] = useState(false)

  if (placed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">Order Placed!</h2>
        <p className="text-sm text-muted-foreground">
          Your order has been placed successfully. You will receive a confirmation on your phone and email.
        </p>
        <p className="rounded-lg bg-muted px-4 py-2 text-sm font-mono font-medium">
          Order #TME-20260511-0042
        </p>
        <Button variant="saffron" asChild>
          <a href="/account/orders">Track Order</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-bold">Payment Method</h2>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {([['upi', 'UPI'], ['card', 'Card'], ['cod', 'COD']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMethod(key)}
            className={cn(
              'rounded-xl border py-3 text-sm font-medium transition-colors',
              method === key ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'hover:bg-muted',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {method === 'upi' && (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-semibold">Enter UPI ID</p>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
          />
          <p className="text-xs text-muted-foreground">e.g. 9876543210@paytm, name@okaxis</p>
        </div>
      )}

      {method === 'card' && (
        <div className="space-y-3 rounded-xl border p-4 text-sm">
          <p className="font-semibold">Card Details</p>
          <input placeholder="Card number" className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="MM / YY" className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500" />
            <input placeholder="CVV" type="password" maxLength={4} className="rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500" />
          </div>
        </div>
      )}

      {method === 'cod' && (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          Pay with cash when your order is delivered. A convenience fee of ₹25 may apply.
        </div>
      )}

      {/* Total + CTA */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Order total</span>
          <span className="font-bold text-base">{formatINR(ORDER_TOTAL)}</span>
        </div>
        <Button variant="saffron" size="lg" className="mt-4 w-full" onClick={() => setPlaced(true)}>
          Place Order · {formatINR(ORDER_TOTAL)}
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> 256-bit SSL secured transaction
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>('address')

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Checkout</h1>

      <div className="mb-8 flex justify-center">
        <StepIndicator current={step} />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 'address'  && <AddressStep  onNext={() => setStep('delivery')} />}
        {step === 'delivery' && <DeliveryStep onNext={() => setStep('payment')}  />}
        {step === 'payment'  && <PaymentStep />}
      </div>
    </div>
  )
}
