import { NextResponse, type NextRequest } from 'next/server'

const COOKIE = 'pdv_session'

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublic =
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/api/') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico)$/.test(path)

  if (isPublic) return NextResponse.next()

  const token = request.cookies.get(COOKIE)?.value?.trim() || ''
  const sessionToken = (process.env.SESSION_TOKEN || '').trim()
  const valid = token.length > 0 && token === sessionToken

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
