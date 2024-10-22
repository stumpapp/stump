import { Link } from 'react-router-dom'

import { cn } from '../utils'
import { Button, ButtonProps, buttonVariants } from './Button'

type BaseProps = React.ComponentProps<'button'> & React.ComponentProps<'a'> & ButtonProps
export type ButtonOrLinkProps = {
	// TODO: this is a bit of a hack
	forceAnchor?: boolean
} & BaseProps

export function ButtonOrLink({
	className,
	variant,
	size,
	rounded,
	pressEffect = false,
	forceAnchor = false,
	newYork,
	...props
}: ButtonOrLinkProps) {
	const isLink = typeof props.href !== 'undefined'
	const isExternal = isLink && props.href!.startsWith('http')

	const Component = isLink ? (isExternal || forceAnchor ? 'a' : Link) : Button
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
							buttonVariants({ className, newYork, rounded, size, variant }),
							'focus:ring-edge-brand dark:focus:ring-edge-brand',
							{
								'cursor-not-allowed bg-background opacity-50': props.disabled,
							},
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
