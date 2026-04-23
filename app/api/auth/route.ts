import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'pdv_session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim()
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  const sessionToken = (process.env.SESSION_TOKEN || '').trim()

  if (email.trim() !== adminEmail || password.trim() !== adminPassword) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
