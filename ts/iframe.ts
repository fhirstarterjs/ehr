import { log } from "./log.js"
import { decodeJwt } from "./jwt.js"

/** Send this iframe's callback URL to its same-origin parent without navigating it. */
export const forwardCallback = (): Promise<never> => {
   log("forwardCallback → posting callback to parent",
      { toOrigin: window.location.origin, myHref: window.location.href, parentIsTop: window.parent === window.top })
   window.parent.postMessage(
      { type: CALLBACK_MESSAGE, url: window.location.href },
      window.location.origin,
   )
   return new Promise(() => undefined)
}

/** Resolve the client_id via explicit value → async resolver → launch-JWT fallback. */
export const resolveClientId = async (
   opts: EhrLaunchOptions,
   context: EhrLaunchContext,
): Promise<string> => {
   const id =
      opts.clientId ?? (await opts.resolveClientId?.(context)) ?? decodeLaunchJwt(context.launch)
   if (!id) throw new Error("EhrLaunch: could not resolve a non-empty client_id")
   return id
}

/** Mount a named auth iframe and return `{ navigate, callback, remove }`. */
export const mountIframe = (opts: EhrLaunchOptions) => {
   const
      name = `fhirstarter-${Math.random().toString(36).slice(2, 8)}`,
      frame = document.createElement("iframe"),
      visible = Boolean(opts.showIframe || opts.debug),
      callback = new Promise<URL>((resolve, reject) => {
         const
            stallMs = opts.authorizeStallMs ?? 2_500,
            cleanup = (): void => (
               window.removeEventListener("message", receive),
               frame.removeEventListener("load", onLoad),
               clearTimeout(stall)),
            receive = (event: MessageEvent): void => {
               // Log every inbound message so a filtered-out child postMessage
               // (source/origin mismatch — the classic silent nested-iframe
               // failure) is visible in debug mode.
               event.data?.type === CALLBACK_MESSAGE && log("mountIframe.receive message", {
                  fromExpectedFrame: event.source === frame.contentWindow,
                  origin: event.origin, myOrigin: window.location.origin,
                  originMatches: event.origin === window.location.origin, url: event.data?.url })
               if (event.source !== frame.contentWindow || event.origin !== window.location.origin)
                  return
               if (event.data?.type !== CALLBACK_MESSAGE || typeof event.data.url !== "string") return
               try {
                  const url = new URL(event.data.url)
                  if (url.origin !== window.location.origin)
                     throw new Error("EhrLaunch: rejected cross-origin iframe callback")
                  log("mountIframe.receive ACCEPTED callback → resolving", url.href)
                  cleanup()
                  resolve(url)
               } catch (err) {
                  cleanup()
                  reject(err)
               }
            },
            onLoad = (): void => (
               log(`mountIframe.onLoad → child loaded; starting ${stallMs}ms no-redirect stall`),
               clearTimeout(stall), void (stall = setTimeout(() => (
                  log("mountIframe.stall → child did NOT redirect → authorize_no_redirect"),
                  cleanup(),
                  reject(Object.assign(
                     new Error("EhrLaunch: authorize endpoint returned without redirecting"),
                     { name: "EhrAuthError", error: "authorize_no_redirect" }))), stallMs)))
         let stall: ReturnType<typeof setTimeout>
         window.addEventListener("message", receive)
         frame.addEventListener("load", onLoad)
      })
   frame.name = name
   frame.classList.add("fs-ehr-frame")
   visible ? frame.classList.add("visible") : Object.assign(frame.style, HIDDEN_STYLE)
   if (opts.iframeClass)
      frame.classList.add(
         ...(Array.isArray(opts.iframeClass) ? opts.iframeClass : opts.iframeClass.split(/\s+/))
            .filter(Boolean))
   if (typeof opts.iframeStyle === "string") frame.style.cssText += opts.iframeStyle
   else if (opts.iframeStyle) Object.assign(frame.style, opts.iframeStyle)
   toParent(opts.iframeParent).appendChild(frame)
   log("iframe created", name)
   return {
      remove: (): void => (log("removing child iframe", name), frame.remove()),
      callback,
      navigate: (url: string): void => (log("navigating child iframe →", url), void (frame.src = url)),
   }
}

const
   CALLBACK_MESSAGE = "fhirstarter:ehr:callback",
   HIDDEN_STYLE: Partial<CSSStyleDeclaration> = {
      position: "absolute",
      width: "0",
      height: "0",
      border: "0",
      visibility: "hidden",
   },

   decodeLaunchJwt = (launch: string): string => {
      const clientId = decodeJwt(launch)?.client_id
      if (typeof clientId !== "string")
         throw new Error("EhrLaunch: launch token is not a JWT; provide `clientId` or `resolveClientId`")
      return clientId
   },

   toParent = (parent: EhrLaunchOptions["iframeParent"]): HTMLElement =>
      typeof parent === "string"
         ? document.querySelector<HTMLElement>(parent) ?? document.body
         : parent ?? document.body