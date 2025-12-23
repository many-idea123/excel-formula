"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Loader2, Copy, Check } from "lucide-react"

export default function Home() {
  const [input, setInput] = useState("")
  const [formula, setFormula] = useState("")
  const [explanation, setExplanation] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setError("")
    setFormula("")
    setExplanation("")

    if (!input.trim()) {
      setError("엑셀 작업 내용을 입력해주세요.")
      return
    }

    if (input.length > 300) {
      setError("설명은 300자 이내로 입력해주세요.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "수식을 생성하지 못했습니다.")
        return
      }

      setFormula(data.formula)
      setExplanation(data.explanation)
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formula)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charCount = input.length
  const isOverLimit = charCount > 300

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">엑셀 수식 생성기</h1>
          <p className="text-muted-foreground">
            자연어로 설명하면 엑셀 수식을 바로 만들어줍니다
          </p>
        </div>

        {/* Input */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              엑셀에서 하고 싶은 작업을 설명해주세요
            </label>
            <Textarea
              placeholder="예: D열이 0보다 큰 행의 B열 값 합계"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={300}
              disabled={isLoading}
            />
            <div className="flex justify-between text-xs">
              <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                {charCount}/300자
              </span>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim() || isOverLimit}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              "수식 생성하기"
            )}
          </Button>
        </Card>

        {/* Error */}
        {error && (
          <Card className="p-4 border-destructive bg-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {/* Output */}
        {formula && (
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">엑셀 수식</label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      복사
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-md font-mono text-sm break-all">
                {formula}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <p className="text-sm text-muted-foreground">{explanation}</p>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>비용 관리를 위해 IP당 분당 3회로 제한됩니다</p>
        </div>
      </div>
    </main>
  )
}
