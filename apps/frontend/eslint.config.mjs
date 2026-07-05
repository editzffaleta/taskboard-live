import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Infra reutilizavel herdada do template (sistema de validacao generico + branding):
  // manipulacao de tipos generica onde `any` e intencional. Mantemos a regra como erro
  // no codigo de feature (app/, modules/); relaxamos apenas nesta camada de utilitarios.
  {
    files: [
      "src/shared/components/form/validator/**",
      "src/shared/components/branding/**",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
