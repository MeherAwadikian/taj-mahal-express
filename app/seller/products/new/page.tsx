'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

// Client-safe subset of the product schema
const newProductSchema = z.object({
  title:       z.string().min(10, 'At least 10 characters').max(200),
  description: z.string().min(20, 'At least 20 characters').max(5000),
  category_id: z.string().min(1, 'Select a category'),
  brand:       z.string().max(100).optional(),
  base_price:  z.coerce.number().positive('Must be positive').max(9_999_999),
  mrp:         z.coerce.number().positive('Must be positive').max(9_999_999),
  gst_rate:    z.coerce.number(),
  hsn_code:    z.string().regex(/^\d{4,8}$/).optional().or(z.literal('')),
  return_policy_days: z.coerce.number().int().min(0).max(30),
  is_cod_available:   z.boolean(),
  country_of_origin:  z.string().max(100),
  variants: z.array(z.object({
    sku:       z.string().min(1, 'SKU required'),
    title:     z.string().min(1, 'Variant title required'),
    price:     z.coerce.number().positive(),
    mrp:       z.coerce.number().positive(),
    quantity:  z.coerce.number().int().min(0),
  })).min(1, 'Add at least one variant'),
}).refine((d) => d.base_price <= d.mrp, { message: 'Price cannot exceed MRP', path: ['base_price'] })

type FormValues = z.infer<typeof newProductSchema>

const CATEGORIES = [
  { id: 'cat_electronics', label: 'Electronics' },
  { id: 'cat_fashion',     label: 'Fashion' },
  { id: 'cat_home',        label: 'Home & Kitchen' },
  { id: 'cat_beauty',      label: 'Beauty' },
  { id: 'cat_sports',      label: 'Sports' },
  { id: 'cat_grocery',     label: 'Grocery' },
  { id: 'cat_books',       label: 'Books' },
  { id: 'cat_toys',        label: 'Toys' },
]

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-destructive">{message}</p>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium">
      {children} {required && <span className="text-destructive">*</span>}
    </label>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500',
        className,
      )}
      {...props}
    />
  )
}

export default function NewProductPage() {
  const router  = useRouter()
  const [serverError, setServerError] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      title: '', description: '', category_id: '', brand: '',
      base_price: 0, mrp: 0, gst_rate: 18, return_policy_days: 7,
      is_cod_available: true, country_of_origin: 'India',
      variants: [{ sku: '', title: 'Default', price: 0, mrp: 0, quantity: 0 }],
    },
  })

  const { fields: variantFields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form

  async function onSubmit(values: FormValues) {
    setServerError('')
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(typeof json.error === 'string' ? json.error : 'Failed to create product')
        return
      }
      router.push('/seller/products')
    } catch {
      setServerError('Network error. Please try again.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Add New Product</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Fill in the details below. Products go live after review (usually within 24 hours).
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Basic Info */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Basic Information</h2>

          <div>
            <Label required>Product Title</Label>
            <Input {...register('title')} placeholder="e.g. Samsung Galaxy F55 5G 8GB 128GB" />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <Label required>Description</Label>
            <textarea
              {...register('description')}
              rows={5}
              placeholder="Describe your product in detail…"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Category</Label>
              <select
                {...register('category_id')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <FieldError message={errors.category_id?.message} />
            </div>
            <div>
              <Label>Brand</Label>
              <Input {...register('brand')} placeholder="e.g. Samsung" />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Pricing & Tax</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Sale Price (₹)</Label>
              <Input type="number" step="0.01" min="0" {...register('base_price')} />
              <FieldError message={errors.base_price?.message} />
            </div>
            <div>
              <Label required>MRP (₹)</Label>
              <Input type="number" step="0.01" min="0" {...register('mrp')} />
              <FieldError message={errors.mrp?.message} />
            </div>
            <div>
              <Label required>GST Rate (%)</Label>
              <select
                {...register('gst_rate')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-saffron-500"
              >
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
            <div>
              <Label>HSN Code</Label>
              <Input {...register('hsn_code')} placeholder="e.g. 85171290" />
            </div>
          </div>
        </section>

        {/* Shipping & Returns */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Shipping & Returns</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Return Window (days)</Label>
              <Input type="number" min="0" max="30" {...register('return_policy_days')} />
            </div>
            <div>
              <Label>Country of Origin</Label>
              <Input {...register('country_of_origin')} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" {...register('is_cod_available')} className="accent-saffron-600" />
            Cash on Delivery available
          </label>
        </section>

        {/* Variants */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Variants & Stock</h2>
            <button
              type="button"
              onClick={() => append({ sku: '', title: '', price: 0, mrp: 0, quantity: 0 })}
              className="flex items-center gap-1 text-xs font-medium text-saffron-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add variant
            </button>
          </div>
          <FieldError message={errors.variants?.message} />

          {variantFields.map((field, i) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Variant {i + 1}</p>
                {variantFields.length > 1 && (
                  <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>SKU</Label>
                  <Input {...register(`variants.${i}.sku`)} placeholder="SKU-001" />
                  <FieldError message={errors.variants?.[i]?.sku?.message} />
                </div>
                <div>
                  <Label required>Title</Label>
                  <Input {...register(`variants.${i}.title`)} placeholder="e.g. Blue / 128GB" />
                  <FieldError message={errors.variants?.[i]?.title?.message} />
                </div>
                <div>
                  <Label required>Price (₹)</Label>
                  <Input type="number" step="0.01" {...register(`variants.${i}.price`)} />
                </div>
                <div>
                  <Label required>MRP (₹)</Label>
                  <Input type="number" step="0.01" {...register(`variants.${i}.mrp`)} />
                </div>
                <div>
                  <Label required>Stock Qty</Label>
                  <Input type="number" min="0" {...register(`variants.${i}.quantity`)} />
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Images placeholder */}
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 font-semibold">Product Images</h2>
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed p-8 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8" />
              <p className="text-sm">Image upload via Supabase Storage</p>
              <p className="text-xs">Coming in Phase 7 (after storage bucket setup)</p>
            </div>
          </div>
        </section>

        {serverError && (
          <p className="rounded-lg border border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="saffron" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </div>
  )
}
