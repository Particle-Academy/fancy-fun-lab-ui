import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/styles.css"],
  format: ["esm", "cjs"],
  dts: { entry: ["src/index.ts"] },
  external: ["react", "react-dom", "@particle-academy/react-fancy"],
  treeshake: true,
  clean: true,
  sourcemap: true,
});
