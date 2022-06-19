import React from 'react';
import { useMemo } from 'react';

interface UsePaginationOptions {
	totalPages: number;
	pageSize: number;
	currentPage: number;
}

export function usePagination({ totalPages, pageSize, currentPage }: UsePaginationOptions) {
	function getRange(start: number, end: number) {
		let length = end - start + 1;
		return Array.from({ length }, (_, i) => i + start);
	}

	const pageRange = useMemo(() => {
		let numbersToShow = 7;

		const start = Math.max(
			1,
			Math.min(currentPage - Math.floor((numbersToShow - 3) / 2), totalPages - numbersToShow + 2),
		);

		const end = Math.min(
			totalPages,
			Math.max(currentPage + Math.floor((numbersToShow - 2) / 2), numbersToShow - 1),
		);

		console.log({ start, end });

		return [
			...(start > 2 ? [1, '...'] : start > 1 ? [1] : []),
			...getRange(start, end),
			...(end < totalPages - 1 ? ['...', totalPages] : end < totalPages ? [totalPages] : []),
		];
	}, []);

	return { pageRange };

	// const paginationRange = useMemo(() => {
	// 		// Pages count is determined as siblingCount + firstPage + lastPage + currentPage + 2*DOTS
	// 		const totalPageNumbers = siblingCount + 5;

	// 		/*
	//       If the number of pages is less than the page numbers we want to show in our
	//       paginationComponent, we return the range [1..totalPageCount]
	//     */
	// 		if (totalPageNumbers >= totalPageCount) {
	// 			return range(1, totalPageCount);
	// 		}

	// 		const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
	// 		const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPageCount);

	// 		/*
	//       We do not want to show dots if there is only one position left
	//       after/before the left/right page count as that would lead to a change if our Pagination
	//       component size which we do not want
	//     */
	// 		const shouldShowLeftDots = leftSiblingIndex > 2;
	// 		const shouldShowRightDots = rightSiblingIndex < totalPageCount - 2;

	// 		const firstPageIndex = 1;
	// 		const lastPageIndex = totalPageCount;

	// 		if (!shouldShowLeftDots && shouldShowRightDots) {
	// 			let leftItemCount = 3 + 2 * siblingCount;
	// 			let leftRange = range(1, leftItemCount);

	// 			return [...leftRange, DOTS, totalPageCount];
	// 		}

	// 		if (shouldShowLeftDots && !shouldShowRightDots) {
	// 			let rightItemCount = 3 + 2 * siblingCount;
	// 			let rightRange = range(totalPageCount - rightItemCount + 1, totalPageCount);
	// 			return [firstPageIndex, DOTS, ...rightRange];
	// 		}

	// 		if (shouldShowLeftDots && shouldShowRightDots) {
	// 			let middleRange = range(leftSiblingIndex, rightSiblingIndex);
	// 			return [firstPageIndex, DOTS, ...middleRange, DOTS, lastPageIndex];
	// 		}
	// 	}, [totalCount, pageSize, siblingCount, currentPage]);

	// 	return paginationRange;
}
