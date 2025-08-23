import { BookImageScaling } from '@stump/client'
import { cn } from '@stump/components'
import { ReadingImageScaleFit } from '@stump/graphql'
import React, { forwardRef, useCallback, useMemo } from 'react'

import { EntityImage } from '@/components/entity'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { ImagePageDimensionRef, useImageBaseReaderContext } from '../context'

type Props = {
	currentPage: number
	getPageUrl: (page: number) => string
	onPageClick: () => void
}

const PageSet = forwardRef<HTMLDivElement, Props>(
	({ currentPage, getPageUrl, onPageClick }, ref) => {
		const { setPageSize, book, pageSets } = useImageBaseReaderContext()
		const {
			bookPreferences: { imageScaling, brightness },
		} = useBookPreferences({ book })

		/**
		 * A memoized callback to set the dimensions of a given page
		 */
		const upsertDimensions = useCallback(
			(page: number, dimensions: ImagePageDimensionRef) => {
				setPageSize(page - 1, dimensions)
			},
			[setPageSize],
		)

		const currentSet = useMemo(
			() => pageSets.find((set) => set.includes(currentPage - 1)) || [currentPage - 1],
			[currentPage, pageSets],
		)

		return (
			<div
				ref={ref}
				className="flex h-full shrink-0 justify-center"
				style={{
					filter: `brightness(${brightness * 100}%)`,
				}}
			>
				<div
					className={cn('relative flex justify-center', {
						'mx-auto flex-row gap-0': currentSet.length > 1,
					})}
				>
					{currentSet.map((idx) => (
						<Page
							key={`page-${idx + 1}`}
							page={idx + 1}
							getPageUrl={getPageUrl}
							onPageClick={onPageClick}
							upsertDimensions={upsertDimensions}
							imageScaling={imageScaling}
						/>
					))}
				</div>
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

// TODO(readers): consider exporting/relocating and sharing with the continuous reader(s)
const _Page = ({
	page,
	getPageUrl,
	onPageClick,
	upsertDimensions,
	imageScaling: { scaleToFit },
}: PageProps) => {
	return (
		<EntityImage
			key={`page-${page}-scaled-${scaleToFit}`}
			className={cn(
				'z-30 select-none',
				{
					'mx-auto my-0 w-auto self-center': scaleToFit === ReadingImageScaleFit.None,
				},
				{
					'm-auto h-full max-h-screen w-auto object-cover':
						scaleToFit === ReadingImageScaleFit.Height,
				},
				{
					'mx-auto my-0 w-full object-contain': scaleToFit === ReadingImageScaleFit.Width,
				},
			)}
			src={getPageUrl(page)}
			onLoad={({ height, width }) => {
				upsertDimensions(page, {
					height,
					width,
					ratio: width / height,
				})
			}}
			onError={(err) => {
				// @ts-expect-error: is oke
				err.target.src = '/favicon.png'
			}}
			onClick={onPageClick}
		/>
	)
}
const Page = React.memo(_Page)
