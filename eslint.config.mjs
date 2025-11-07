import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow 'any' type in some cases (gradually migrate to unknown)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars that start with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
        },
      ],
      // Allow setState in useEffect for initialization
      "react-hooks/set-state-in-effect": "warn",
      // Allow missing dependencies in useEffect (can be too strict)
      "react-hooks/exhaustive-deps": "warn",
      // Allow img tags (we use them for dynamic images)
      "@next/next/no-img-element": "warn",
      // Allow unescaped entities in some cases
      "react/no-unescaped-entities": "warn",
      // Prefer const but allow let when needed
      "prefer-const": "warn",
      // Prefer as const but allow literal types
      "@typescript-eslint/prefer-as-const": "warn",
    },
  },
]);

export default eslintConfig;
