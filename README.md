# Excel Formula Generator

A minimal full-stack Next.js app that converts natural language descriptions into Excel formulas using AI.

## Features

- **Simple UI**: Single page with text input, generate button, and formula output
- **AI-Powered**: Uses OpenAI via Vercel AI SDK to generate formulas
- **Cost Protection**: Multiple layers of protection against API abuse
  - Rate limiting: 3 requests per minute per IP
  - Input validation: Max 300 characters
  - Token limiting: Max 150 output tokens
  - Daily hard limit: 1000 requests per day
  - In-memory caching: 1-hour cache for repeated queries
- **No Database**: Fully functional with in-memory storage
- **Server-Side API**: API key never exposed to client

## Cost Protection Details

### Rate Limiting
- 3 requests per minute per IP address
- Prevents individual users from making excessive requests
- Implemented in-memory per server instance

### Input Validation
- Maximum 300 characters per request
- Rejects empty or malformed input
- Client and server-side validation

### Token Management
- Maximum 150 output tokens per request
- Low temperature (0.3) for consistent, concise output
- Explicit prompt engineering for minimal responses

### Caching
- Normalized input strings as cache keys
- 1-hour TTL on cached responses
- Returns cached results without API calls

### Daily Safety Limit
- Hard-coded 1000 request daily limit
- Resets at midnight
- Final safety net against runaway costs

## Local Development

1. The app uses Vercel AI Gateway which handles API authentication automatically
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **AI**: Vercel AI SDK v5 with AI Gateway
- **Components**: shadcn/ui
- **Deployment**: Vercel

## API Endpoint

### POST `/api/generate`

**Request:**
```json
{
  "input": "Sum values in column B where column D is greater than 0"
}
```

**Response:**
```json
{
  "formula": "=SUMIF(D:D,\">0\",B:B)",
  "explanation": "This formula sums all values in column B where the corresponding value in column D is greater than 0.",
  "cached": false
}
```

**Error Response:**
```json
{
  "error": "Rate limit exceeded. Please wait before trying again."
}
```

## Security Notes

- API key is managed server-side by Vercel AI Gateway
- No authentication required (public utility)
- Rate limiting prevents abuse
- Input validation prevents malicious requests
- No user data stored
