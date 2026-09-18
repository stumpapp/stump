import { useMemo } from 'react'
import { useMediaMatch } from 'rooks'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { DARK_THEMES } from '@/hooks/useTheme'
import { useUserStore } from '@/stores'

const Toaster = ({ ...props }: ToasterProps) => {
	const appTheme = useUserStore((state) => state.userPreferences?.appTheme)
	const prefersDark = useMediaMatch('(prefers-color-scheme: dark)')

	const isDarkVariant = useMemo(() => {
		const darkThemes = [...DARK_THEMES, ...(prefersDark ? ['system'] : [])]
		return darkThemes.includes(appTheme || 'light')
	}, [appTheme, prefersDark])

	return (
		<Sonner
			theme={isDarkVariant ? 'dark' : 'light'}
			className="toaster group"
			style={
				{
					'--normal-bg': 'var(--background)',
					'--normal-text': 'var(--foreground)',
					'--normal-border': 'var(--border)',
				} as React.CSSProperties
			}
			{...props}
		/>
	)
}

export { Toaster }
