import { ToolTipContentProps, ToolTipPrimitive, ToolTipProvider } from './primitives'

type BaseProps = Pick<ToolTipContentProps, 'align'>
export type ToolTipProps = {
	children: React.ReactNode
	content: string | React.ReactNode
} & BaseProps

export function ToolTip({ children, content, align }: ToolTipProps) {
	return (
		<ToolTipProvider>
			<ToolTipPrimitive>
				<ToolTipPrimitive.Trigger asChild>{children}</ToolTipPrimitive.Trigger>
				<ToolTipPrimitive.Content align={align}>{content}</ToolTipPrimitive.Content>
			</ToolTipPrimitive>
		</ToolTipProvider>
	)
}
