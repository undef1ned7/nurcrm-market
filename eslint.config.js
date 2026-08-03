import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import boundaries from "eslint-plugin-boundaries";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      "tools/**",
      "*.config.js",
      "vite.config.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app/*" },
        { type: "pages", pattern: "src/pages/*" },
        { type: "widgets", pattern: "src/widgets/*" },
        { type: "features", pattern: "src/features/*" },
        { type: "entities", pattern: "src/entities/*" },
        { type: "shared", pattern: "src/shared/*" },
      ],
      "boundaries/include": [
        "src/app/**",
        "src/pages/**",
        "src/widgets/**",
        "src/features/**",
        "src/entities/**",
        "src/shared/**",
      ],
      "boundaries/legacy-warnings": false,
      "import/resolver": {
        alias: {
          map: [
            ["@", path.join(__dirname, "src")],
            ["@app", path.join(__dirname, "src/app")],
            ["@pages", path.join(__dirname, "src/pages")],
            ["@widgets", path.join(__dirname, "src/widgets")],
            ["@features", path.join(__dirname, "src/features")],
            ["@entities", path.join(__dirname, "src/entities")],
            ["@shared", path.join(__dirname, "src/shared")],
          ],
          extensions: [".js", ".jsx", ".json"],
        },
        node: {
          extensions: [".js", ".jsx"],
        },
      },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/incompatible-library": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-assignment": "warn",
      "no-control-regex": "warn",
      "no-undef": "error",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            {
              from: { element: { type: "app" } },
              allow: {
                to: [
                  { element: { type: "app" } },
                  { element: { type: "pages" } },
                  { element: { type: "widgets" } },
                  { element: { type: "features" } },
                  { element: { type: "entities" } },
                  { element: { type: "shared" } },
                ],
              },
            },
            {
              from: { element: { type: "pages" } },
              allow: {
                to: [
                  { element: { type: "pages" } },
                  { element: { type: "widgets" } },
                  { element: { type: "features" } },
                  { element: { type: "entities" } },
                  { element: { type: "shared" } },
                ],
              },
            },
            {
              from: { element: { type: "widgets" } },
              allow: {
                to: [
                  { element: { type: "widgets" } },
                  { element: { type: "features" } },
                  { element: { type: "entities" } },
                  { element: { type: "shared" } },
                ],
              },
            },
            {
              from: { element: { type: "features" } },
              allow: {
                to: [
                  { element: { type: "features" } },
                  { element: { type: "entities" } },
                  { element: { type: "shared" } },
                ],
              },
            },
            {
              from: { element: { type: "entities" } },
              allow: {
                to: [
                  { element: { type: "entities" } },
                  { element: { type: "shared" } },
                ],
              },
            },
            {
              from: { element: { type: "shared" } },
              allow: {
                to: [{ element: { type: "shared" } }],
              },
            },
          ],
        },
      ],
    },
  },
];
