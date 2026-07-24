import { readFileSync, writeFileSync } from "node:fs"

const
   rel = (from, to) => from.split("/").slice(0, -1).map(() => "..").concat(to).join("/"),

   link = (entry, refs) => {
      const
         head = refs.map((r) => `/// <reference path="${rel(entry, r)}" />`).join("\n"),
         body = readFileSync(entry, "utf8")
      body.startsWith("///") || writeFileSync(entry, `${head}\n${body}`)
   }

link("dist/ts/index.d.ts", ["types/core.d.ts", "types/native.d.ts"])
link("dist/ui/react/index.d.ts", ["types/core.d.ts", "types/native.d.ts", "types/react.d.ts", "types/assets.d.ts"])
link("dist/ui/vue/index.d.ts", ["types/core.d.ts", "types/native.d.ts", "types/vue-shim.d.ts"])
