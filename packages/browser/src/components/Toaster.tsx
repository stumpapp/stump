import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			style={
				{
					'--normal-bg': 'hsl(var(--twc-background))',
					'--normal-text': 'hsl(var(--twc-foreground))',
					'--normal-border': 'hsl(var(--twc-edge))',
				} as React.CSSProperties
			}
			{...props}
		/>
	)
}

export { Toaster }
