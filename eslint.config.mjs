import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config.
 *
 * Why this is composed by hand instead of using `eslint-config-next`:
 * ESLint 10 removed the legacy eslintrc mode, and `eslint-config-next`
 * pulls in `eslint-plugin-react` / `eslint-plugin-import` /
 * `eslint-plugin-jsx-a11y`, none of which support ESLint 10 yet — their
 * latest releases still declare a `^9` peer range, and
 * `eslint-plugin-react` throws outright at lint time under ESLint 10.
 *
 * The plugins used below all support ESLint 10, so the Next.js, React
 * Hooks and TypeScript rules are preserved with no deprecated or
 * incompatible dependency.
 *
 * On the React Hooks rule set: only `rules-of-hooks` and
 * `exhaustive-deps` are enabled — the same two rules the project ran
 * under the previous ecosystem (eslint-plugin-react-hooks v5, which
 * `eslint-config-next` depended on). The newer compiler-oriented rules
 * such as `set-state-in-effect` are deliberately left off: this app uses
 * the standard hydration-gate and localStorage-backed-theme patterns,
 * which those rules flag despite being correct here.
 */
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts"],
  },

  // Next.js rules (recommended + Core Web Vitals) — native flat config.
  nextPlugin.configs["core-web-vitals"],

  // React Hooks rules — flat entry built explicitly, because the plugin
  // still publishes its shareable configs in the legacy shape.
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // TypeScript rules — native flat config.
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
