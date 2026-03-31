import { cn, ProgressBar, Text } from '@stump/components'
import { Book } from 'lucide-react'
import { type ComponentPropsWithoutRef, useState } from 'react'
import { To } from 'react-router-dom'

import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

import { getDensityTextSize, useGridSizeStore } from '../container/useGridSize'
import { EntityImage } from './EntityImage'

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
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
export default function EntityCard({
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
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

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
	} as ComponentPropsWithoutRef<'div'> & ComponentPropsWithoutRef<typeof Link>

	const hasClickAction = !!href || !!containerProps.onClick || !!containerProps.onDoubleClick

	const isFullWidth = typeof fullWidth === 'function' ? fullWidth(isImageFailed) : fullWidth

	const gridDensity = useGridSizeStore((store) => store.density)

	/**
	 * Renders the title of the card. If the title is a string, it will be truncated to 2 lines
	 *
	 * Note: 40px is the height of 2 lines of text at the small size
	 */
	const renderTitle = () => {
		if (typeof title === 'string') {
			return (
				<Text
					size={getDensityTextSize(gridDensity)}
					className="min-w-0 line-clamp-2 h-[40px] whitespace-normal"
				>
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
			return (
				<ProgressBar
					value={progress}
					max={100}
					variant="primary-dark"
					size="sm"
					className="-mt-1!"
					rounded="none"
				/>
			)
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
				<div className="space-y-2 px-1.5 pb-1 flex flex-1 flex-col">
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
				<EntityImage
					src={imageUrl}
					className={cn('h-full w-full object-cover')}
					onError={(e) => {
						console.error('Failed to load image:', e)
						setIsImageFailed(true)
					}}
					data-testid="entity-card-image"
				/>
			)
		} else {
			return (
				<div className="flex h-full w-full items-center justify-center bg-sidebar">
					<Book className="h-16 w-16 absolute text-foreground-muted" />
				</div>
			)
		}
	}

	return (
		<Container
			{...containerProps}
			className={cn(
				'space-y-1 rounded-lg relative flex flex-1 flex-col overflow-hidden border-[1.5px] border-edge bg-background/80 transition-colors duration-100',
				{ 'cursor-pointer hover:border-edge-brand dark:hover:border-edge-brand': hasClickAction },
				{ 'max-w-[16rem]': isCover },
				{
					'w-40 sm:w-[10.666rem] md:w-48': !isFullWidth,
				},
				className,
			)}
		>
			<div
				className={cn('p-0 h-full w-full', {
					'w-40 sm:w-[10.666rem] md:w-48': !isFullWidth,
				})}
				style={{ aspectRatio: thumbnailRatio }}
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
const Div = (props: ComponentPropsWithoutRef<'div'>) => <div {...props} />
