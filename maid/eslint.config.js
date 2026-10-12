// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const ngrx = require("@ngrx/eslint-plugin");

module.exports = tseslint.config(
  {
    ignores: [
      "dist/**",
      ".angular/**",
      "node_modules/**",
      "projects/**",
      "src/locale/compiled-messages.ts",
    ],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      ...ngrx.configs.signals,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      // Required by the type aware @ngrx state shape rules below.
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // Not part of the @ngrx signals preset, but they guard the signal store
      // state shape.
      "@ngrx/signal-state-no-arrays-at-root-level": "error",
      "@ngrx/with-state-no-arrays-at-root-level": "error",
      // Codebase wide migrations that are still in progress. Kept visible as
      // warnings so an error always means something is actually broken.
      "@angular-eslint/prefer-inject": "warn",
      "@angular-eslint/prefer-on-push-component-change-detection": "warn",
      "@angular-eslint/directive-selector": [
        "off",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/prefer-control-flow": "warn",
      "@angular-eslint/template/click-events-have-key-events": "off",
      "@angular-eslint/template/label-has-associated-control": "off",
      "@angular-eslint/template/interactive-supports-focus": "off",
      "@angular-eslint/template/mouse-events-have-key-events": "off",
    },
  },
);
