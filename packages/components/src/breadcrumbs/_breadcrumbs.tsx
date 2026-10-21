import { Slot } from '@radix-ui/react-slot'
import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

// TODO: rename rm _ after replacing Breadcrumbs

function BreadcrumbRoot({ className, ...props }: React.ComponentProps<'nav'>) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				'gap-1.5 text-sm flex flex-wrap items-center wrap-break-word text-muted-foreground',
				className,
			)}
			{...props}
		/>
	)
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-item"
			className={cn('gap-1 inline-flex items-center', className)}
			{...props}
		/>
	)
}

function BreadcrumbLink({
	asChild,
	className,
	...props
}: React.ComponentProps<'a'> & {
	asChild?: boolean
}) {
	const Comp = asChild ? Slot : 'a'

	return (
		<Comp
			data-slot="breadcrumb-link"
			className={cn('transition-colors hover:text-foreground', className)}
			{...props}
		/>
	)
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-page"
			role="link"
			aria-disabled="true"
			aria-current="page"
			className={cn('font-normal text-foreground', className)}
			{...props}
		/>
	)
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-separator"
			role="presentation"
			aria-hidden="true"
			className={cn('[&>svg]:size-3.5', className)}
			{...props}
		>
			{children ?? <ChevronRightIcon className="cn-rtl-flip" />}
		</li>
	)
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-ellipsis"
			role="presentation"
			aria-hidden="true"
			className={cn('size-5 [&>svg]:size-4 flex items-center justify-center', className)}
			{...props}
		>
			<MoreHorizontalIcon />
			<span className="sr-only">More</span>
		</span>
	)
}

type BreadcrumbComponent = typeof BreadcrumbRoot & {
	Ellipsis: typeof BreadcrumbEllipsis
	Item: typeof BreadcrumbItem
	Link: typeof BreadcrumbLink
	List: typeof BreadcrumbList
	Page: typeof BreadcrumbPage
	Separator: typeof BreadcrumbSeparator
}

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
	Ellipsis: BreadcrumbEllipsis,
	Item: BreadcrumbItem,
	Link: BreadcrumbLink,
	List: BreadcrumbList,
	Page: BreadcrumbPage,
	Separator: BreadcrumbSeparator,
}) as BreadcrumbComponent
