import { cva, VariantProps } from 'class-variance-authority'
import React from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { cn } from '../utils'

const linkVariants = cva(
	'font-medium hover:underline outline-none focus-visible:outline focus-visible:outline-brand',
	{
		defaultVariants: {
			variant: 'default',
		},
		variants: {
			variant: {
				brand: 'text-brand',
				default: 'text-foreground',
				muted: 'text-foreground-muted',
			},
		},
	},
)

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
		const destination = {
			[to ? 'to' : 'href']: to ?? href,
		}
		const isExternal = (destination.to || destination.href || '').startsWith('http')
		const location = {
			...destination,
			...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {}),
		}

		const LinkComponent = isExternal || !to ? 'a' : RouterLink

		return (
			// @ts-expect-error: TODO: fix this naive type error
			<LinkComponent
				className={cn(
					linkVariants({ className, variant }),
					underline && 'underline underline-offset-2',
					underline === false && 'no-underline hover:no-underline',
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
