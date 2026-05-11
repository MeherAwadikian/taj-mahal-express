import { ShieldCheck, RotateCcw, Truck, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const BADGES = [
  {
    icon: ShieldCheck,
    title: '100% Verified Sellers',
    desc: 'GSTIN + bank account verified',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Truck,
    title: 'Pan-India Delivery',
    desc: 'Express & standard shipping',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: RotateCcw,
    title: '10-Day Easy Returns',
    desc: 'No questions asked',
    color: 'text-saffron-600',
    bg: 'bg-saffron-50',
  },
  {
    icon: Headphones,
    title: '24×7 Support',
    desc: 'Chat, email & phone',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

export function TrustBadges({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {BADGES.map(({ icon: Icon, title, desc, color, bg }) => (
        <div
          key={title}
          className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm"
        >
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', bg)}>
            <Icon className={cn('h-5 w-5', color)} />
          </div>
          <div>
            <p className="text-xs font-semibold leading-tight">{title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
