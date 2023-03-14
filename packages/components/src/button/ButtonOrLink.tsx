import React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '../utils'
import { Button, ButtonProps, buttonVariants } from './Button'

type BaseProps = React.ComponentProps<'button'> & React.ComponentProps<'a'>
export type ButtonOrLinkProps = ButtonProps & BaseProps

export function ButtonOrLink({
	className,
	variant,
	size,
	rounded,
	pressEffect = false,
	...props
}: ButtonOrLinkProps) {
	const isLink = typeof props.href !== 'undefined'
	const isExternal = isLink && props.href!.startsWith('http')

	const Component = isLink ? (isExternal ? 'a' : Link) : Button
	const location = isLink
		? {
				[isExternal ? 'href' : 'to']: props.href as string,
		  }
		: {}
	const buttonOnlyProps = isLink
		? {}
		: { className, pressEffect, primaryFocus: true, rounded, size, variant }

	return (
		// @ts-expect-error: these types are not great...
		<Component
			className={
				isLink
					? cn(
							buttonVariants({ className, rounded, size, variant }),
							'focus:ring-brand-400 dark:focus:ring-brand-400',
							className,
					  )
					: undefined
			}
			{...location}
			{...buttonOnlyProps}
			{...props}
		/>
	)
}
