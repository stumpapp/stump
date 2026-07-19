export type ImageBasedBookPageRef = {
	height: number
	width: number
	ratio: number
}

export type PageSetIndexes = [number, number] | [number]

export type GeneratePageSetsParams = {
	imageSizes: Record<number, ImageBasedBookPageRef>
	pages: number
	secondPageSeparate?: boolean
}

export const generatePageSets = ({
	imageSizes,
	pages,
	secondPageSeparate = false,
}: GeneratePageSetsParams): PageSetIndexes[] => {
	if (Object.keys(imageSizes).length === 0) {
		return Array.from({ length: pages }, (_, i) => [i])
	}

	const landscapePages = Object.entries(imageSizes).reduce(
		(acc, [key, dimensions]) => {
			const idx = parseInt(key)
			if (isNaN(idx)) return acc

			const { width, height, ratio } = dimensions

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

			acc[idx] = ratio >= 1
			return acc
		},
		{} as Record<number, boolean>,
	)

	const pageSets: PageSetIndexes[] = []
	let i = 0
	while (i < pages) {
		const isFirst = i === 0
		const separateSecond = i === 1 && secondPageSeparate
		const isLandscape = landscapePages[i]
		const isLast = i === pages - 1
		// these next two conditions are because: if we are looking to pair page `i` with the next page `i+1`
		// but the next page is separate, the current page has nothing to pair with, thus has to be separate too
		const nextIsLandscape = landscapePages[i + 1]
		const nextIsLast = i + 1 === pages - 1

		const keepPageSeparate =
			isFirst || separateSecond || isLandscape || isLast || nextIsLandscape || nextIsLast

		if (keepPageSeparate) {
			pageSets.push([i])
			i++
		} else {
			pageSets.push([i, i + 1])
			i += 2
		}
	}

	return pageSets
}
