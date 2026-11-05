import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuth } from './lib/auth';
import { getSessionCookie } from 'better-auth/cookies';

// This function can be marked `async` if using `await` inside
export async function proxy(request: NextRequest) {
    const session = getSessionCookie(request)
        ? await getAuth().auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } })
        : null;
    const user = session?.user;

    if (!user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next()
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
    matcher: ['/dashboard/:path*', '/my-facility'],
}
