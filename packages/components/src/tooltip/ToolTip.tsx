import { cva, VariantProps } from 'class-variance-authority'

import { ToolTipContentProps, ToolTipPrimitive, ToolTipProvider } from './primitives'

const toolTipVariants = cva(undefined, {
	defaultVariants: {
		size: 'md',
	},
	variants: {
		size: {
			lg: 'text-base',
			md: 'text-sm',
			sm: 'p-1 text-sm',
			xs: 'p-1 text-xs',
		},
	},
})

type BaseProps = VariantProps<typeof toolTipVariants> & Pick<ToolTipContentProps, 'align'>
export type ToolTipProps = {
	children: React.ReactNode
	content: string | React.ReactNode
	isDisabled?: boolean
} & BaseProps

export function ToolTip({ children, content, align, size, isDisabled }: ToolTipProps) {
	return (
		<ToolTipProvider>
			<ToolTipPrimitive>
				<ToolTipPrimitive.Trigger asChild disabled={isDisabled}>
					{children}
				</ToolTipPrimitive.Trigger>
				<ToolTipPrimitive.Content align={align} className={toolTipVariants({ size })}>
					{content}
				</ToolTipPrimitive.Content>
			</ToolTipPrimitive>
		</ToolTipProvider>
	)
}
