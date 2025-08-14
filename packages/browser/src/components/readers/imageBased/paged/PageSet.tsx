import { BookImageScaling } from '@stump/client'
import { cn } from '@stump/components'
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
		const { setDimensions, book, pageSets } = useImageBaseReaderContext()
		const {
			bookPreferences: { imageScaling, brightness },
		} = useBookPreferences({ book })

		/**
		 * A memoized callback to set the dimensions of a given page
		 */
		const upsertDimensions = useCallback(
			(page: number, dimensions: ImagePageDimensionRef) => {
				setDimensions((prev) => ({
					...prev,
					[page - 1]: dimensions,
				}))
			},
			[setDimensions],
		)

		const currentSet = useMemo(
			() => pageSets.find((set) => set.includes(currentPage - 1)) || [currentPage - 1],
			[currentPage, pageSets],
		)

		return (
			<div
				ref={ref}
				className="flex h-full justify-center"
				style={{
					filter: `brightness(${brightness * 100}%)`,
					minWidth: imageScaling.scaleToFit === 'width' ? '100%' : '',
				}}
			>
				{currentSet.map((idx, i) => (
					<Page
						key={`page-${idx + 1}`}
						page={idx + 1}
						getPageUrl={getPageUrl}
						onPageClick={onPageClick}
						upsertDimensions={upsertDimensions}
						imageScaling={imageScaling}
						style={{
							// objectPosition helps position pages correctly for 'auto'
							objectPosition: currentSet.length === 2 ? (i === 0 ? 'right' : 'left') : 'center',
						}}
					/>
				))}
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
	style?: React.CSSProperties
}

// TODO(readers): consider exporting/relocating and sharing with the continuous reader(s)
const _Page = ({
	page,
	getPageUrl,
	onPageClick,
	upsertDimensions,
	imageScaling: { scaleToFit },
	style,
}: PageProps) => {
	return (
		<EntityImage
			key={`page-${page}-scaled-${scaleToFit}`}
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
				{
					'm-auto h-full max-h-screen w-full object-contain': scaleToFit === 'auto',
				},
			)}
			style={style}
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
