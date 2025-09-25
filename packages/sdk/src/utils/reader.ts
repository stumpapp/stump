export type ImageBasedBookPageRef = {
	height: number
	width: number
	ratio: number
}

export type GeneratePageSetsParams = {
	imageSizes: Record<number, ImageBasedBookPageRef>
	pages: number
	secondPageSeparate?: boolean
}

export const generatePageSets = ({
	imageSizes,
	pages,
	secondPageSeparate = false,
}: GeneratePageSetsParams): number[][] => {
	const sets: number[][] = []

	const landscapePages = Object.keys(imageSizes).reduce(
		(acc, key) => {
			const idx = parseInt(key)
			if (isNaN(idx)) return acc
			if (!imageSizes[idx]) return acc

			const { width, height, ratio } = imageSizes[idx]

			const computedRatio = width / height
			if (computedRatio !== ratio) {
				console.warn(
					`Image size ratio mismatch for page ${idx + 1}: expected ${ratio}, got ${computedRatio}`,
					{
						width,
						height,
					},
				)
			}

			acc[idx] = imageSizes[idx].ratio >= 1
			return acc
		},
		{} as Record<number, boolean>,
	)

	// A user reported that the current implementation can lead to duplicate sets. I've
	// tried really hard to reproduce this, but haven't found a scenario where it
	// happens. To be safe, I've added this visitedSet to ensure we don't add any
	// indexes to a set that has already been added
	const visitedSet = new Set<number>()

	let currentSet: number[] = []
	for (let i = 0; i < pages; i++) {
		if (secondPageSeparate && i === 1) {
			sets.push([1])
			visitedSet.add(1)
			continue
		}
		if (visitedSet.has(i)) {
			continue // Skip already processed pages
		}

		visitedSet.add(i)

		// If a page is landscape, we only ever want to show it by itself
		// If a page is portrait, we will only show it by itself if the next page is also portrait

		const isLandscape = landscapePages[i]
		const isLast = i === pages - 1
		const nextIsLandscape = landscapePages[i + 1]
		const nextIsLast = i + 1 === pages - 1

		if (isLandscape || i === 0) {
			currentSet.push(i)
			sets.push(currentSet)
			currentSet = []
		} else {
			currentSet.push(i)

			// The logic behind the following condition is:
			// 1. The last page is always its own set, so we push the current set when either the current
			//		page is the last page or the next page is last.
			// 2. If the next page is landscape, we also push the current set to ensure that the landscape page
			//		is not included in the current set.
			// 3. If the current set has exactly two pages, we push it because the set is complete
			if (isLast || nextIsLast || nextIsLandscape || currentSet.length === 2) {
				sets.push(currentSet)
				currentSet = []
			}
		}
	}

	return sets.filter((set) => set.length > 0)
}
