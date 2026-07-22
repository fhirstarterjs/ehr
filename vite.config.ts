import { defineConfig } from "vite"
import type { UserConfig } from "vite"
import { fileURLToPath } from "node:url"
import vue from "@vitejs/plugin-vue"
import react from "@vitejs/plugin-react"

/** Multi-entry library build: agnostic core, Vue wrapper, React wrapper, shared SCSS.
    Declarations are emitted separately by TS7-native `tsc` via the build script.
    `root` is pinned to this file's dir so SFC/tsconfig resolution is identical no
    matter where the outer `npm install` invokes the `prepare` build from. The Vue
    SFC `<script lang="ts">` Oxc transform needs the SFCs matched by tsconfig
    `include` (see tsconfig.json) or it throws `[TSCONFIG_ERROR]` on cold CI runs. */
const config = {
   root: fileURLToPath(new URL(".", import.meta.url)),
   plugins: [
      vue(),
      react({ include: /\.(tsx|jsx)$/ }),
      {
         name: "retain-style-import",
         generateBundle(_options, bundle) {
            Object.values(bundle).forEach((output) => {
               if (output.type === "chunk" && output.isEntry && ["vue", "react"].includes(output.name))
                  output.code = `import "./style.css";\n${output.code}`
            })
         },
      },
   ],
   build: {
      lib: {
         entry: {
            index: "ts/index.ts",
            vue: "ui/vue/index.ts",
            react: "ui/react/index.ts",
         },
         formats: ["es"],
      },
      rolldownOptions: {
         external: ["fhirclient", "vue", "react", "react/jsx-runtime"],
         output: {
            assetFileNames: "style.css",
            chunkFileNames: "core.js",
            minify: {
               compress: true,
               mangle: false,
               codegen: false,
            },
            // Keep the framework-agnostic core in its own chunk so Vue/React
            // code can never be hoisted into the shared bundle.
            manualChunks: (id) => (id.includes("/ts/") ? "core" : undefined),
         },
      },
      cssCodeSplit: false,
   },
} as UserConfig

export default defineConfig(config)
