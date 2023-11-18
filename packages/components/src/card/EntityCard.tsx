import { cva, VariantProps } from 'class-variance-authority'
import { Book } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { AspectRatio } from '../image'
import { ProgressBar } from '../progress'
import { Text } from '../text'
import { cn } from '../utils'

const entityCardVariants = cva('', {
	defaultVariants: {
		size: 'default',
	},
	variants: {
		size: {
			default: 'w-[195px] sm:w-[208px] lg:w-[240px]',
			lg: 'w-full max-w-[16rem]',
			sm: 'w-12 h-16',
		},
	},
})

const HEIGHT_CLASSES = {
	default: 'h-[292.5px] sm:h-[312px] lg:h-[360px]',
	lg: 'h-full',
	sm: 'h-[64px]',
}

type ContainerProps = React.ComponentPropsWithoutRef<typeof Link> &
	React.ComponentPropsWithoutRef<'div'>
type Props = {
	title?: string | React.ReactNode
	subtitle?: string | React.ReactNode
	imageUrl: string
	href?: string
	fullWidth?: boolean
	progress?: number | null
} & VariantProps<typeof entityCardVariants> &
	ContainerProps

export function EntityCard({
	size = 'default',
	href,
	imageUrl,
	title,
	subtitle,
	fullWidth = true,
	progress,
	className,
	...props
}: Props) {
	const [isImageFailed, setIsImageFailed] = useState(false)

	const Container = href ? Link : Div
	const containerProps = {
		...(href
			? {
					to: href,
			  }
			: {
					as: 'div',
			  }),
		...props,
	}

	const hasClickAction = !!href || !!containerProps.onClick || !!containerProps.onDoubleClick
	const height = HEIGHT_CLASSES[size || 'default'] ?? HEIGHT_CLASSES.default
	const variantClasses = cn(entityCardVariants({ className, size }), {
		'w-full': fullWidth,
	})

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

	const renderImage = () => {
		if (!isImageFailed) {
			return (
				<img
					src={imageUrl}
					className={cn(height, 'object-cover', variantClasses)}
					onError={() => setIsImageFailed(true)}
				/>
			)
		} else {
			return (
				<div className="flex h-full w-full items-center justify-center rounded-md border border-gray-75 bg-gray-50/80 dark:border-gray-950 dark:bg-gray-1000/30">
					<Book className="h-16 w-16 text-gray-750 dark:text-gray-400" />
				</div>
			)
		}
	}

	return (
		<Container
			{...containerProps}
			className={cn(
				'relative flex flex-1 flex-col space-y-1 overflow-hidden rounded-md border-[1.5px] border-gray-75 bg-white shadow-sm transition-colors duration-100 dark:border-gray-850 dark:bg-gray-950',
				variantClasses,
				{ 'cursor-pointer hover:border-brand dark:hover:border-brand': hasClickAction },
				className,
			)}
		>
			<div className={cn(height, 'p-0', variantClasses)}>
				<AspectRatio ratio={2 / 3}>{renderImage()}</AspectRatio>
			</div>

			{renderProgress()}
			{renderFooter()}
		</Container>
	)
}

const Div = (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />
