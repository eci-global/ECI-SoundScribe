
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: [
					'Helvetica Neue',
					'Helvetica',
					'Arial',
					'sans-serif'
				],
				mono: [
					'SF Mono',
					'SFMono-Regular',
					'ui-monospace',
					'Menlo',
					'Monaco',
					'Consolas',
					'Liberation Mono',
					'Courier New',
					'monospace'
				]
			},
			fontSize: {
				'display-large': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
				'display': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
				'title-large': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
				'title': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
				'title-small': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
				'body-large': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
				'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
				'body-small': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
				'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
				'overline': ['11px', { lineHeight: '1.3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }],
			},
			colors: {
				// ECI AI Incubator Brand Colors
				'brand-red': '#F5333F',
				'brand-charcoal': '#414042',
				'brand-light-gray': '#F5F5F5',
				'lavender': '#E3DBFF',
				'player-lavender': '#7C5CFF',
				'player-magenta': '#FF3D80',
				'eci-charcoal': '#404040',
				'eci-charcoal-light': '#525252',
				'eci-charcoal-dark': '#2a2a2a',
				'eci-red': '#F5333F',
				'eci-red-dark': '#D12B37',
				'eci-red-light': '#F7656E',
				'eci-slate': '#64748b',
				'eci-slate-light': '#94a3b8',
				'eci-slate-dark': '#475569',
				'eci-gray-50': '#f8fafc',
				'eci-gray-100': '#f1f5f9',
				'eci-gray-200': '#e2e8f0',
				'eci-gray-300': '#cbd5e1',
				'eci-gray-400': '#94a3b8',
				'eci-gray-500': '#64748b',
				'eci-gray-600': '#475569',
				'eci-gray-700': '#334155',
				'eci-gray-800': '#1e293b',
				'eci-gray-900': '#0f172a',
				'eci-blue': '#3b82f6',
				'eci-blue-dark': '#1d4ed8',
				'eci-teal': '#0d9488',
				'eci-teal-dark': '#0f766e',
				'speaker-purple': '#6C63FF',
				'speaker-teal': '#00B5AD',
				// Admin interface accent
				'eci-violet': '#7C5CFF',
				'eci-violet-light': '#9B7CFF',
				'eci-admin-bg': '#F9F9FC',
				// Legacy colors for compatibility
				'eci-dark-gray': '#334155',
				'eci-light-gray': '#f8fafc',
				'gong-purple': '#F5333F',
				'gong-purple-light': '#F7656E',
				'gong-purple-dark': '#D12B37',
				'gong-gray': '#334155',
				'gong-gray-light': '#64748b',
				'gong-gray-lighter': '#94a3b8',
				'gong-bg': '#f8fafc',
				'gong-border': '#e2e8f0',
				gradientStart: '#F5333F',
				gradientEnd: '#F7656E',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				}
			},
			backgroundImage: {
				'eci-gradient': 'linear-gradient(135deg, #F5333F 0%, #F7656E 100%)',
				'accent-gradient': 'linear-gradient(135deg, #F5333F 0%, #F7656E 100%)',
			},
			backdropBlur: {
				'glass': '16px',
			},
			boxShadow: {
				'eci': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
				'eci-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				'eci-subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
			},
			spacing: {
				'18': '4.5rem',
				'55': '13.75rem',
			},
			width: {
				'18': '4.5rem',
				'55': '13.75rem',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
