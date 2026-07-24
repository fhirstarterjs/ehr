/** Send this iframe's callback URL to its same-origin parent without navigating it. */
export const forwardCallback = (): Promise<never> => {
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
export const mountIframe = (opts: EhrLaunchOptions, log: (m: string, d?: unknown) => void) => {
   const
      name = `fhirstarter-${Math.random().toString(36).slice(2, 8)}`,
      frame = document.createElement("iframe"),
      visible = Boolean(opts.showIframe || opts.debug),
      callback = new Promise<URL>((resolve, reject) => {
         const receive = (event: MessageEvent): void => {
            if (event.source !== frame.contentWindow || event.origin !== window.location.origin)
               return
            if (event.data?.type !== CALLBACK_MESSAGE || typeof event.data.url !== "string") return
            try {
               const url = new URL(event.data.url)
               if (url.origin !== window.location.origin)
                  throw new Error("EhrLaunch: rejected cross-origin iframe callback")
               window.removeEventListener("message", receive)
               resolve(url)
            } catch (err) {
               window.removeEventListener("message", receive)
               reject(err)
            }
         }
         window.addEventListener("message", receive)
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
      remove: (): void => frame.remove(),
      callback,
      navigate: (url: string): void => void (frame.src = url),
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
      const payload = launch.split(".")[1]
      if (!payload)
         throw new Error("EhrLaunch: launch token is not a JWT; provide `clientId` or `resolveClientId`")
      const json = decodeURIComponent(
         atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
            .split("")
            .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join(""))
      return JSON.parse(json).client_id
   },

   toParent = (parent: EhrLaunchOptions["iframeParent"]): HTMLElement =>
      typeof parent === "string"
         ? document.querySelector<HTMLElement>(parent) ?? document.body
         : parent ?? document.body