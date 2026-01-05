import { useSDK } from '@stump/client'
import { cn } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { AuthImage } from '../entity/AuthImage'
import { ThumbnailPlaceholder, ThumbnailPlaceholderData } from './ThumbnailPlaceholder'

export type ThumbnailImageSize = {
	height: number | string
	width: number | string
}

export type ThumbnailGradient = {
	colors: string[]
	/**
	 * CSS gradient direction (e.g., 'to bottom', '180deg')
	 */
	direction?: string
}

export type BorderAndShadowStyle = {
	borderRadius?: number | string
	borderWidth?: number
	shadowRadius?: number
	shadowColor?: string
	shadowOffsetX?: number
	shadowOffsetY?: number
}

export type ThumbnailImageProps = {
	src: string
	alt?: string
	size?: ThumbnailImageSize
	gradient?: ThumbnailGradient
	placeholderData?: ThumbnailPlaceholderData | null
	/**
	 * Override the default border and shadow style
	 */
	borderAndShadowStyle?: Partial<BorderAndShadowStyle>
	className?: string
	imageClassName?: string
	/**
	 * Whether to lazy load the image, which should help with perf
	 */
	lazy?: boolean
	onLoad?: () => void
	onError?: () => void
}

export const ThumbnailImage = forwardRef<HTMLDivElement, ThumbnailImageProps>(
	(
		{
			src,
			alt = '',
			size,
			gradient,
			placeholderData,
			borderAndShadowStyle,
			className,
			imageClassName,
			lazy = false,
			onLoad,
			onError,
		},
		ref,
	) => {
		const { sdk } = useSDK()

		const [isLoaded, setIsLoaded] = useState(false)
		const [hasError, setHasError] = useState(false)

		const imageRef = useRef<HTMLImageElement | null>(null)

		// Note: I added this because the placeholder was ALWAYS flashing on initial load,
		// so this should help prevent that
		useLayoutEffect(() => {
			if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
				setIsLoaded(true)
			}
		}, [src])

		// https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
		useEffect(() => {
			const handleVisibilityChange = () => {
				if (document.visibilityState === 'visible' && imageRef.current) {
					const img = imageRef.current
					// Note: Apparently naturalWidth is 0 if returning after tab was suspended
					if (isLoaded && (!img.complete || img.naturalWidth === 0)) {
						setIsLoaded(false)
					}
				}
			}

			document.addEventListener('visibilitychange', handleVisibilityChange)
			return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
		}, [isLoaded])

		const computedStyles = useMemo(() => {
			const widthNum = typeof size?.width === 'number' ? size.width : 192
			return {
				borderRadius: borderAndShadowStyle?.borderRadius ?? widthNum / 20,
				borderWidth: borderAndShadowStyle?.borderWidth ?? Math.max(0.3, widthNum / 500),
				shadowRadius: borderAndShadowStyle?.shadowRadius ?? widthNum / 100,
				shadowColor: borderAndShadowStyle?.shadowColor ?? 'rgba(0,0,0,0.2)',
				shadowOffsetX: borderAndShadowStyle?.shadowOffsetX ?? 0,
				shadowOffsetY: borderAndShadowStyle?.shadowOffsetY ?? 1,
			}
		}, [size?.width, borderAndShadowStyle])

		const containerStyle = useMemo(
			() => ({
				width: size?.width,
				height: size?.height,
				borderRadius: computedStyles.borderRadius,
				boxShadow: `${computedStyles.shadowOffsetX}px ${computedStyles.shadowOffsetY}px ${computedStyles.shadowRadius}px ${computedStyles.shadowColor}`,
			}),
			[size, computedStyles],
		)

		const borderStyle = useMemo(
			() => ({
				borderRadius: computedStyles.borderRadius,
				borderWidth: computedStyles.borderWidth,
			}),
			[computedStyles],
		)

		const gradientStyle = useMemo(() => {
			if (!gradient?.colors || gradient.colors.length === 0) {
				return null
			}
			const direction = gradient.direction ?? 'to bottom'
			return {
				background: `linear-gradient(${direction}, ${gradient.colors.join(', ')})`,
				borderRadius: computedStyles.borderRadius,
			}
		}, [gradient, computedStyles.borderRadius])

		const handleLoad = () => {
			setIsLoaded(true)
			onLoad?.()
		}

		const handleError = () => {
			setHasError(true)
			onError?.()
		}

		const imageClasses = cn('absolute inset-0 z-[15] h-full w-full object-cover', imageClassName)

		const imageStyle = { borderRadius: computedStyles.borderRadius }

		// Lazy loading attributes for improved scroll performance
		const lazyProps = lazy
			? { loading: 'lazy' as const, decoding: 'async' as const }
			: { decoding: 'async' as const }

		const renderImage = () => {
			if (sdk.isTokenAuth) {
				return (
					<AuthImage
						ref={imageRef}
						src={src}
						token={sdk.token || ''}
						alt={alt}
						className={imageClasses}
						style={imageStyle}
						onLoad={handleLoad}
						onError={handleError}
						{...lazyProps}
					/>
				)
			}

			return (
				<img
					ref={imageRef}
					src={src}
					alt={alt}
					className={imageClasses}
					style={imageStyle}
					onLoad={handleLoad}
					onError={handleError}
					{...lazyProps}
				/>
			)
		}

		return (
			<div ref={ref} className={cn('relative overflow-hidden', className)} style={containerStyle}>
				<ThumbnailPlaceholder {...placeholderData} className="rounded-[inherit]" />

				<AnimatePresence>
					{!hasError && (
						<motion.div
							key={src}
							initial={{ opacity: 0 }}
							animate={{ opacity: isLoaded ? 1 : 0 }}
							transition={{ duration: 0.3, ease: 'easeOut' }}
							// @ts-expect-error: It has className
							className="absolute inset-0 z-[15]"
						>
							{renderImage()}
						</motion.div>
					)}
				</AnimatePresence>

				{gradientStyle && <div className="absolute inset-0 z-20" style={gradientStyle} />}

				<div
					className="pointer-events-none absolute inset-0 z-[25] border-thumbnail-border"
					style={{
						...borderStyle,
						borderStyle: 'solid',
					}}
				/>
			</div>
		)
	},
)

ThumbnailImage.displayName = 'ThumbnailImage'
