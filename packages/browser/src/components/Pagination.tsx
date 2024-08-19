import { cn, cx } from '@stump/components'
import { ArrowLeft, ArrowRight, MoreHorizontal } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useWindowSize } from 'rooks'

import { usePagination } from '../hooks/usePagination'
import PagePopoverForm from './PagePopoverForm'

type PaginationArrowProps = {
	kind: 'previous' | 'next'
	isDisabled?: boolean
	onClick: () => void
	onMouseEnter?: () => void
}

function PaginationArrow({ kind, isDisabled, onClick, onMouseEnter }: PaginationArrowProps) {
	const ArrowIcon = kind === 'previous' ? ArrowLeft : ArrowRight

	// NOTE: notice I am wrapping the link (which will have pointer-events-none when
	// disabled) in a div with cursor-not-allowed. This lets me have the cursor while
	// disabling the link.
	return (
		<div
			className={cx('items-center', kind === 'next' ? 'justify-end text-right' : 'justify-start', {
				'cursor-not-allowed': isDisabled,
			})}
			onMouseEnter={!isDisabled ? onMouseEnter : undefined}
		>
			<button
				onClick={onClick}
				disabled={isDisabled}
				aria-disabled={isDisabled}
				className={cx({ 'pointer-events-none': isDisabled })}
			>
				<div
					className={cx(
						'inline-flex items-center border-t-2 border-transparent pt-4 text-xs font-medium hover:border-edge-subtle md:text-sm',
						!isDisabled && 'text-foreground-subtle',
						isDisabled && 'pointer-events-none cursor-not-allowed text-foreground-muted',
						{ 'pl-0 pr-1': kind === 'previous' },
						{ 'pl-1 pr-0': kind === 'next' },
					)}
				>
					{kind === 'next' && 'Next'}
					<ArrowIcon
						className={cx(
							'h-4 w-4 md:h-5 md:w-5',
							kind === 'previous' ? 'mr-3' : 'ml-3',
							// TODO: dark different color?? idk, doesn't look THAT bad
							isDisabled ? 'text-foreground-muted' : 'text-foreground-subtle',
						)}
						aria-hidden="true"
					/>
					{kind === 'previous' && 'Previous'}
				</div>
			</button>
		</div>
	)
}

type PaginationLinkProps = {
	onClick?: () => void
	value: number
	isActive: boolean
	onMouseEnter?: () => void
}

function PaginationLink({ value, onClick, isActive, onMouseEnter }: PaginationLinkProps) {
	return (
		<span
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			className={cn(
				'inline-flex cursor-pointer items-center border-t-2 px-4 pt-4 text-xs font-medium text-foreground-muted md:text-sm',
				{
					'border-brand text-brand hover:border-brand-600': isActive,
				},
				{
					'border-transparent text-foreground-muted hover:border-edge-subtle': !isActive,
				},
			)}
		>
			{value}
		</span>
	)
}

export type PaginationProps = {
	position?: 'top' | 'bottom'
	pages: number
	currentPage: number
	onChangePage: (page: number) => void
	onPrefetchPage?: (page: number) => void
}

export default function Pagination({
	position = 'top',
	pages,
	currentPage,
	onChangePage,
	onPrefetchPage,
}: PaginationProps) {
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

	const handleEllipsisNavigate = useCallback(
		(page: number) => {
			onPrefetchPage?.(page)
			onChangePage(page)
		},
		[onChangePage, onPrefetchPage],
	)

	const handlePrefetchPage = useCallback((page: number) => onPrefetchPage?.(page), [onPrefetchPage])

	return (
		<nav className="w-full">
			<div
				className={cx('w-full border-t border-edge-subtle', {
					'mt-7': position === 'bottom',
				})}
			>
				<div className="-mt-px flex w-full items-start justify-between gap-2 px-4">
					<PaginationArrow
						kind="previous"
						onClick={() => onChangePage(currentPage - 1)}
						isDisabled={currentPage === 1}
						onMouseEnter={() => handlePrefetchPage(currentPage - 1)}
					/>

					<div className="flex items-center">
						{pageRange.map((page, i) => {
							if (typeof page === 'number') {
								return (
									<PaginationLink
										key={`${i}, pagination-${page}`}
										onClick={() => onChangePage(page)}
										onMouseEnter={() => handlePrefetchPage(page)}
										isActive={page === currentPage}
										value={page}
									/>
								)
							}

							return (
								<PagePopoverForm
									pos={i}
									key={`${i}-pagination-ellipsis`}
									currentPage={currentPage}
									totalPages={pages}
									onPageChange={handleEllipsisNavigate}
									trigger={
										<div className="-mt-1">
											<button className="flex items-center border-t-2 border-transparent px-4 pt-4 text-xs font-medium text-foreground-muted hover:border-edge-subtle focus:outline-none md:text-sm">
												<MoreHorizontal className="h-4 w-4" />
											</button>
										</div>
									}
								/>
							)
						})}
					</div>

					<PaginationArrow
						kind="next"
						onClick={() => onChangePage(currentPage + 1)}
						onMouseEnter={() => handlePrefetchPage(currentPage + 1)}
						isDisabled={currentPage >= pages}
					/>
				</div>
			</div>
		</nav>
	)
}
