import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const compat = new FlatCompat({
  baseDirectory: currentDir,
});

const config = [
  {
    ignores: [".next/**", "coverage/**", "node_modules/**", ".omx/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
