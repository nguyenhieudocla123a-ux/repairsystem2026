/**
 * Worker đứng trước frontend trên Cloudflare.
 * - File tĩnh (JS/CSS/ảnh) do Cloudflare Assets phát trực tiếp, Content-Type đúng – Worker không đụng tới.
 * - /api/* và /ws được chuyển tiếp nguyên vẹn tới backend: qua Workers VPC (binding BACKEND → Cloudflare Tunnel
 *   → localhost:8080 trên máy chạy backend), hoặc BACKEND_ORIGIN nếu có. Trình duyệt vẫn thấy cùng origin
 *   nên cookie refresh token (SameSite=Strict), OAuth callback và WebSocket hoạt động như khi chạy dev (TD-05).
 */
interface Fetcher {
  fetch: (request: Request) => Promise<Response>
}

interface Env {
  ASSETS: Fetcher
  /** VPC Service "repairflow-backend": localhost:8080 phía sau Cloudflare Tunnel */
  BACKEND?: Fetcher
  BACKEND_ORIGIN?: string
}

/** Host:cổng của backend nhìn từ máy chạy cloudflared (VPC Service luôn dùng host/cổng đã đăng ký) */
const VPC_BACKEND_URL = 'http://localhost:8080'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const isBackend = url.pathname.startsWith('/api/') || url.pathname === '/ws' || url.pathname.startsWith('/ws/')
    if (!isBackend) return env.ASSETS.fetch(request)

    const origin = env.BACKEND_ORIGIN?.replace(/\/+$/, '') || (env.BACKEND ? VPC_BACKEND_URL : '')
    if (!origin) {
      return Response.json(
        { code: 'SERVICE_UNAVAILABLE', message: 'Chưa cấu hình kết nối backend cho Worker' },
        { status: 503 },
      )
    }

    const target = new URL(url.pathname + url.search, origin)
    const headers = new Headers(request.headers)
    headers.set('X-Forwarded-Host', url.host)
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''))
    // redirect: 'manual' → chuyển hướng OAuth (302 sang Google/Facebook, về /oauth/callback) đi thẳng tới trình duyệt
    const proxied = new Request(target, { method: request.method, headers, body: request.body, redirect: 'manual' })
    try {
      return await (env.BACKEND_ORIGIN || !env.BACKEND ? fetch(proxied) : env.BACKEND.fetch(proxied))
    } catch {
      // Tunnel chưa kết nối / backend đang tắt
      return Response.json(
        { code: 'SERVICE_UNAVAILABLE', message: 'Máy chủ backend đang tắt hoặc chưa kết nối, vui lòng thử lại sau' },
        { status: 503 },
      )
    }
  },
}
