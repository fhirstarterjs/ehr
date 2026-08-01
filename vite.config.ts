import { defineConfig } from "vite"
import type { UserConfig } from "vite"
import { fileURLToPath } from "node:url"
import vue from "@vitejs/plugin-vue"
import react from "@vitejs/plugin-react"

const config = {
   root: fileURLToPath(new URL(".", import.meta.url)),
   plugins: [
      vue(),
      react({ include: /\.(tsx|jsx)$/ }),
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
         external: ["vue", "react", "react/jsx-runtime"],
         output: {
            chunkFileNames: "core.js",
            minify: {
               compress: true,
               mangle: false,
               codegen: false,
            },
            manualChunks: (id) => (id.includes("/ts/") ? "core" : undefined),
         },
      },
      cssCodeSplit: false,
   },
} as UserConfig

export default defineConfig(config)
