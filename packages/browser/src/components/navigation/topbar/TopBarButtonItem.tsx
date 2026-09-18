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
					'px-3 py-2 flex w-full cursor-pointer items-center rounded-md leading-none text-sidebar-foreground no-underline transition-colors outline-none select-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground',
					{ 'pointer-events-none text-muted-foreground': isDisabled },
					className,
				)}
			/>
		)
	},
)
TopBarButtonItem.displayName = 'TopBarButtonItem'

export default TopBarButtonItem
