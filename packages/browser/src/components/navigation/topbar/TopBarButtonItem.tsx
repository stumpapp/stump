import { cn } from '@stump/components'
import { forwardRef } from 'react'

type Props = {
	isDisabled?: boolean
} & React.HTMLAttributes<HTMLDivElement>
const TopBarButtonItem = forwardRef<HTMLDivElement, Props>(
	({ className, isDisabled, ...props }, ref) => {
		return (
			<div
				ref={ref}
				{...props}
				className={cn(
					'rounded-md px-3 py-2 flex w-full cursor-pointer items-center leading-none text-foreground-subtle no-underline transition-colors outline-none select-none hover:bg-sidebar-surface-hover focus:bg-sidebar-surface',
					{ 'pointer-events-none text-foreground-muted': isDisabled },
					className,
				)}
			/>
		)
	},
)
TopBarButtonItem.displayName = 'TopBarButtonItem'

export default TopBarButtonItem
