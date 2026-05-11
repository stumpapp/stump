type FormatSeriesPositionParams = {
	seriesName?: string | null
	// null = no prefix, undefined = default prefix
	prefix?: string | null
	t: (key: string, args?: Record<string, unknown>) => string
}

// TODO(metadata): Fix this at the core
// this is kinda a bandaid fix for one of the items in https://github.com/stumpapp/stump/issues/885
// a higher fidelity fix would be to correct at core when parsing meta
const decodeHtmlEntities = (str: string): string =>
	str
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")

// TODO(metadata-library): callers of formatSeriesPosition should ideally pass the total count for non-metadata-driven libraries.
// for users who have libraries that are largely filesystem-driven, we can use the total count of books in the series. The reason this
// was changed (for now) to be optional is because of the scenario where:
// - a series has 3 books
// - the number for each book is: 0.5, 1, 2
// - the count would be 3
// - the position data would never be able to reach 3, because the metadata position for final book is 2
// ^ the crux of the problem imo is that for whatever reason metadata providers don't always consider fractional numbers
// when determining the total of a series, which makes sense because wtf does "series has 2.5 books" even mean lol but still
// this isn't ideal but is what it is for now

/**
 * A helper to align how Stump formats book positions in a series.
 *
 * If we have a total provided, we show "{prefix} X of Y"
 * If we don't have a total, we show "{prefix} X in Series"
 *
 * The prefix is there to allow a future where the library type can inform a more semantic
 * prefix specific to the library, e.g. "Volume" or "Issue" or "Book"
 *
 * @param position The position of the book in the series
 * @param totalBooks The total number of books in the series
 */
export const formatSeriesPosition = (
	position: number | null | undefined,
	totalBooks: number | null | undefined,
	{ t, ...params }: FormatSeriesPositionParams,
): string | null => {
	if (position == null) return null

	const showOfY = totalBooks != null && totalBooks > 0 && position <= totalBooks

	const primaryClauseKey = showOfY
		? 'formatSeriesPosition.positionWithTotal'
		: 'formatSeriesPosition.position'

	const primaryClause = t(primaryClauseKey, {
		position,
		total: totalBooks || undefined,
		seriesName: params.seriesName ? decodeHtmlEntities(params.seriesName) : undefined,
	})

	// null = no prefix
	const prefix = params.prefix === null ? undefined : (params.prefix ?? t('common.book') + ' ')

	return prefix ? `${prefix}${primaryClause}` : primaryClause
}
