'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithOtp(phone: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    phone: `+91${phone}`,
    options: { channel: 'sms' },
  })

  if (error) return { error: error.message }
  return { error: null }
}

export async function verifyOtp(phone: string, token: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    phone: `+91${phone}`,
    token,
    type: 'sms',
  })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { error: null }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
