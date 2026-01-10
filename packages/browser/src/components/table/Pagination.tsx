import { Button, cn } from '@stump/components'
import { ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { useWindowSize } from 'rooks'

import { usePagination } from '@/hooks/usePagination'

import PagePopoverForm from '../PagePopoverForm'
import { PaginationProps } from '../Pagination'

export type TablePaginationProps = Omit<PaginationProps, 'position'>

export default function TablePagination({
	pages,
	currentPage,
	onChangePage,
	onPrefetchPage,
}: TablePaginationProps) {
	const { innerWidth: screenWidth } = useWindowSize()

	const numbersToShow = useMemo(() => {
		if (screenWidth != null) {
			if (screenWidth < 768) {
				return 5
			}

			if (screenWidth < 992) {
				return 7
			}
		}

		return 10
	}, [screenWidth])

	const { pageRange } = usePagination({ currentPage, numbersToShow, totalPages: pages })

	// FIXME: Things get smushed together when there are too many pages
	return (
		<div className="flex items-center gap-1">
			<Button
				size="icon"
				variant="ghost"
				disabled={currentPage <= 1}
				onClick={() => onChangePage(currentPage - 1)}
				onMouseEnter={onPrefetchPage ? () => onPrefetchPage(currentPage - 1) : undefined}
				className="h-5 w-5"
			>
				<ArrowLeft className="h-4 w-4" />
			</Button>

			{pageRange.map((page, i) => {
				if (typeof page === 'number') {
					return (
						<PaginationNumber
							key={`${i}, pagination-${page}`}
							isActive={page === currentPage}
							onClick={() => onChangePage(page)}
							page={page}
							onPrefetch={onPrefetchPage ? () => onPrefetchPage(page) : undefined}
						/>
					)
				}

				return (
					<PagePopoverForm
						currentPage={currentPage}
						pos={i}
						key={`${i}, pagination-${page}`}
						totalPages={pages}
						onPageChange={onChangePage}
						trigger={
							<Button size="icon" className="h-5 w-5">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						}
					/>
				)
			})}

			<Button
				size="icon"
				variant="ghost"
				disabled={currentPage >= pages}
				onClick={() => onChangePage(currentPage + 1)}
				onMouseEnter={onPrefetchPage ? () => onPrefetchPage(currentPage + 1) : undefined}
				className="h-5 w-5"
			>
				<ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	)
}

interface PaginationNumberProps {
	page: number
	isActive: boolean
	onClick: () => void
	onPrefetch?: () => void
}

// TODO: style
function PaginationNumber({ onClick, page, isActive, onPrefetch }: PaginationNumberProps) {
	return (
		<Button
			size="icon"
			onClick={onClick}
			variant="ghost"
			className={cn('h-5 w-5', isActive ? '!text-brand' : '')}
			onMouseEnter={onPrefetch ? onPrefetch : undefined}
		>
			{page}
		</Button>
	)
}
