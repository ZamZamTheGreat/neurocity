import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    ".vinext/**",
    ".wrangler/**",
    ".identity-test-dist/**",
    ".security-test-dist/**",
    ".seed-dist/**",
    ".sites-release-worktree/**",
    "outputs/**",
    "work/**",
    "**/node_modules/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // Vinext routes use ordinary anchors for deliberate full-document navigation.
      "@next/next/no-html-link-for-pages": "off",
      // Stable async loaders update state after their network requests resolve.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
