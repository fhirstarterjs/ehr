# @fhirstarter/ehr

[![npm](https://img.shields.io/npm/v/@fhirstarter/ehr)](https://www.npmjs.com/package/@fhirstarter/ehr)
[![CI](https://github.com/fhirstarterjs/ehr/actions/workflows/ci.yml/badge.svg)](https://github.com/fhirstarterjs/ehr/actions/workflows/ci.yml)
[![Publish](https://github.com/fhirstarterjs/ehr/actions/workflows/publish.yml/badge.svg)](https://github.com/fhirstarterjs/ehr/actions/workflows/publish.yml)

A thin, plug-and-play SMART on FHIR **EHR-launch** library with no runtime
dependencies. It runs the launch flow end to end using native SMART App Launch
(discovery, PKCE, token exchange). Authorization happens in the background
without ever navigating away from your app, your client ID is auto-detected from
the launch (so there's nothing to configure), progress and status are reported
live, and turnkey Vue/React components are included. When it's done, you get a
flat, authorized handoff for **any** FHIR library or plain `fetch`.

Targets SMART App Launch 2.2.0 (STU 2.2) with SMART v1 backwards compatability

> Need server-to-server auth instead? See the sister project
> **[@fhirstarter/backend](https://github.com/fhirstarterjs/backend)**, the SMART
> **Backend Services** (client credentials) auth lifecycle for any FHIR client.


## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Modes](#modes)
- [Options](#options)
- [Session expiry and refresh](#session-expiry-and-refresh)
- [Bring your own client](#bring-your-own-client)
- [Components](#components)
  - [Vue](#vue)
  - [React](#react)
  - [`EhrLaunch` props](#ehrlaunch-props)
  - [Styling](#styling)

## Install

```sh
npm install @fhirstarter/ehr
```

No runtime dependencies. `vue` and `react` are optional peers; install whichever
wrapper you use, if any.

## Quick start

```ts
import { fhirStarter } from "@fhirstarter/ehr"

// Zero-config: the client id is derived from the SMART launch token by default.
const handoff = await fhirStarter({
   onProgress: (percent) => updateBar(percent),
   onStatus: (status) => console.log(status),
})
if (handoff) {
   const res = await fetch(`${handoff.serverUrl}/Patient/${handoff.patient}`, {
      headers: handoff.authHeaders,
   })
}
```

By default no options are required. The client id is decoded from the `launch`
token passed by the EHR. `fhirStarter()` resolves to a flat `handoff` object (or
`null` when there is no launch context) whose fields you read directly:
`serverUrl`, `accessToken`, `expiresAt`, and launch context like `patient`,
`encounter`, `scope`, and `idToken`. Hand it off to any FHIR library or plain
`fetch` (see [Bring your own client](#bring-your-own-client)). `fhirStarter` is
also the default export, and `onProgress`/`onStatus` are exported as standalone
subscribe functions if you prefer.

## Modes

- `iframe: true` (default): a hidden iframe authorizes and hands its callback
  URL to the parent, which exchanges the code without navigating.
- `iframe: false`: a full top-level redirect to the auth server and back, for
  hosts or EHRs that forbid framing.

## Options

| Option | Description |
| --- | --- |
| `clientId` | Static client id. Optional; derived from the launch token by default. |
| `resolveClientId` | Async `(ctx) => id` resolver, given `{ iss, launch }`, for per-launch schemes. |
| `scopes` | Scope string or array (SMART v1 or v2). |
| `pkce` | `"required"` (default), `"ifSupported"`, or `"disabled"`. See below. |
| `redirectUri` | Defaults to the current window origin. |
| `iframe` | `false` for the redirect flow. Default `true`. |
| `debug` / `showIframe` | Console diagnostics / make the auth iframe visible. |
| `authorizeMs` / `exchangeMs` | Progress pacing hints. |
| `iframeParent` / `iframeClass` / `iframeStyle` | Auth iframe placement/styling. |
| `params` | Extra authorization request parameters. Reserved OAuth/SMART keys are ignored. |

Client id resolves in order: explicit `clientId` → `resolveClientId` → SMART
launch-JWT decode (the default, no config needed).

`pkce` defaults to `"required"`: the launch fails if the server does not advertise
S256 (mandated by SMART v2). Use `"ifSupported"` for legacy SMART v1 servers, or
`"disabled"` to opt out entirely.

## Session expiry and refresh

When you request `online_access` or `offline_access` and the EHR returns a
refresh token, `fhirStarter()` proactively refreshes in the background and
updates the same `handoff` object in place, so any reference you hold stays
current. No client secret is ever sent (this is a public client; PKCE replaces
it), and the refresh token is kept in memory only, never persisted.

Browser refresh also depends on the EHR enabling CORS on its token endpoint for
your registered origin (SMART App Launch §2.1.2.4). Many EHRs do not, in which
case refresh fails and the session simply expires at the token's lifetime. When
no refresh token is issued, the token is one-shot and `fhirStarter()` emits the
`"expired"` status at expiry:

Reloading restores an unexpired access-token snapshot, but not the memory-only
refresh token. Proactive refresh resumes only after a new launch.

```ts
import { fhirStarter, onStatus } from "@fhirstarter/ehr"

onStatus((status) => {
   if (status === "expired") disableSaveButtons() // your call
})

await fhirStarter()
```

The `EhrLaunch` components react by showing a persistent, click-through toast
prompting the user to close and relaunch from the EHR. Override its text via the
`expired` slot/prop, or restyle `.fs-ehr-expired` / `.fs-ehr-expired__pill`.

## Bring your own client

The `handoff` is a flat, data-only object. Read its fields directly and hand off
to any FHIR library or plain `fetch`:

```ts
import { fhirStarter } from "@fhirstarter/ehr"

const handoff = await fhirStarter()
if (handoff) {
   // Raw fetch:
   const res = await fetch(`${handoff.serverUrl}/Patient/${handoff.patient}`, {
      headers: handoff.authHeaders,
   })

   // Or fhir-kit-client:
   // const kit = new Client({ baseUrl: handoff.serverUrl })
   // kit.bearerToken = handoff.accessToken
}
```

Still using [`fhirclient`](https://www.npmjs.com/package/fhirclient)? The
`handoff.fhirClient` field is a ready-to-spread `FHIR.client(...)` argument that
carries the live token plus launch context (`patient`, `encounter`, `fhirUser`):

```ts
import FHIR from "fhirclient"
import { fhirStarter } from "@fhirstarter/ehr"

const handoff = await fhirStarter()
if (handoff) {
   const client = FHIR.client(handoff.fhirClient)
   const patient = await client.request(`Patient/${client.patient.id}`)
}
```

Handoff fields: `serverUrl`, `accessToken`, `expiresAt` (epoch ms), plus launch
context such as `patient`, `encounter`, `scope`, `tokenType`, `idToken`,
`needPatientBanner`, and `smartStyleUrl` when the EHR provides them. `authHeaders`
is `{ Authorization }` when authed or `{}` otherwise; `fhirClient` spreads into
`FHIR.client(...)`. Any custom `params` you configured are echoed back on
`handoff.params`.

## Components

Turnkey `EhrLaunch` components run the launch, show the progress bar, then
render your app. Each imports its own default theme, so no separate style import.

### Vue

#### Basic
Zero config, client id derived from the launch token:

```xhtml
<script setup lang="ts">
import { EhrLaunch } from "@fhirstarter/ehr/vue"
</script>

<template>
   <EhrLaunch v-slot="{ handoff }">
      <YourApp :handoff="handoff" />
   </EhrLaunch>
</template>
```

#### Advanced
Pass config via `options` and a `header` slot above the bar:

```xhtml
<script setup lang="ts">
import { EhrLaunch } from "@fhirstarter/ehr/vue"
import logo from "./logo.svg"
</script>

<template>
   <!-- `options` is any EhrLaunchOptions (clientId, scopes, iframe, …). -->
   <EhrLaunch :options="{ scopes: 'openid fhirUser patient/*.rs' }">
      <!-- `header` slot renders above the progress bar (logo, title, …). -->
      <template #header><img :src="logo" alt="" /></template>

      <!-- With multiple named slots, use explicit <template> for the default slot too. -->
      <template #default="{ handoff }">
         <YourApp :handoff="handoff" />
      </template>
   </EhrLaunch>
</template>
```

Or headless with the composable:

```ts
import { useEhrLaunch } from "@fhirstarter/ehr/vue"

const { state, handoff, percent, error, loading } = useEhrLaunch()
```

### React

#### Basic
Zero config, client id derived from the launch token:

```tsx
import { EhrLaunch } from "@fhirstarter/ehr/react"

export const App = () => (
   <EhrLaunch>{({ handoff }) => <YourApp handoff={handoff} />}</EhrLaunch>
)
```

#### Advanced
Pass config via `options` and a `header` node above the bar:

```tsx
import { EhrLaunch } from "@fhirstarter/ehr/react"
import logo from "./logo.svg"

export const App = () => (
   <EhrLaunch
      options={{ clientId: "my-client-id" }}  // any EhrLaunchOptions
      header={<img src={logo} alt="" />}
   >
      {({ handoff }) => <YourApp handoff={handoff} />}
   </EhrLaunch>
)
```

Or headless with the hook:

```tsx
import { useEhrLaunch } from "@fhirstarter/ehr/react"

const { state, handoff, percent, error, loading } = useEhrLaunch()
```

### `EhrLaunch` props

| Prop | Vue | React | Description |
| --- | --- | --- | --- |
| `options` | prop | prop | Any `EhrLaunchOptions` (`clientId`, `scopes`, `iframe`, `redirectUri`, `params`, etc.), forwarded to the launch. |
| `completionDelayMs` | prop | prop | How long 100% stays visible before revealing content. Default `500`. |
| `showStatus` | prop | prop | Show the status text under the bar. Default `true`; set `false` to hide it. |
| header | `#header` slot | `header` node | Rendered above the progress bar (logo, title). |
| label | `#label` slot | `label` node | Overrides the bar's status text. |
| error | `#error` slot | `error(err)` render prop | Custom error display; defaults to the message. |
| expired | `#expired` slot | `expired` node | Overrides the session-expired toast content. |
| authenticated content | default `v-slot="{ handoff, state, error }"` | `children({ handoff, state, error })` | Rendered after auth completes. |

### Styling

The components load the default theme automatically; if you use the headless
`ProgressBar` or composable directly, import `@fhirstarter/ehr/style.css`
yourself.

Restyle via the stable `fs-ehr-*` classes and CSS variables
(`--fs-ehr-fill`, `--fs-ehr-surface`, `--fs-ehr-track`, `--fs-ehr-text`,
`--fs-ehr-radius`, `--fs-ehr-backdrop`). Because the theme is loaded as normal
CSS, your own later/higher-specificity rules override it, and the components
accept class overrides directly.
