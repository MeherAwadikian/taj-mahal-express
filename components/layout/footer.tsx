import Link from 'next/link'
import { ShieldCheck, Truck, RefreshCw, Headphones } from 'lucide-react'

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Verified Sellers',   sub: 'GST + KYC checked' },
  { icon: Truck,       label: 'Fast Delivery',       sub: 'Pan-India shipping' },
  { icon: RefreshCw,   label: '7-Day Returns',       sub: 'Hassle-free returns' },
  { icon: Headphones,  label: '24/7 Support',        sub: 'Real humans, fast SLA' },
]

const FOOTER_LINKS = {
  'Company': [
    { label: 'About Us',    href: '/about' },
    { label: 'Careers',     href: '/careers' },
    { label: 'Press',       href: '/press' },
    { label: 'Blog',        href: '/blog' },
  ],
  'Sell on TME': [
    { label: 'Start Selling', href: '/seller/onboarding' },
    { label: 'Seller Hub',    href: '/seller' },
    { label: 'Seller Fees',   href: '/help/seller-fees' },
    { label: 'Seller App',    href: '/help/seller-app' },
  ],
  'Help': [
    { label: 'Help Center',   href: '/help' },
    { label: 'Track Order',   href: '/track' },
    { label: 'Returns',       href: '/returns' },
    { label: 'Contact Us',    href: '/help/contact' },
  ],
  'Legal': [
    { label: 'Privacy Policy',    href: '/help/privacy' },
    { label: 'Terms of Service',  href: '/help/terms' },
    { label: 'Cookie Policy',     href: '/help/cookies' },
    { label: 'Grievance Officer', href: '/help/grievance' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t bg-white">
      {/* Trust strip */}
      <div className="border-b bg-cream-50">
        <div className="container grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
          {TRUST_ITEMS.map(item => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-saffron-600" />
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="container grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
        {Object.entries(FOOTER_LINKS).map(([section, links]) => (
          <div key={section}>
            <h3 className="mb-3 text-sm font-semibold">{section}</h3>
            <ul className="space-y-2">
              {links.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Taj Mahal Express Pvt. Ltd. All rights reserved.</p>
          <p>Made with ♥ in India 🇮🇳 | CIN: U74999MH2026PTC000000</p>
        </div>
      </div>
    </footer>
  )
}
