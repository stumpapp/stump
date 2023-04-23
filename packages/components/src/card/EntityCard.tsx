import { cva, VariantProps } from 'class-variance-authority'
import React, { forwardRef, Fragment } from 'react'
import { Link } from 'react-router-dom'

import { ProgressBar, Text } from '../index'
import { cn, cx } from '../utils'

const entityCardVariants = cva('', {
	defaultVariants: {
		size: 'default',
	},
	variants: {
		size: {
			// md:{h-[22.406rem], w-[12rem]}
			default: 'w-[10rem] sm:w-[10.666rem] md:w-[12rem]',
			lg: 'w-full max-w-[16rem]',
		},
		variant: {},
	},
})

type EntityCardProps = {
	title?: string | React.ReactNode
	subtitle?: string | React.ReactNode
	imageUrl: string
	href?: string
	fullWidth?: boolean
	progress?: number | null
} & VariantProps<typeof entityCardVariants> &
	Omit<React.ComponentPropsWithoutRef<'div'>, 'children'>
export const EntityCard = forwardRef<React.ElementRef<'div'>, EntityCardProps>(
	(
		{
			variant,
			size,
			href,
			imageUrl,
			title,
			subtitle,
			fullWidth = true,
			progress,
			className,
			...props
		},
		ref,
	) => {
		const Container = href ? Link : Fragment
		const containerProps = {
			...(href
				? {
						className: cx({ 'flex w-full': fullWidth }),
						to: href,
				  }
				: {}),
		}

		const renderTitle = () => {
			if (typeof title === 'string') {
				return (
					<Text size="sm" className="line-clamp-2 h-[40px]">
						{title}
					</Text>
				)
			}

			return title
		}

		const renderProgress = () => {
			if (progress) {
				return <ProgressBar value={progress} variant="primary-dark" size="sm" className="!-mt-1" />
			}

			return null
		}

		const renderFooter = () => {
			if (title || subtitle) {
				return (
					<div className="flex flex-1 flex-col space-y-2 px-1.5 pb-1">
						{renderTitle()}
						{subtitle}
					</div>
				)
			}

			return null
		}

		return (
			// @ts-expect-error: naive type oop
			<Container {...containerProps}>
				<div
					ref={ref}
					className={cn(
						'relative flex flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-gray-75 bg-white shadow-sm transition-colors duration-100 dark:border-gray-850 dark:bg-gray-950',
						entityCardVariants({ className, size, variant }),
						{ 'hover:border-brand dark:hover:border-brand': !!href },
						className,
					)}
					{...props}
				>
					<div
						className={cx('relative aspect-[2/3] bg-cover bg-center p-0', {
							'min-h-96 w-full': size === 'lg',
						})}
						style={{
							backgroundImage: `url('${imageUrl}')`,
						}}
					/>
					{renderProgress()}
					{renderFooter()}
				</div>
			</Container>
		)
	},
)
EntityCard.displayName = 'EntityCard'
