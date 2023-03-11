import { VariantProps } from 'class-variance-authority'
import React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '../utils'
import { ButtonProps, buttonVariants } from './Button'

type BaseProps = React.ComponentProps<'button'> &
	React.ComponentProps<'a'> &
	Pick<ButtonProps, 'pressEffect'>
export type ButtonOrLinkProps = VariantProps<typeof buttonVariants> & BaseProps

export function ButtonOrLink({ className, ...props }: ButtonOrLinkProps) {
	const isLink = typeof props.href !== 'undefined'
	const isExternal = isLink && props.href!.startsWith('http')

	const Component = isLink ? (isExternal ? 'a' : Link) : 'button'
	const location = isLink
		? {
				[isExternal ? 'href' : 'to']: props.href as string,
		  }
		: {}

	// @ts-expect-error: these types are not great...
	return <Component {...location} className={cn('cursor-pointer', className)} {...props} />
}
