/** @type {import('tailwindcss').Config} */
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
        display: ["Inter Variable", "Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        brand: {
          50: "#f0f2ff",
          100: "#e3e6ff",
          200: "#ccd1ff",
          300: "#a5adfb",
          400: "#7b84f7",
          500: "#5b62ef",
          600: "#4a47e6",
          700: "#3f36c5",
          800: "#342e97",
          900: "#2b2670",
          950: "#1a1640",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0b9c9",
          400: "#8692a6",
          500: "#67748b",
          600: "#525d72",
          700: "#434c5d",
          800: "#3a3f4d",
          900: "#232833",
          950: "#161a22",
        },
        surface: {
          DEFAULT: "#ffffff",
          alt: "#f6f7f9",
          dark: "#0c0e14",
          "dark-alt": "#12141c",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
        "4xl": "1.75rem",
      },
      boxShadow: {
        "soft-sm": "0 1px 2px 0 rgb(16 24 40 / 0.05), 0 1px 3px 0 rgb(16 24 40 / 0.04)",
        soft: "0 4px 16px -4px rgb(16 24 40 / 0.10), 0 2px 5px -2px rgb(16 24 40 / 0.06)",
        "soft-lg": "0 16px 50px -12px rgb(16 24 40 / 0.18), 0 6px 18px -8px rgb(16 24 40 / 0.10)",
        "glow-brand":
          "0 8px 30px -6px rgb(99 91 255 / 0.45), 0 4px 12px -6px rgb(99 91 255 / 0.35)",
        "glow-violet":
          "0 8px 30px -6px rgb(139 92 246 / 0.45), 0 4px 12px -6px rgb(139 92 246 / 0.35)",
        ring: "0 0 0 3px rgb(99 91 255 / 0.18)",
        float: "0 24px 60px -12px rgb(16 24 40 / 0.22)",
      },
      letterSpacing: {
        tighter: "-0.035em",
        tightest: "-0.05em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(6px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "blur-in": {
          "0%": { opacity: "0", transform: "scale(0.98) translateY(8px)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)", filter: "blur(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(24px,-28px) scale(1.06)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -40px) scale(1.08)" },
          "66%": { transform: "translate(-24px, 24px) scale(0.96)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "bar-grow": {
          "0%": { transform: "scaleY(0)" },
          "100%": { transform: "scaleY(1)" },
        },
        "pop": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "70%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.96)" },
          "60%": { transform: "translateY(-3px) scale(1.01)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "accordion-down": {
          "0%": { height: "0", opacity: "0" },
          "100%": { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-down": "fade-down 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        "blur-in": "blur-in 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slide-down 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float-slow 14s ease-in-out infinite",
        "blob-drift": "blob-drift 22s ease-in-out infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        shimmer: "shimmer 1.8s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
        pop: "pop 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        "toast-in": "toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        400: "400ms",
        500: "500ms",
        700: "700ms",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #5d5bef 0%, #7c5cf6 50%, #a25bf5 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(93,91,239,0.12) 0%, rgba(124,92,246,0.10) 50%, rgba(162,91,245,0.10) 100%)",
        "mesh": "radial-gradient(60rem 40rem at 120% -10%, rgb(124 92 246 / 0.14), transparent 60%), radial-gradient(50rem 40rem at -20% 110%, rgb(93 91 239 / 0.12), transparent 60%)",
      },
    },
  },
  plugins: [],
};