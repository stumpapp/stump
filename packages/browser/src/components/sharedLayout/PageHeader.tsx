import { cn } from '@stump/components'
import { ReactNode } from 'react'

import { Sidebar } from '../navigation/sidebar'

type Props = {
	children?: ReactNode
	className?: string
}

// TODO: might be nice to integrate helmet into this too

/**
 * a header at the top of the page that holds a trigger to collapse the sidebar. children
 * can be passed and will be positioned next to it. every page should have this
 * if not e.g. a reader
 */
export function PageHeader({ children, className }: Props) {
	return (
		<header
			className={cn(
				'top-0 h-12 sticky z-50 flex w-full shrink-0 items-center border-b border-border bg-background',
				className,
			)}
		>
			<div className="h-12 gap-3 pr-4 pl-2 min-w-0 flex w-full items-center">
				<Sidebar.Trigger />
				{children}
			</div>
		</header>
	)
}
