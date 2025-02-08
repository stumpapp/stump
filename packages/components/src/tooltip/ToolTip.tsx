import { cva, VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

import { ToolTipContentProps, ToolTipPrimitive, ToolTipProvider } from './primitives'

const toolTipVariants = cva(undefined, {
	defaultVariants: {
		size: 'sm',
	},
	variants: {
		size: {
			lg: 'text-base',
			md: 'text-sm p-1',
			sm: 'px-2 py-1 text-sm',
			xs: 'p-1 text-xs',
		},
	},
})

type BaseProps = VariantProps<typeof toolTipVariants> & Pick<ToolTipContentProps, 'align' | 'side'>
export type ToolTipProps = {
	children: React.ReactNode
	content: string | React.ReactNode
	isDisabled?: boolean
} & BaseProps

export const ToolTip = forwardRef<HTMLButtonElement, ToolTipProps>(
	({ children, content, align, side, size, isDisabled }, ref) => {
		return (
			<ToolTipProvider>
				<ToolTipPrimitive>
					<ToolTipPrimitive.Trigger asChild disabled={isDisabled} ref={ref}>
						{children}
					</ToolTipPrimitive.Trigger>
					<ToolTipPrimitive.Content align={align} side={side} className={toolTipVariants({ size })}>
						{content}
					</ToolTipPrimitive.Content>
				</ToolTipPrimitive>
			</ToolTipProvider>
		)
	},
)
ToolTip.displayName = 'ToolTip'
