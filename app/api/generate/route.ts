import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// COST PROTECTION: In-memory cache
// Key: normalized input string → Value: { formula, explanation, timestamp }
const cache = new Map<string, { formula: string; explanation: string; timestamp: number }>()

// COST PROTECTION: Rate limiting by IP
// Key: IP address → Value: array of request timestamps
const rateLimitMap = new Map<string, number[]>()

// COST PROTECTION: Daily usage tracking
let dailyRequestCount = 0
const DAILY_LIMIT = 1000 // Hard limit to prevent runaway costs
let lastResetDate = new Date().toDateString()

// Rate limit configuration: 3 requests per minute per IP
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const RATE_LIMIT_MAX = 3

// Cache configuration: 1 hour TTL
const CACHE_TTL = 60 * 60 * 1000

function getClientIP(request: Request): string {
  // Try to get IP from headers (works in production)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }

  // Fallback for local development
  return "unknown"
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(ip) || []

  // Remove timestamps outside the window
  const recentRequests = requests.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW)

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false // Rate limit exceeded
  }

  // Add current request timestamp
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)

  return true // Rate limit OK
}

function normalizeInput(input: string): string {
  // Normalize for cache key: lowercase, trim, remove extra whitespace
  return input.toLowerCase().trim().replace(/\s+/g, " ")
}

function checkDailyLimit(): boolean {
  const today = new Date().toDateString()

  // Reset counter if it's a new day
  if (today !== lastResetDate) {
    dailyRequestCount = 0
    lastResetDate = today
  }

  return dailyRequestCount < DAILY_LIMIT
}

export async function POST(req: Request) {
  try {
    const { input } = await req.json()

    // VALIDATION: Reject empty input
    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return Response.json({ error: "입력을 입력해주세요." }, { status: 400 })
    }

    if (input.length > 300) {
      return Response.json({ error: "입력은 300자 이내여야 합니다." }, { status: 400 })
    }

    /**
     * ============================
     * DEV MODE: 비용 완전 차단
     * ============================
     */
    if (process.env.NODE_ENV === "development") {
      return Response.json({
        formula: "=SUM(B:B)",
        explanation: "B열에 있는 모든 값을 합계로 계산합니다.",
        cached: true,
        dev: true,
      })
    }

    // COST PROTECTION: Check daily limit
    if (!checkDailyLimit()) {
      return Response.json(
        { error: "일일 사용 한도를 초과했습니다. 내일 다시 시도해주세요." },
        { status: 429 },
      )
    }

    const clientIP = getClientIP(req)
    if (!checkRateLimit(clientIP)) {
      return Response.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      )
    }

    // COST PROTECTION: Check cache first
    const cacheKey = normalizeInput(input)
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // Return cached result without calling OpenAI
      return Response.json({
        formula: cached.formula,
        explanation: cached.explanation,
        cached: true,
      })
    }

    // Call OpenAI API (server-side only, API key never exposed to client)
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `다음 설명을 엑셀 수식으로 변환하세요.
규칙:
- 출력은 반드시 두 줄
- 1줄: "="로 시작하는 엑셀 수식
- 2줄: 한국어 설명 한 문장
- 추가 텍스트 금지

설명: ${input}

형식:
=FORMULA_HERE
한국어 설명`,
      maxOutputTokens: 150, // COST PROTECTION: Limit tokens aggressively
      temperature: 0.3, // Lower temperature for consistent output
    })

    // Parse the response
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    // VALIDATION: Ensure we got a formula
    if (lines.length < 2 || !lines[0].startsWith("=")) {
      return Response.json(
        { error: "유효한 수식을 생성하지 못했습니다. 표현을 조금 바꿔보세요." },
        { status: 400 },
      )
    }

    const formula = lines[0].trim()
    const explanation = lines.slice(1).join(" ").trim()

    // COST PROTECTION: Cache the result
    cache.set(cacheKey, { formula, explanation, timestamp: Date.now() })

    // COST PROTECTION: Increment daily counter
    dailyRequestCount++

    return Response.json({
      formula,
      explanation,
      cached: false,
    })
  } catch (error) {
    console.error(error)

    return Response.json({ error: "수식을 생성하는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
