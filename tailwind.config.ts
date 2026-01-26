import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  // Enable future features
  future: {
    hoverOnlyWhenSupported: true,
  },
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontWeight: {
        thin: '200',
        light: '300',
        normal: '400',
        medium: '500',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Intent-based colors
        intent: {
          primary: "hsl(var(--intent-primary))",
          "primary-glow": "hsl(var(--intent-primary-glow))",
          secondary: "hsl(var(--intent-secondary))",
          "secondary-glow": "hsl(var(--intent-secondary-glow))",
          neutral: "hsl(var(--intent-neutral))",
          focus: "hsl(var(--intent-focus))",
          success: "hsl(var(--intent-success))",
          warning: "hsl(var(--intent-warning))",
        },
        
        // Surface colors
        surface: {
          void: "hsl(var(--surface-void))",
          deep: "hsl(var(--surface-deep))",
          glass: "hsl(var(--surface-glass))",
          elevated: "hsl(var(--surface-elevated))",
        },
        
        // Text hierarchy
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          muted: "hsl(var(--text-muted))",
          ghost: "hsl(var(--text-ghost))",
        },
        
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
          DEFAULT: "hsl(var(--accent))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      spacing: {
        'nano': '4px',
        'micro': '8px',
        'cognitive-sm': '12px',
        'cognitive-md': '20px',
        'cognitive-lg': '32px',
        'cognitive-xl': '48px',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        cognitive: "var(--radius-lg)",
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px hsl(var(--intent-primary) / 0.4), 0 0 40px -10px hsl(var(--intent-primary) / 0.3)',
        'glow-secondary': '0 0 20px -5px hsl(var(--intent-secondary) / 0.35), 0 0 40px -10px hsl(var(--intent-secondary) / 0.25)',
        'glow-subtle': '0 0 30px -10px hsl(var(--intent-primary) / 0.15)',
        'ambient': '0 8px 32px -8px hsl(220 40% 4% / 0.8)',
        'elevated': '0 20px 60px -20px hsl(220 40% 2% / 0.9)',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '32px',
      },
      transitionTimingFunction: {
        'cognitive-enter': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'cognitive-exit': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'micro': '120ms',
        'short': '220ms',
        'medium': '360ms',
        'long': '520ms',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
        },
        "dissolve": {
          "0%": { opacity: "1", filter: "blur(0px)" },
          "100%": { opacity: "0", filter: "blur(8px)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px -5px hsl(var(--intent-primary) / 0.3)" },
          "50%": { boxShadow: "0 0 30px -5px hsl(var(--intent-primary) / 0.5)" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "orbit": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "scan-line": {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "0.5" },
          "90%": { opacity: "0.5" },
          "100%": { top: "100%", opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.36s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-out": "fade-out 0.22s cubic-bezier(0.7, 0, 0.84, 0)",
        "dissolve": "dissolve 0.4s cubic-bezier(0.7, 0, 0.84, 0) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "breathe": "breathe 3s ease-in-out infinite",
        "orbit": "orbit 8s linear infinite",
        "scan-line": "scan-line 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;