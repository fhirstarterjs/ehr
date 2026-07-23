/** Subscribe to lifecycle status; immediately emits current status. Returns unsubscribe. */
export const onStatus = (listener: StatusListener): Unsubscribe => {
   statusListeners.add(listener)
   listener(status)
   return () => void statusListeners.delete(listener)
}

/** Current lifecycle status. */
export const getStatus = (): EhrStatus => status

/** Set the lifecycle status and notify all subscribers. */
export const setStatus = (next: EhrStatus): void => {
   status = next
   statusListeners.forEach((fn) => fn(next))
}

/** Arm a one-shot timer that flips to `expired` at the token's fixed expiry (no refresh). */
export const watchExpiry = (client: SmartClient): void => {
   clearExpiry()
   const expiresAt = client.state.expiresAt
   if (!expiresAt) return
   expiryTimer = setTimeout(() => setStatus("expired"), Math.max(0, expiresAt * 1_000 - Date.now()))
}

/** Cancel any pending expiry timer. */
export const clearExpiry = (): void => void (
   expiryTimer && (clearTimeout(expiryTimer), (expiryTimer = null))
)

/** Reset status state to initial (clears listeners and expiry timer). */
export const resetStatus = (): void => {
   clearExpiry()
   statusListeners.clear()
   status = "initializing"
}

let
   status: EhrStatus = "initializing",
   expiryTimer: ReturnType<typeof setTimeout> | null = null

const statusListeners = new Set<StatusListener>()
