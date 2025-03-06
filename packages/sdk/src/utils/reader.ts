export type ImageBasedBookPageRef = {
	height: number
	width: number
	ratio: number
}

export type GeneratePageSetsParams = {
	imageSizes: Record<number, ImageBasedBookPageRef>
	pages: number
}

export const generatePageSets = ({ imageSizes, pages }: GeneratePageSetsParams): number[][] => {
	const sets: number[][] = []

	const landscapePages = Object.keys(imageSizes).reduce(
		(acc, key) => {
			const idx = parseInt(key)
			if (isNaN(idx)) return acc
			if (!imageSizes[idx]) return acc
			acc[idx] = imageSizes[idx].ratio >= 1
			return acc
		},
		{} as Record<number, boolean>,
	)

	// If a page is landscape, we only ever want to show it by itself
	// If a page is portrait, we will only show it by itself if the next page is also portrait

	let currentSet: number[] = []
	for (let i = 0; i < pages; i++) {
		const isLandscape = landscapePages[i]
		const isLast = i === pages - 1

		if (isLandscape || i === 0) {
			currentSet.push(i)
			sets.push(currentSet)
			currentSet = []
		} else {
			currentSet.push(i)
			if (isLast) {
				sets.push(currentSet)
			}
		}

		// If the next page is landscape, we want to start a new set
		if (landscapePages[i + 1]) {
			sets.push(currentSet)
			currentSet = []
		}

		// If we have a set of two, we want to push it and reset the current set
		if (currentSet.length === 2) {
			sets.push(currentSet)
			currentSet = []
		}
	}

	return sets
}
