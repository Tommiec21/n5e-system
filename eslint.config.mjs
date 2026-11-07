import js from "@eslint/js";
import globals from "globals";

const foundryGlobals = {
  foundry: "readonly", game: "readonly", CONFIG: "readonly", CONST: "readonly", Hooks: "readonly",
  ui: "readonly", canvas: "readonly", Roll: "readonly", ChatMessage: "readonly", Actor: "readonly",
  Item: "readonly", ActiveEffect: "readonly", TextEditor: "readonly", Handlebars: "readonly",
  fromUuid: "readonly", fromUuidSync: "readonly"
};

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...foundryGlobals }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "prefer-const": "warn",
      "eqeqeq": ["error", "smart"]
    }
  },
  { files: ["tools/**", "tests/**"], languageOptions: { globals: { ...globals.node } } }
];
