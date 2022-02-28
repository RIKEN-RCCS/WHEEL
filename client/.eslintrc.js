module.exports = {
  root: true,
  ignorePatterns: ["**/*.json", "**/oldSVG/*"],
  plugins: [
    "vue",
    "jsdoc",
    "chai-expect",
    "chai-friendly",
  ],
  env: {
    es6: true,
  },
  extends: [
    "plugin:vue/recommended",
    "plugin:vuetify/recommended"
  ],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    semi: ["error", "always"],
    "semi-spacing": ["error", { after: true, before: false }],
    "semi-style": ["error", "last"],
    "no-extra-semi": "error",
    "no-unexpected-multiline": "error",
    "no-unreachable": "error",
    quotes: ["error", "double"],
    "no-console": "off",
    "no-debugger": "off",
    "no-param-reassign": "warn",
    "arrow-parens": ["error", "always"],
    "arrow-body-style": ["error", "always"],
    "arrow-spacing": [
      "error",
      { before: false, after: false },
    ],
    camelcase: ["error", { properties: "never" }],
    eqeqeq: ["error", "always", { null: "ignore" }],
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    indent: ["error", 2, { SwitchCase: 1 }],
    "lines-around-comment": ["error", {
      beforeBlockComment: true,
      beforeLineComment: false,
    }],
    "lines-between-class-members": ["error", "always", { exceptAfterSingleLine: true }],
    "newline-per-chained-call": "error",
    "no-use-before-define": ["error", { functions: false }],
    "no-warning-comments": "warn",
    "padded-blocks": ["error", "never"],
    "padding-line-between-statements": [
      "error",
      {
        blankLine: "any",
        prev: ["const", "let", "var"],
        next: "*",
      },
      {
        blankLine: "always",
        prev: "*",
        next: [
          "block-like",
          "class",
          "do",
          "for",
          "function",
          "multiline-block-like",
          "switch",
          "try",
          "while",
        ],
      },
      {
        blankLine: "any",
        prev: ["const", "let", "var", "for", "while", "do", "block-like", "multiline-block-like"],
        next: [
          "block-like",
          "do",
          "for",
          "multiline-block-like",
          "switch",
          "try",
          "while",
        ],
      },
    ],
    "spaced-comment": ["error", "always"],
    "require-unicode-regexp": "off",
  },
  overrides: [
    {
      files: [
        "**/__tests__/*.{j,t}s?(x)",
        "**/tests/unit/**/*.spec.{j,t}s?(x)",
        "**/tests/e2e/**/*.{j,t}s?(x)",
      ],
      env: {
        mocha: true,
      },
      rules: {
        "no-unused-expressions": 0,
        "no-underscore-dangle": "off",
        "chai-friendly/no-unused-expressions": 2,
      },
    },
    {
      files: ["**/*.vue"],
      rules: {
        indent: "off",
      },
    },
  ],
};
