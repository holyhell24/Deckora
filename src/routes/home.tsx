import { useState } from 'react'
import { Button } from '../components/ui/button'

export function HomePage() {
  const [count, setCount] = useState(0)

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Deckora</h1>
        <p className="text-slate-600">Ready to build.</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCount((value) => value + 1)}>Count: {count}</Button>
          <Button variant="secondary" onClick={() => setCount(0)} disabled={count === 0}>
            Reset
          </Button>
        </div>
      </div>
    </main>
  )
}
