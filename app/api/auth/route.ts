import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const COOKIE = 'pdv_session'

function makeToken(email: string): string {
  return crypto
    .createHmac('sha256', process.env.AUTH_SECRET!)
    .update(email)
    .digest('hex')
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const token = makeToken(email)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
