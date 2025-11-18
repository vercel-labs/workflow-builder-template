// Monaco editor theme configuration for Vercel-like dark mode
export const vercelDarkTheme = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    // Default foreground
    { token: "", foreground: "ededed" },

    // Comments
    { token: "comment", foreground: "a1a1a1", fontStyle: "italic" },

    // Keywords (pink)
    { token: "keyword", foreground: "ff4d8d" },
    { token: "keyword.operator", foreground: "ff4d8d" },

    // Strings (green)
    { token: "string", foreground: "00ca50" },
    { token: "string.escape", foreground: "00ca50" },

    // Numbers (white)
    { token: "number", foreground: "ffffff" },

    // Types (blue)
    { token: "type", foreground: "47a8ff" },
    { token: "type.identifier", foreground: "47a8ff" },

    // Identifiers and parameters (light gray - default)
    { token: "identifier", foreground: "ededed" },
    { token: "parameter", foreground: "ededed" },
    { token: "variable", foreground: "ededed" },
    { token: "variable.parameter", foreground: "ededed" },

    // Functions (purple)
    { token: "function", foreground: "c472fb" },
    { token: "identifier.function", foreground: "c472fb" },
    { token: "member.function", foreground: "c472fb" },

    // Built-in constants like true/false/null (blue)
    { token: "constant.language", foreground: "47a8ff" },
    { token: "keyword.json", foreground: "47a8ff" },

    // Built-in objects like console (light gray)
    { token: "variable.predefined", foreground: "ededed" },
    { token: "support.variable", foreground: "ededed" },
    { token: "support.constant", foreground: "ededed" },

    // Delimiters and punctuation (light gray)
    { token: "delimiter", foreground: "ededed" },
    { token: "delimiter.bracket", foreground: "ededed" },
    { token: "delimiter.parenthesis", foreground: "ededed" },
    { token: "delimiter.curly", foreground: "ededed" },
    { token: "delimiter.array", foreground: "ededed" },
    { token: "punctuation", foreground: "ededed" },

    // Operators (light gray)
    { token: "operator", foreground: "ededed" },

    // JSON-specific tokens
    { token: "string.key.json", foreground: "47a8ff" },
    { token: "string.value.json", foreground: "00ca50" },
    { token: "number.json", foreground: "ffffff" },
    { token: "keyword.json", foreground: "47a8ff" },
  ],
  colors: {
    "editor.background": "#000000",
    "editor.foreground": "#ededed",
    "editorLineNumber.foreground": "#444444",
    "editorLineNumber.activeForeground": "#888888",
    "editor.lineHighlightBackground": "#0A0A0A",
    "editor.selectionBackground": "#264F78",
    "editor.inactiveSelectionBackground": "#1A1A1A",
    "editorCursor.foreground": "#FFFFFF",
    "editorWhitespace.foreground": "#333333",
    "editorIndentGuide.background": "#1A1A1A",
    "editorIndentGuide.activeBackground": "#333333",
    "editorBracketMatch.background": "#0A0A0A",
    "editorBracketMatch.border": "#444444",
  },
};
