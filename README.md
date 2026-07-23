# @fhirstarter/ehr

[![npm](https://img.shields.io/npm/v/@fhirstarter/ehr)](https://www.npmjs.com/package/@fhirstarter/ehr)
[![CI](https://github.com/fhirstarterjs/ehr/actions/workflows/ci.yml/badge.svg)](https://github.com/fhirstarterjs/ehr/actions/workflows/ci.yml)
[![Publish](https://github.com/fhirstarterjs/ehr/actions/workflows/publish.yml/badge.svg)](https://github.com/fhirstarterjs/ehr/actions/workflows/publish.yml)

A thin, EHR-agnostic SMART on FHIR **EHR-launch** wrapper over
[`fhirclient`](https://www.npmjs.com/package/fhirclient). It adds a hidden auth
iframe, trickling progress, a SMART launch-JWT client-id fallback, a launch-phase
status machine, and turnkey Vue/React components — while forwarding every
`fhirclient` option through unchanged.

Targets SMART App Launch 2.2.0 (STU 2.2); SMART v1 keeps working because
`fhirclient` handles version negotiation.

> Need server-to-server auth instead? See the sister project
> **[@fhirstarter/backend](https://github.com/fhirstarterjs/backend)** — the SMART
> **Backend Services** (client credentials) auth lifecycle for any FHIR client.


## Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Modes](#modes)
- [Options](#options)
- [Session expiry](#session-expiry)
- [Other FHIR clients](#other-fhir-clients)
- [Components](#components)
  - [Vue](#vue)
  - [React](#react)
  - [`EhrLaunch` props](#ehrlaunch-props)
  - [Styling](#styling)

## Install

```sh
npm install @fhirstarter/ehr fhirclient
```

`fhirclient` is a required peer. `vue` and `react` are optional peers — install
whichever wrapper you use.

## Quick start

```ts
import { fhirStarter } from "@fhirstarter/ehr"

// Zero-config: the client id is derived from the SMART launch token by default.
const client = await fhirStarter({
   onProgress: (percent) => updateBar(percent),
   onStatus: (status) => console.log(status),
})
if (client) {
   const patient = await client.request(`Patient/${client.patient.id}`)
}
```

By default no options are required — the client id is decoded from the `launch`
token passed by the EHR. `fhirStarter()` returns the real `fhirclient` `Client`
(or `null` when there is no launch context), so `request()`, `patient`, `user`,
and `state` all work as usual. It is also the default export. (`onProgress`/
`onStatus` are also exported as standalone subscribe functions if you prefer.)

## Modes

- `iframe: true` (default) — a hidden iframe authorizes and hands its callback
  URL to the parent, which exchanges the code without navigating.
- `iframe: false` — a full top-level redirect to the auth server and back, for
  hosts or EHRs that forbid framing.

## Options

| Option | Description |
| --- | --- |
| `clientId` | Static client id. Optional — derived from the launch token by default. |
| `resolveClientId` | Async `(ctx) => id` resolver, given `{ iss, launch }`, for per-launch schemes. |
| `scopes` | Scope string or array, forwarded verbatim (SMART v1 or v2). |
| `redirectUri` | Defaults to the current window origin. |
| `iframe` | `false` for the redirect flow. Default `true`. |
| `debug` / `showIframe` | Console diagnostics / make the auth iframe visible. |
| `authorizeMs` / `exchangeMs` | Progress pacing hints. |
| `iframeParent` / `iframeClass` / `iframeStyle` | Auth iframe placement/styling. |
| `fhir` | Passthrough object merged into the `oauth2.authorize` call (e.g. `pkceMode`, `issMatch`, `clientSecret`, `clientPrivateJwk`). |

Client id resolves in order: explicit `clientId` → `resolveClientId` → SMART
launch-JWT decode (the default, no config needed).

## Session expiry

Browser (public) clients cannot safely refresh SMART tokens, so `fhirStarter()`
schedules a timer for the token's fixed expiry and emits the `"expired"` status
when it fires — regardless of whether you use the components:

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

## Other FHIR clients

`fhirStarter` uses `fhirclient` to run the SMART EHR-launch flow — that dependency
is required and cannot be swapped. But once authorized, you can hand the result
off to any FHIR client or plain `fetch` by reading a few fields from the returned
`client.state`.

Pass only the fields you need. **Never** spread the whole `client.state` — it can
contain PKCE material and other sensitive values:

```ts
import { fhirStarter } from "@fhirstarter/ehr"

const client = await fhirStarter()
if (client) {
   const
      serverUrl = client.state.serverUrl,
      token = client.state.tokenResponse?.access_token

   // Raw fetch:
   const res = await fetch(`${serverUrl}/Patient/${client.patient.id}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
   })

   // Or fhir-kit-client:
   // const kit = new Client({ baseUrl: serverUrl })
   // kit.bearerToken = token
}
```

`state.expiresAt` (epoch seconds) is also available if you want to track expiry
yourself. This mirrors the handoff story in the sister
**[@fhirstarter/backend](https://github.com/fhirstarterjs/backend)** package.

## Components

Turnkey `EhrLaunch` components run the launch, show the progress bar, then
render your app. Each imports its own default theme — no separate style import.

### Vue

#### Basic
Zero config, client id derived from the launch token:

```xhtml
<script setup lang="ts">
import { EhrLaunch } from "@fhirstarter/ehr/vue"
</script>

<template>
   <EhrLaunch v-slot="{ client }">
      <YourApp :client="client" />
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
      <template #default="{ client }">
         <YourApp :client="client" />
      </template>
   </EhrLaunch>
</template>
```

Or headless with the composable:

```ts
import { useEhrLaunch } from "@fhirstarter/ehr/vue"

const { state, client, percent, error, loading } = useEhrLaunch()
```

### React

#### Basic
Zero config, client id derived from the launch token:

```tsx
import { EhrLaunch } from "@fhirstarter/ehr/react"

export const App = () => (
   <EhrLaunch>{({ client }) => <YourApp client={client} />}</EhrLaunch>
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
      {({ client }) => <YourApp client={client} />}
   </EhrLaunch>
)
```

Or headless with the hook:

```tsx
import { useEhrLaunch } from "@fhirstarter/ehr/react"

const { state, client, percent, error, loading } = useEhrLaunch()
```

### `EhrLaunch` props

| Prop | Vue | React | Description |
| --- | --- | --- | --- |
| `options` | prop | prop | Any `EhrLaunchOptions` (`clientId`, `scopes`, `iframe`, `redirectUri`, `fhir`, …), forwarded to the launch. |
| `completionDelayMs` | prop | prop | How long 100% stays visible before revealing content. Default `500`. |
| `showStatus` | prop | prop | Show the status text under the bar. Default `true`; set `false` to hide it. |
| header | `#header` slot | `header` node | Rendered above the progress bar (logo, title). |
| label | `#label` slot | `label` node | Overrides the bar's status text. |
| error | `#error` slot | `error(err)` render prop | Custom error display; defaults to the message. |
| expired | `#expired` slot | `expired` node | Overrides the session-expired toast content. |
| authenticated content | default `v-slot="{ client, state, error }"` | `children({ client, state, error })` | Rendered after auth completes. |

### Styling

The components load the default theme automatically; if you use the headless
`ProgressBar` or composable directly, import `@fhirstarter/ehr/style.css`
yourself.

Restyle via the stable `fs-ehr-*` classes and CSS variables
(`--fs-ehr-fill`, `--fs-ehr-surface`, `--fs-ehr-track`, `--fs-ehr-text`,
`--fs-ehr-radius`, `--fs-ehr-backdrop`). Because the theme is loaded as normal
CSS, your own later/higher-specificity rules override it — and the components
accept class overrides directly.
