import { IconButton, Input, Text, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Props = {
	pages: number
	currentPage: number
	onChangePage: (page: number) => void
	onPrefetchPage?: (page: number) => void
}

export default function URLPagination({ pages, currentPage, onChangePage, onPrefetchPage }: Props) {
	const [inputPage, setInputPage] = useState<number | undefined>(currentPage)

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

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const parsed = parseInt(e.target.value)
		setInputPage(isNaN(parsed) ? undefined : parsed)
	}

	const handleInputBlur = useCallback(() => {
		if (inputPage === undefined || inputPage < 1 || inputPage > pages) {
			setInputPage(currentPage)
		}
	}, [inputPage, currentPage, pages])

	const handleInputSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			if (inputPage !== undefined && inputPage > 0 && inputPage <= pages) {
				onChangePage(inputPage)
			}
		},
		[inputPage, onChangePage, pages],
	)

	useEffect(() => {
		setInputPage(currentPage)
	}, [currentPage])

	return (
		<div className="flex items-center space-x-4">
			<form className="flex shrink-0 items-center space-x-2" onSubmit={handleInputSubmit}>
				<Input
					type="number"
					variant="activeGhost"
					size="sm"
					className="h-7 w-7 p-0 text-center text-xs [appearance:textfield] sm:h-6 sm:w-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					disabled={pages <= 1}
					value={inputPage ?? ''}
					onChange={handleInputChange}
					onBlur={handleInputBlur}
					max={pages}
					min={1}
				/>
				<Text size="sm" variant="muted" className="inline-flex shrink-0">
					of {pages}
				</Text>
			</form>
			<div className="flex items-center space-x-1">
				<ToolTip content="Previous page" size="sm" align="end">
					<IconButton
						size="xs"
						variant="ghost"
						disabled={currentPage <= 1}
						onClick={handlePreviousPage}
						onMouseEnter={handlePrefetchPreviousPage}
					>
						<ChevronLeft className="h-4 w-4" />
					</IconButton>
				</ToolTip>

				<ToolTip content="Next page" size="sm" align="end">
					<IconButton
						size="xs"
						variant="ghost"
						disabled={currentPage >= pages}
						onClick={handleNextPage}
						onMouseEnter={handlePrefetchNextPage}
					>
						<ChevronRight className="h-4 w-4" />
					</IconButton>
				</ToolTip>
			</div>
		</div>
	)
}
