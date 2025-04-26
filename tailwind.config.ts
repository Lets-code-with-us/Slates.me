import type { Config } from "tailwindcss";
import typography from '@tailwindcss/typography';

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
			colors: {
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
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
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
			},
			typography: (theme: any) => ({
				DEFAULT: {
					css: {
						maxWidth: 'none',
						color: theme('colors.foreground'),
						a: {
							color: theme('colors.primary.DEFAULT'),
							'&:hover': {
								color: theme('colors.primary.DEFAULT/0.8'),
							},
						},
						'h1, h2, h3, h4, h5, h6': {
							color: theme('colors.foreground'),
							marginTop: '1.5em',
							marginBottom: '0.75em',
						},
						pre: {
							backgroundColor: theme('colors.muted.DEFAULT'),
							color: theme('colors.foreground'),
						},
						code: {
							backgroundColor: theme('colors.muted.DEFAULT'),
							color: theme('colors.foreground'),
							borderRadius: theme('borderRadius.sm'),
						},
						blockquote: {
							borderLeftColor: theme('colors.muted.DEFAULT'),
							color: theme('colors.muted.foreground'),
						},
						hr: {
							borderColor: theme('colors.border'),
						},
						'thead, tbody tr': {
							borderBottomColor: theme('colors.border'),
						},
						'ol li::marker, ul li::marker': {
							color: theme('colors.muted.foreground'),
						}
					},
				},
				invert: {
					css: {
						color: theme('colors.foreground'),
					},
				},
			}),
		}
	},
	plugins: [
		typography,
		require("tailwindcss-animate")
	],
} satisfies Config;
