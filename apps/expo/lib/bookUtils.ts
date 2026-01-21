type FormatSeriesPositionParams = {
	seriesName?: string | null
	prefix?: string
}

/**
 * A helper to align how Stump formats book positions in a series.
 *
 * If fractional, shows "Book X in series"
 * If integer, shows "Book X of Y"
 *
 * @param position The position of the book in the series
 * @param totalBooks The total number of books in the series
 */
export const formatSeriesPosition = (
	position: number | null | undefined,
	totalBooks: number,
	params?: FormatSeriesPositionParams,
): string | null => {
	if (position == null) return null
	const isFractional = !Number.isInteger(position)
	const showOfY = !isFractional && position <= totalBooks

	const primaryClause = showOfY ? `${position} of ${totalBooks}` : `${position}`

	const withPrefix = params?.prefix ? `${params.prefix} ${primaryClause}` : primaryClause

	if (params?.seriesName) {
		return `${withPrefix} in ${params.seriesName}`
	} else if (!showOfY) {
		return `${withPrefix} in series`
	}

	return withPrefix
}
