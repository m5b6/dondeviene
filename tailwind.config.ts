import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-color))",
          light: "rgba(var(--accent-color), 0.2)",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        black: "#000",
        white: "#FFF",
        "off-white": "#F5F5F7",
        gray: {
          DEFAULT: "#666",
          light: "#888",
          100: "#f5f5f7",
          200: "#e5e5e7",
          300: "#d4d4d7",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
        'barlow': ['var(--font-barlow-condensed)', 'sans-serif'],
      },
      boxShadow: {
        apple: "0 4px 30px rgba(0, 0, 0, 0.1)",
        "apple-sm": "0 2px 10px rgba(0, 0, 0, 0.05)",
        vision: "0 4px 24px -6px rgba(0, 0, 0, 0.1), 0 12px 48px -4px rgba(0, 0, 0, 0.1)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
        "slide-up": "slideUp 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
        "marker-bounce": "markerBounce 3s ease-in-out infinite",
        "bus-rumble": "busRumble 0.5s ease-in-out infinite",
      },
      keyframes: {
        markerBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        busRumble: {
          "0%": { transform: "rotate(0deg) translateX(0) scale(1)" },
          "15%": { transform: "rotate(-0.3deg) translateX(-0.5px) scale(0.995)" },
          "30%": { transform: "rotate(0deg) translateX(0) scale(1.005)" },
          "45%": { transform: "rotate(0.3deg) translateX(0.5px) scale(0.995)" },
          "60%": { transform: "rotate(0deg) translateY(-0.25px) scale(1)" },
          "75%": { transform: "rotate(-0.2deg) translateY(0.25px) scale(1.005)" },
          "100%": { transform: "rotate(0deg) translateX(0) scale(1)" },
        },
      },
      spacing: {
        "safe-bottom": "var(--safe-bottom)",
        "safe-top": "var(--safe-top)",
        "safe-left": "var(--safe-left)",
        "safe-right": "var(--safe-right)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
