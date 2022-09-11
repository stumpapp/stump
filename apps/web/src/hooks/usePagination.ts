import React, { useMemo } from 'react';

interface UsePaginationOptions {
	totalPages: number;
	currentPage: number;
	numbersToShow?: number;
}

export function usePagination({
	totalPages,
	currentPage,
	numbersToShow = 7,
}: UsePaginationOptions) {
	function getRange(start: number, end: number) {
		let length = end - start + 1;
		return Array.from({ length }, (_, i) => i + start);
	}

	const pageRange = useMemo(() => {
		const start = Math.max(
			1,
			Math.min(currentPage - Math.floor((numbersToShow - 3) / 2), totalPages - numbersToShow + 2),
		);

		const end = Math.min(
			totalPages,
			Math.max(currentPage + Math.floor((numbersToShow - 2) / 2), numbersToShow - 1),
		);

		return [
			...(start > 2 ? [1, '...'] : start > 1 ? [1] : []),
			...getRange(start, end),
			...(end < totalPages - 1 ? ['...', totalPages] : end < totalPages ? [totalPages] : []),
		];
	}, [numbersToShow, totalPages, currentPage]);

	return { pageRange };
}
