import { BookImageScaling } from '@stump/client'
import { cn } from '@stump/components'
import React, { forwardRef, useCallback, useMemo } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { ImagePageDimensionRef, useImageBaseReaderContext } from '../context'

type Props = {
	currentPage: number
	displayedPages: number[]
	getPageUrl: (page: number) => string
	onPageClick: () => void
}

const PageSet = forwardRef<HTMLDivElement, Props>(
	({ currentPage, displayedPages, getPageUrl, onPageClick }, ref) => {
		const { pageDimensions, setDimensions, book } = useImageBaseReaderContext()
		const {
			bookPreferences: { imageScaling, brightness },
		} = useBookPreferences({ book })
		/**
		 * A memoized callback to get the dimensions of a given page
		 */
		const getDimensions = useCallback((page: number) => pageDimensions[page], [pageDimensions])
		/**
		 * A memoized callback to set the dimensions of a given page
		 */
		const upsertDimensions = useCallback(
			(page: number, dimensions: ImagePageDimensionRef) => {
				setDimensions((prev) => ({
					...prev,
					[page]: dimensions,
				}))
			},
			[setDimensions],
		)

		const dimensionSet = useMemo(
			() => displayedPages.map((page) => getDimensions(page)),
			[displayedPages, getDimensions],
		)

		const renderSet = () => {
			const shouldDisplayDoubleSpread =
				displayedPages.length > 1 &&
				dimensionSet.every((dimensions) => !dimensions || dimensions.isPortrait)

			if (shouldDisplayDoubleSpread) {
				return (
					<>
						{displayedPages.map((page) => (
							<Page
								key={page}
								page={page}
								getPageUrl={getPageUrl}
								onPageClick={onPageClick}
								upsertDimensions={upsertDimensions}
								imageScaling={imageScaling}
							/>
						))}
					</>
				)
			} else {
				return (
					<Page
						page={currentPage}
						getPageUrl={getPageUrl}
						onPageClick={onPageClick}
						upsertDimensions={upsertDimensions}
						imageScaling={imageScaling}
					/>
				)
			}
		}

		return (
			<div
				ref={ref}
				className="flex h-full justify-center"
				style={{
					filter: `brightness(${brightness * 100}%)`,
				}}
			>
				{renderSet()}
			</div>
		)
	},
)
PageSet.displayName = 'PageSet'

export default PageSet

type PageProps = Omit<Props, 'displayedPages' | 'currentPage'> & {
	page: number
	upsertDimensions: (page: number, dimensions: ImagePageDimensionRef) => void
	imageScaling: BookImageScaling
}

const Page = ({
	page,
	getPageUrl,
	onPageClick,
	upsertDimensions,
	imageScaling: { scaleToFit },
}: PageProps) => {
	return (
		<img
			className={cn(
				'z-30 select-none',
				{
					'mx-auto my-0 w-auto self-center': scaleToFit === 'none',
				},
				{
					'm-auto h-full max-h-screen w-auto object-cover': scaleToFit === 'height',
				},
				{
					'mx-auto my-0 w-full object-contain': scaleToFit === 'width',
				},
			)}
			src={getPageUrl(page)}
			onLoad={(e) => {
				const img = e.target as HTMLImageElement
				if (img.height && img.width) {
					upsertDimensions(page, {
						height: img.height,
						isPortrait: img.height > img.width,
						width: img.width,
					})
				}
			}}
			onError={(err) => {
				// @ts-expect-error: is oke
				err.target.src = '/favicon.png'
			}}
			onClick={onPageClick}
		/>
	)
}
