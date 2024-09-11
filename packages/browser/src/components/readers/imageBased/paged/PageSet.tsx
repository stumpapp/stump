import React, { forwardRef, useCallback } from 'react'

import { ImagePageDimensionRef, useImageBaseReaderContext } from '../context'

type Props = {
	currentPage: number
	displayedPages: number[]
	getPageUrl: (page: number) => string
	onPageClick: () => void
}

const PageSet = forwardRef<HTMLDivElement, Props>(
	({ currentPage, displayedPages, getPageUrl, onPageClick }, ref) => {
		const { pageDimensions, setDimensions } = useImageBaseReaderContext()
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

		const dimensionSet = displayedPages.map((page) => getDimensions(page))

		const shouldDisplayDoubleSpread =
			displayedPages.length > 1 &&
			dimensionSet.every((dimensions) => !dimensions || dimensions.isPortrait)

		const renderSet = () => {
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
					/>
				)
			}
		}

		return (
			<div ref={ref} className="flex h-full justify-center">
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
}

const Page = ({ page, getPageUrl, onPageClick, upsertDimensions }: PageProps) => {
	return (
		<img
			className="z-30 max-h-screen w-full select-none md:w-auto"
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
