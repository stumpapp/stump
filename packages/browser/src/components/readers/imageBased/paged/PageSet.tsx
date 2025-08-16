import { BookImageScaling } from '@stump/client'
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
				style={{
					...styles[imageScaling.scaleToFit].imagesHolder,
					filter: `brightness(${brightness * 100}%)`,
				}}
			>
				{currentSet.map((idx) => (
					<Page
						key={`page-${idx + 1}`}
						page={idx + 1}
						getPageUrl={getPageUrl}
						onPageClick={onPageClick}
						upsertDimensions={upsertDimensions}
						imageScaling={imageScaling}
						style={styles[imageScaling.scaleToFit].image}
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
			className="z-30"
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

/**
 * Styles for the image and page set holder
 */
const styles = {
	auto: {
		imagesHolder: {
			display: 'flex',
			flexDirection: 'row',
			// no width
			height: '100vh',
			justifyContent: 'center',
		} as React.CSSProperties,

		image: {
			minWidth: '0%',
			maxWidth: '100%',
			minHeight: '0%',
			// no width
			maxHeight: '100%',
			height: '100%',
			objectFit: 'contain',
		} as React.CSSProperties,
	},

	height: {
		imagesHolder: {
			display: 'flex',
			flexDirection: 'row',
			// no width
			height: '100vh',
			justifyContent: 'center',
		} as React.CSSProperties,

		image: {
			// no min width
			// no max width
			// no width
			// no min height
			// no max height
			height: '100%',
			objectFit: 'contain',
		} as React.CSSProperties,
	},

	width: {
		imagesHolder: {
			display: 'flex',
			flexDirection: 'row',
			// no height
			width: '100vw',
			justifyContent: 'center',
		} as React.CSSProperties,

		image: {
			minWidth: '0%',
			maxWidth: '100%',
			width: '100%',
			minHeight: '0%',
			maxHeight: '100%',
			// no height
			objectFit: 'contain',
		} as React.CSSProperties,
	},

	none: {
		imagesHolder: {
			display: 'flex',
			flexDirection: 'row',
			// no width
			// no height
			justifyContent: 'center',
			alignItems: 'center', // add vertical alignment
		} as React.CSSProperties,

		image: {
			// no min width
			// no max width
			width: 'max-content',
			// no min height
			// no max height
			height: 'max-content',
			objectFit: 'contain',
		} as React.CSSProperties,
	},
}
