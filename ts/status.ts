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

/** Watch the handoff's expiry, re-checking on fire so proactive refresh can extend it. */
export const watchExpiry = (handoff: EhrHandoff): void => {
   clearExpiry()
   if (!handoff.expiresAt) return
   const tick = (): void => {
      const remaining = handoff.expiresAt - Date.now()
      remaining > 0
         ? (expiryTimer = setTimeout(tick, remaining))
         : setStatus("expired")
   }
   tick()
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
