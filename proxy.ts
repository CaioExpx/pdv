import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'pdv_session'
const SECRET = (process.env.AUTH_SECRET || '').trim()
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim()

async function verifySession(token: string): Promise<boolean> {
  if (!token || !SECRET || !ADMIN_EMAIL) return false
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(ADMIN_EMAIL))
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return token === expected
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublic = path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/api/auth') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(path)

  if (isPublic) return NextResponse.next()

  const token = request.cookies.get(COOKIE)?.value || ''
  const valid = await verifySession(token)

  if (!valid && path !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (valid && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
