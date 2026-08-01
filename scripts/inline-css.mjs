// Post-build: inline the bundled CSS into the vue/react entries as a
// client-guarded runtime <head> injection, then delete the .css file. Makes the
// framework components self-contained (no consumer CSS import) WITHOUT a static
// `import "*.css"` — which crashes Node when the package is externalized in an
// SSR server bundle. Done as a post-build step because rolldown-vite emits CSS
// outside the Rollup asset flow (unavailable in generateBundle).
import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"

const
   dist = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
   cssFiles = readdirSync(dist).filter(f => f.endsWith(".css"))

if (!cssFiles.length) { console.log("inline-css: no CSS to inline"); process.exit(0) }

const css = cssFiles.map(f => readFileSync(join(dist, f), "utf8")).join("")

const inject =
   `(()=>{if(typeof document==="undefined")return;` +
   `const i="__fs_ehr_styles";if(document.getElementById(i))return;` +
   `const s=document.createElement("style");s.id=i;` +
   `s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})();\n`

for (const entry of ["vue.js", "react.js"]) {
   const path = join(dist, entry)
   writeFileSync(path, inject + readFileSync(path, "utf8"))
}

for (const f of cssFiles) rmSync(join(dist, f))
console.log(`inline-css: inlined ${cssFiles.join(", ")} into vue.js/react.js`)
