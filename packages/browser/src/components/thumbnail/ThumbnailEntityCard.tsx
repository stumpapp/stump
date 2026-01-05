import { cn, ProgressBar, Text } from '@stump/components'
import { Book } from 'lucide-react'
import { type ComponentPropsWithoutRef, useState } from 'react'
import { To } from 'react-router-dom'

import { Link } from '@/context'
import { usePreferences } from '@/hooks/usePreferences'

import { getDensityTextSize, useGridSizeStore } from '../container/useGridSize'
import { ThumbnailGradient, ThumbnailImage, ThumbnailImageProps } from './ThumbnailImage'
import { ThumbnailPlaceholderData } from './ThumbnailPlaceholder'

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
	to?: To
}

type Props = {
	title?: string | React.ReactNode
	subtitle?: string | React.ReactNode
	imageUrl: string
	href?: string
	progress?: number | null
	fullWidth?: boolean | ((imageLoadFailed: boolean) => boolean)
	isCover?: boolean
	placeholderData?: ThumbnailPlaceholderData | null
	gradient?: ThumbnailGradient
	borderAndShadowStyle?: ThumbnailImageProps['borderAndShadowStyle']
} & ContainerProps

/**
 * A scuffed wrapper around a `div` used in the `EntityCard` component to conditionally render a `Link` or `div` as
 * the container element
 */
const Div = (props: ComponentPropsWithoutRef<'div'>) => <div {...props} />

// TODO(thumbs): Kill the original EntityCard and replace with this if I go this route

export function ThumbnailEntityCard({
	href,
	imageUrl,
	title,
	subtitle,
	progress,
	fullWidth = true,
	className,
	isCover,
	placeholderData,
	gradient,
	borderAndShadowStyle,
	...props
}: Props) {
	const [hasError, setHasError] = useState(false)
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

	const isFullWidth = typeof fullWidth === 'function' ? fullWidth(hasError) : fullWidth

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
					className="line-clamp-2 h-[40px] min-w-0 whitespace-normal"
				>
					{title}
				</Text>
			)
		}

		return title
	}

	/**
	 * Renders the progress bar at the bottom of the card image if a progress value is provided.
	 */
	const renderProgress = () => {
		if (progress != null) {
			return (
				<ProgressBar
					value={progress}
					max={100}
					variant="primary-dark"
					size="sm"
					className="!-mt-1"
					rounded="none"
				/>
			)
		}

		return null
	}

	/**
	 * Renders the footer of the card, which contains the title and subtitle.
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
	 * Renders the image of the card using ThumbnailImage.
	 */
	const renderImage = () => {
		if (hasError) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-sidebar">
					<Book className="absolute h-16 w-16 text-foreground-muted" />
				</div>
			)
		}

		return (
			<ThumbnailImage
				src={imageUrl}
				alt={typeof title === 'string' ? title : undefined}
				placeholderData={placeholderData}
				gradient={gradient}
				borderAndShadowStyle={{
					borderRadius: 0,
					borderWidth: 0,
					shadowRadius: 0,
					...borderAndShadowStyle,
				}}
				className="h-full w-full"
				imageClassName="rounded-none"
				onError={() => setHasError(true)}
			/>
		)
	}

	return (
		<Container
			{...containerProps}
			className={cn(
				'relative flex flex-1 flex-col space-y-1 overflow-hidden rounded-lg border-[1.5px] border-edge bg-background/80 transition-colors duration-100',
				{ 'cursor-pointer hover:border-edge-brand dark:hover:border-edge-brand': hasClickAction },
				{ 'max-w-[16rem]': isCover },
				{
					'w-[10rem] sm:w-[10.666rem] md:w-[12rem]': !isFullWidth,
				},
				className,
			)}
		>
			<div
				className={cn('h-full w-full p-0', {
					'w-[10rem] sm:w-[10.666rem] md:w-[12rem]': !isFullWidth,
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
