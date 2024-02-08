import { Button, cn, IconButton } from '@stump/components'
import { ArrowLeft, ArrowRight, DotsThree } from 'phosphor-react'
import { useMemo } from 'react'
import { useWindowSize } from 'rooks'

import { usePagination } from '@/hooks/usePagination'

import PagePopoverForm from '../PagePopoverForm'
import { PaginationProps } from '../Pagination'

type TablePaginationProps = Omit<PaginationProps, 'position'>

export default function TablePagination({
	pages,
	currentPage,
	onChangePage,
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

	return (
		<div className="flex items-center gap-1">
			<IconButton disabled={currentPage <= 1} onClick={() => onChangePage(currentPage - 1)}>
				<ArrowLeft />
			</IconButton>

			{pageRange.map((page, i) => {
				if (typeof page === 'number') {
					return (
						<PaginationNumber
							key={`${i}, pagination-${page}`}
							isActive={page === currentPage}
							onClick={() => onChangePage(page)}
							page={page}
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
							<Button>
								<DotsThree />
							</Button>
						}
					/>
				)
			})}

			<IconButton disabled={currentPage >= pages} onClick={() => onChangePage(currentPage + 1)}>
				<ArrowRight />
			</IconButton>
		</div>
	)
}

interface PaginationNumberProps {
	page: number
	isActive: boolean
	onClick: () => void
}

// TODO: style
function PaginationNumber({ onClick, page, isActive }: PaginationNumberProps) {
	return (
		<IconButton
			size="xs"
			onClick={onClick}
			variant="ghost"
			className={cn('h-5 w-5', isActive ? '!text-brand' : '')}
		>
			{page}
		</IconButton>
	)
}
