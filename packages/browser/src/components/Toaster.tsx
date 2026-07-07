import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/hooks'

const Toaster = ({ ...props }: ToasterProps) => {
	const { isDarkVariant } = useTheme()

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
