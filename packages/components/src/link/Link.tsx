import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { cn } from '../utils'

const linkVariants = cva('font-medium hover:underline', {
	defaultVariants: {
		variant: 'default',
	},
	variants: {
		variant: {
			brand: 'text-primary-600 dark:text-blue-400',
			default: 'text-gray-900 dark:text-gray-100',
		},
	},
})

type BaseProps = React.ComponentPropsWithoutRef<'a'> &
	Omit<React.ComponentPropsWithoutRef<typeof RouterLink>, 'to'> &
	VariantProps<typeof linkVariants> & {
		to?: string
	}

export type LinkProps = {
	underline?: boolean
} & BaseProps

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
	({ underline = true, to, href, className, variant, ...props }, ref) => {
		const location = {
			[to ? 'to' : 'href']: to ?? href,
		}
		const isExternal = (location.to || location.href || '').startsWith('http')
		const LinkComponent = isExternal || !to ? 'a' : RouterLink

		return (
			// @ts-expect-error: TODO: fix this naive type error
			<LinkComponent
				className={cn(
					linkVariants({ className, variant }),
					underline && 'underline underline-offset-2',
					className,
				)}
				{...location}
				{...props}
				ref={ref}
			/>
		)
	},
)
Link.displayName = 'Link'
