/* eslint-disable react/prop-types */
import { cva, VariantProps } from 'class-variance-authority'
import React, { forwardRef, Fragment } from 'react'
import { Link } from 'react-router-dom'

import { Text } from '../index'
import { cn, cx } from '../utils'

const entityCardVariants = cva('', {
	defaultVariants: {
		size: 'default',
	},
	variants: {
		size: {
			// md:{h-[22.406rem], w-[12rem]}
			default: 'w-[10rem] sm:w-[10.666rem] md:w-[12rem]',
		},
		variant: {},
	},
})

type EntityCardProps = {
	title: string | React.ReactNode
	subtitle?: string | React.ReactNode
	imageUrl: string
	href?: string
	fullWidth?: boolean
} & VariantProps<typeof entityCardVariants> &
	Omit<React.ComponentPropsWithoutRef<'div'>, 'children'>
export const EntityCard = forwardRef<React.ElementRef<'div'>, EntityCardProps>(
	(
		{ variant, size, href, imageUrl, title, subtitle, fullWidth = true, className, ...props },
		ref,
	) => {
		const Container = href ? Link : 'div'
		const containerProps = {
			...(href
				? {
						to: href,
				  }
				: {}),
		}

		const renderTitle = () => {
			if (typeof title === 'string') {
				return (
					<Text size="sm" className="line-clamp-2">
						{title}
					</Text>
				)
			}

			return title
		}

		return (
			// @ts-expect-error: naive type oop
			<Container {...containerProps} className={cx({ 'flex w-full': fullWidth })}>
				<div
					ref={ref}
					className={cn(
						'relative flex flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-transparent bg-gray-50/50 shadow dark:bg-gray-950',
						entityCardVariants({ className, size, variant }),
						{ 'hover:border-brand': !!href },

						className,
					)}
					{...props}
				>
					<div
						className="relative aspect-[2/3] bg-cover bg-center p-0"
						style={{
							backgroundImage: `url('${imageUrl}')`,
						}}
					/>

					<div className="flex flex-1 flex-col space-y-1 px-1.5 pb-1">{renderTitle()}</div>
				</div>
			</Container>
		)
	},
)
EntityCard.displayName = 'EntityCard'
