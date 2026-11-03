import { cva, VariantProps } from 'class-variance-authority'
import { forwardRef, Fragment } from 'react'

import { ToolTipContentProps, TooltipPortal, ToolTipPrimitive, ToolTipProvider } from './primitives'

const toolTipVariants = cva('bg-popover text-popover-foreground dark:border dark:border-white/5', {
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
	/**
	 * whether to render the content in a portal
	 */
	portal?: boolean
} & BaseProps

export const ToolTip = forwardRef<HTMLButtonElement, ToolTipProps>(
	({ children, content, align, side, size, isDisabled, portal = true }, ref) => {
		const Container = portal ? TooltipPortal : Fragment
		return (
			<ToolTipProvider>
				<ToolTipPrimitive>
					<ToolTipPrimitive.Trigger asChild disabled={isDisabled} ref={ref}>
						{children}
					</ToolTipPrimitive.Trigger>
					<Container>
						<ToolTipPrimitive.Content
							align={align}
							side={side}
							className={toolTipVariants({ size })}
						>
							{content}
						</ToolTipPrimitive.Content>
					</Container>
				</ToolTipPrimitive>
			</ToolTipProvider>
		)
	},
)
ToolTip.displayName = 'ToolTip'
