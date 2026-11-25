/**
 * Worker đứng trước frontend trên Cloudflare.
 * - File tĩnh (JS/CSS/ảnh) do Cloudflare Assets phát trực tiếp, Content-Type đúng – Worker không đụng tới.
 * - /api/* và /ws được chuyển tiếp nguyên vẹn tới backend (BACKEND_ORIGIN): trình duyệt vẫn thấy cùng origin
 *   nên cookie refresh token (SameSite=Strict), OAuth callback và WebSocket hoạt động như khi chạy dev (TD-05).
 */
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  BACKEND_ORIGIN?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const isBackend = url.pathname.startsWith('/api/') || url.pathname === '/ws' || url.pathname.startsWith('/ws/')
    if (!isBackend) return env.ASSETS.fetch(request)

    const origin = env.BACKEND_ORIGIN?.replace(/\/+$/, '')
    if (!origin) {
      return Response.json(
        { code: 'SERVICE_UNAVAILABLE', message: 'Chưa cấu hình địa chỉ backend (BACKEND_ORIGIN) cho Worker' },
        { status: 503 },
      )
    }

    const target = new URL(url.pathname + url.search, origin)
    const headers = new Headers(request.headers)
    headers.set('X-Forwarded-Host', url.host)
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
    // redirect: 'manual' → chuyển hướng OAuth (302 sang Google/Facebook, về /oauth/callback) đi thẳng tới trình duyệt
    return fetch(new Request(target, { method: request.method, headers, body: request.body, redirect: 'manual' }))
  },
}
