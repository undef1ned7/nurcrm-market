import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const boundarySettings = {
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
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    },
    node: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
  },
};

const sharedPlugins = {
  "react-hooks": reactHooks,
  "react-refresh": reactRefresh,
  boundaries,
};

const sharedRules = {
  "react-hooks/rules-of-hooks": "error",
  "react-hooks/exhaustive-deps": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/purity": "off",
  "react-hooks/immutability": "off",
  "react-hooks/refs": "off",
  "react-hooks/static-components": "off",
  "react-hooks/use-memo": "off",
  "react-hooks/incompatible-library": "off",
  "react-refresh/only-export-components": "off",
  "no-empty": ["warn", { allowEmptyCatch: true }],
  "no-useless-assignment": "off",
  "no-control-regex": "warn",
  "no-unused-vars": "off",
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
              // Typed Redux hooks live in app/store (migration DoD).
              { element: { type: "app" } },
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
              { element: { type: "app" } },
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
              { element: { type: "app" } },
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
};

export default tseslint.config(
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      "tools/**",
      "scripts/**",
      ".cursor/**",
      "*.config.js",
      "vite.config.js",
      "src/**/*.d.ts",
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
    plugins: sharedPlugins,
    settings: boundarySettings,
    rules: {
      ...sharedRules,
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
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
    plugins: sharedPlugins,
    settings: boundarySettings,
    rules: {
      ...sharedRules,
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          // DoD: forbid @ts-nocheck and @ts-ignore; allow @ts-expect-error with description.
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
          "minimumDescriptionLength": 5,
        },
      ],
      "@typescript-eslint/no-unused-expressions": "off",
      "no-undef": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-refresh/only-export-components": "off",
    },
  },
);
