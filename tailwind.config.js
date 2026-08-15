/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0E12",
        surface: "#16161B",
        elevated: "#1E1E25",
        muted: "#9CA3AF",
        line: "#27272A",
        accent: "#3B82F6",
        accentHover: "#2563EB",
        success: "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        md2: "10px",
        lg2: "14px",
        xl2: "18px",
      },
      boxShadow: {
        soft: "0 8px 40px rgba(0,0,0,0.35)",
        card: "0 4px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
