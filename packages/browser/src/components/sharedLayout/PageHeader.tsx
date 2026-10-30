import { cn } from '@stump/components'
import { ReactNode } from 'react'

import { Sidebar } from '../navigation/sidebar'

type Props = {
	children?: ReactNode
	className?: string
}

/**
 * a header at the top of the page that holds a trigger to collapse the sidebar. every page
 * should have this if not e.g. a reader or some full-screen experience
 *
 * compose via slots like:
 *
 * ```tsx
 * <PageHeader>
 *   <PageHeader.Start>{breadcrumbs}</PageHeader.Start>
 *   <PageHeader.End>{actions}</PageHeader.End>
 * </PageHeader>
 * ```
 */
function PageHeaderRoot({ children, className }: Props) {
	return (
		<header
			data-slot="page-header"
			data-tauri-drag-region
			// TODO: ^ adding this but may change based on how i do things, e.g. if i lean more towards a
			// Linear aesthetic the draft region is above main content + sidebar trigger right of traffic lights
			className={cn(
				'top-0 h-12 sticky z-50 flex w-full shrink-0 items-center border-b border-border bg-background',
				className,
			)}
		>
			<div data-tauri-drag-region className="h-12 gap-3 pr-4 pl-2 min-w-0 flex w-full items-center">
				<Sidebar.Trigger />
				{children}
			</div>
		</header>
	)
}

type SlotProps = {
	children?: ReactNode
	className?: string
}

/** left-aligned content */
function PageHeaderStart({ children, className }: SlotProps) {
	return (
		<div
			data-slot="page-header-start"
			data-tauri-drag-region
			className={cn('gap-3 min-w-0 flex flex-1 items-center', className)}
		>
			{children}
		</div>
	)
}

/** right-aligned content */
function PageHeaderEnd({ children, className }: SlotProps) {
	return (
		<div data-slot="page-header-end" className={cn('gap-2 flex shrink-0 items-center', className)}>
			{children}
		</div>
	)
}

export const PageHeader = Object.assign(PageHeaderRoot, {
	Start: PageHeaderStart,
	End: PageHeaderEnd,
})
