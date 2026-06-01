import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			style={
				{
					'--normal-bg': 'var(--color-background)',
					'--normal-text': 'var(--color-foreground)',
					'--normal-border': 'var(--color-border)',
				} as React.CSSProperties
			}
			{...props}
		/>
	)
}

export { Toaster }
