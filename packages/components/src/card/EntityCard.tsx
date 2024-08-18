/* eslint-disable react/prop-types */

import { Book } from 'lucide-react'
import React, { useState } from 'react'
import { Link, To } from 'react-router-dom'

import { ProgressBar } from '../progress'
import { Text } from '../text'
import { cn } from '../utils'

type ContainerProps = React.ComponentPropsWithoutRef<'div'> & {
	to?: To
}
type Props = {
	/**
	 * The title of the entity, displayed directly below the image. If the title is a string,
	 * it will be truncated to 2 lines.
	 */
	title?: string | React.ReactNode
	/**
	 * The subtitle of the entity, displayed directly below the title. If the title is a string,
	 * this will appear offset by the equivalent of 2 lines of text.
	 */
	subtitle?: string | React.ReactNode
	/**
	 * The URL of the image to display. If the image fails to load, a placeholder will be displayed
	 */
	imageUrl: string
	/**
	 * An optional URL to link to when the card is clicked. If not provided, the card will not have hover effects unless
	 * an `onClick` or `onDoubleClick` handler is provided.
	 */
	href?: string
	/**
	 * An optional progress value to display at the bottom of the image. If provided, a progress bar will be displayed
	 */
	progress?: number | null
	/**
	 * Whether the card should be full width or not. Defaults to `true`. If `false`, the card will be sized explicitly.
	 */
	fullWidth?: boolean | ((imageLoadFailed: boolean) => boolean)
	/**
	 * Whether the card is a cover variant. If `true`, the card will be sized explicitly to the cover size.
	 */
	isCover?: boolean
} & ContainerProps

/**
 * A card that displays a Stump entity, namely a book, series, or library. The card will display an image, title, subtitle,
 * and progress bar. All of these are optional, except for the image URL. If the image fails to load, a placeholder will be
 * displayed instead.
 */
export function EntityCard({
	href,
	imageUrl,
	title,
	subtitle,
	progress,
	fullWidth = true,
	className,
	isCover,
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
	} as React.ComponentPropsWithoutRef<'div'> & React.ComponentPropsWithoutRef<typeof Link>

	const hasClickAction = !!href || !!containerProps.onClick || !!containerProps.onDoubleClick

	const isFullWidth = typeof fullWidth === 'function' ? fullWidth(isImageFailed) : fullWidth

	/**
	 * Renders the title of the card. If the title is a string, it will be truncated to 2 lines
	 *
	 * Note: 40px is the height of 2 lines of text at the small size
	 */
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

	/**
	 * Renders the progress bar at the bottom of the card image if a progress value is provided. The negative margin
	 * is to offset the progress bar from the bottom of the image
	 */
	const renderProgress = () => {
		if (progress != null) {
			return <ProgressBar value={progress} variant="primary-dark" size="sm" className="!-mt-1" />
		}

		return null
	}

	/**
	 * Renders the footer of the card, which contains the title and subtitle. If the title is a string, it will be
	 * truncated to 2 lines
	 */
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

	/**
	 * Renders the image of the card. If the image fails to load, a placeholder will be displayed instead
	 */
	const renderImage = () => {
		if (!isImageFailed) {
			return (
				<img
					src={imageUrl}
					className={cn('h-full w-full object-cover')}
					onError={() => setIsImageFailed(true)}
				/>
			)
		} else {
			return (
				<div className="flex h-full w-full items-center justify-center bg-sidebar">
					<Book className="h-16 w-16 text-foreground-muted" />
				</div>
			)
		}
	}

	return (
		<Container
			{...containerProps}
			className={cn(
				'relative flex flex-1 flex-col space-y-1 overflow-hidden rounded-lg border-[1.5px] border-edge bg-background/80 shadow-sm transition-colors duration-100',
				{ 'cursor-pointer hover:border-brand dark:hover:border-brand': hasClickAction },
				{ 'max-w-[16rem]': isCover },
				{
					'w-[10rem] sm:w-[10.666rem] md:w-[12rem]': !isFullWidth,
				},
				className,
			)}
		>
			<div
				className={cn('aspect-[2/3] h-full w-full p-0', {
					'w-[10rem] sm:w-[10.666rem] md:w-[12rem]': !isFullWidth,
				})}
			>
				{renderImage()}
			</div>
			{renderProgress()}
			{renderFooter()}
		</Container>
	)
}

/**
 * A scuffed wrapper around a `div` used in the `EntityCard` component to conditionally render a `Link` or `div` as
 * the container element
 */
const Div = (props: React.ComponentPropsWithoutRef<'div'>) => <div {...props} />
