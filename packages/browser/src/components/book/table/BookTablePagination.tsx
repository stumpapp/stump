import { IconButton, Text } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useCallback } from 'react'

type Props = {
	pages: number
	currentPage: number
	onChangePage: (page: number) => void
	onPrefetchPage?: (page: number) => void
}

export default function BookTablePagination({
	pages,
	currentPage,
	onChangePage,
	onPrefetchPage,
}: Props) {
	const handleNextPage = useCallback(() => {
		if (currentPage < pages) {
			onChangePage(currentPage + 1)
		}
	}, [currentPage, onChangePage, pages])

	const handlePrefetchNextPage = useCallback(() => {
		if (currentPage < pages) {
			onPrefetchPage?.(currentPage + 1)
		}
	}, [currentPage, onPrefetchPage, pages])

	const handlePreviousPage = useCallback(() => {
		if (currentPage > 1) {
			onChangePage(currentPage - 1)
		}
	}, [currentPage, onChangePage])

	const handlePrefetchPreviousPage = useCallback(() => {
		if (currentPage > 1) {
			onPrefetchPage?.(currentPage - 1)
		}
	}, [currentPage, onPrefetchPage])

	return (
		<div className="flex items-center space-x-4">
			{/* TODO: page selector */}
			<div>
				<Text size="sm" variant="muted">
					{currentPage} of {pages}
				</Text>
			</div>
			<div className="flex items-center space-x-1">
				<IconButton
					size="xs"
					variant="ghost"
					disabled={currentPage <= 1}
					onClick={handlePreviousPage}
					onMouseEnter={handlePrefetchPreviousPage}
				>
					<ChevronLeft className="h-4 w-4" />
				</IconButton>
				<IconButton
					size="xs"
					variant="ghost"
					disabled={currentPage >= pages}
					onClick={handleNextPage}
					onMouseEnter={handlePrefetchNextPage}
				>
					<ChevronRight className="h-4 w-4" />
				</IconButton>
			</div>
		</div>
	)
}
