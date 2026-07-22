/** Subscribe to progress updates; immediately emits current value. Returns unsubscribe. */
export const onProgress = (listener: ProgressListener): Unsubscribe => {
   listeners.add(listener)
   listener(value)
   return () => void listeners.delete(listener)
}

/** Current progress percentage (0–100). */
export const getProgress = (): number => value

/** Snap to a hard anchor value (stops trickling). */
export const setProgress = (next: number): void => {
   stop()
   value = Math.max(value, next)
   emit()
}

/** Start trickling from `from` toward `ceiling` over the expected duration. */
export const trickle = (from: number, to: number, ms: number): void => {
   stop()
   value = Math.max(value, from)
   ceiling = to
   expectedMs = Math.max(500, ms)
   startedAt = Date.now()
   emit()
   timer = setInterval(tick, TICK_MS)
}

/** Stop any active trickling without changing the value. */
export const stopProgress = (): void => stop()

/** Reset all progress state and drop listeners. */
export const resetProgress = (): void => {
   stop()
   value = ceiling = startedAt = 0
   expectedMs = 4_000
   listeners.clear()
}

let
   value = 0,
   ceiling = 0,
   startedAt = 0,
   expectedMs = 4_000,
   timer: ReturnType<typeof setInterval> | null = null

const
   TICK_MS = 150,
   EASE = 2.3,
   listeners = new Set<ProgressListener>(),

   emit = (): void => listeners.forEach((fn) => fn(value)),

   stop = (): void => void (timer && (clearInterval(timer), (timer = null))),

   tick = (): void => {
      const
         elapsed = Date.now() - startedAt,
         eased = 1 - Math.exp((-EASE * elapsed) / expectedMs)
      value = Math.min(ceiling - 0.5, Math.max(value, value + (ceiling - value) * eased))
      emit()
   }
