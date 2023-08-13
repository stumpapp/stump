import { Button, IconButton } from '@stump/components'
import { ArrowLeft, ArrowRight, DotsThree } from 'phosphor-react'
import { useMemo } from 'react'
import { useWindowSize } from 'rooks'

import { usePagination } from '../../hooks/usePagination'
import PagePopoverForm from '../PagePopoverForm'
import { PaginationProps } from '../Pagination'

type TablePaginationProps = Omit<PaginationProps, 'position'> & {
	onPageChange: (page: number) => void
}

export default function TablePagination({
	pages,
	currentPage,
	onPageChange,
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
			<Button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
				<ArrowLeft />
			</Button>

			{pageRange.map((page, i) => {
				if (typeof page === 'number') {
					return (
						<PaginationNumber
							key={`${i}, pagination-${page}`}
							active={page === currentPage}
							onClick={() => onPageChange(page)}
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
						onPageChange={onPageChange}
						trigger={
							<Button>
								<DotsThree />
							</Button>
						}
					/>
				)
			})}

			<Button disabled={currentPage >= pages} onClick={() => onPageChange(currentPage + 1)}>
				<ArrowRight />
			</Button>
		</div>
	)
}

interface PaginationNumberProps {
	page: number
	active: boolean
	onClick: () => void
}

// TODO: style
function PaginationNumber({ onClick, page }: PaginationNumberProps) {
	return (
		<IconButton size="xs" onClick={onClick} variant="ghost">
			{page}
		</IconButton>
	)
}
