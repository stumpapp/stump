type ThumbnailConfig = {
	x: number // fractional horizontal position of the center of the thumbnail within the library card
	y: number // fraction of the thumbnail that is hidden
	scale: number
	zIndex: number
}

type StackConfig = ThumbnailConfig[]

const FIVE_BOOK_LAYOUTS: StackConfig[] = [
	[
		{ x: 0.161, y: 0.019, scale: 0.83, zIndex: 50 },
		{ x: 0.325, y: 0.029, scale: 0.912, zIndex: 40 },
		{ x: 0.507, y: 0.019, scale: 0.874, zIndex: 30 },
		{ x: 0.675, y: 0.02, scale: 0.795, zIndex: 20 },
		{ x: 0.818, y: 0.024, scale: 0.949, zIndex: 10 },
	],
	[
		{ x: 0.174, y: 0.016, scale: 0.895, zIndex: 50 },
		{ x: 0.331, y: 0.017, scale: 0.936, zIndex: 40 },
		{ x: 0.516, y: 0.014, scale: 0.83, zIndex: 30 },
		{ x: 0.668, y: 0.022, scale: 0.87, zIndex: 20 },
		{ x: 0.824, y: 0.011, scale: 0.898, zIndex: 10 },
	],
	[
		{ x: 0.168, y: 0.021, scale: 0.864, zIndex: 50 },
		{ x: 0.36, y: 0.014, scale: 0.807, zIndex: 40 },
		{ x: 0.495, y: 0.013, scale: 0.943, zIndex: 30 },
		{ x: 0.677, y: 0.024, scale: 0.875, zIndex: 20 },
		{ x: 0.821, y: 0.033, scale: 0.932, zIndex: 10 },
	],
	[
		{ x: 0.177, y: 0.021, scale: 0.932, zIndex: 50 },
		{ x: 0.34, y: 0.081, scale: 0.92, zIndex: 40 },
		{ x: 0.524, y: 0.038, scale: 0.807, zIndex: 30 },
		{ x: 0.658, y: 0.017, scale: 0.943, zIndex: 20 },
		{ x: 0.837, y: 0.016, scale: 0.83, zIndex: 10 },
	],
	[
		{ x: 0.165, y: 0.033, scale: 0.864, zIndex: 50 },
		{ x: 0.322, y: 0.056, scale: 0.977, zIndex: 40 },
		{ x: 0.52, y: 0.018, scale: 0.807, zIndex: 30 },
		{ x: 0.659, y: 0.014, scale: 0.898, zIndex: 20 },
		{ x: 0.847, y: 0.003, scale: 0.795, zIndex: 10 },
	],
]

const FOUR_BOOK_LAYOUTS: StackConfig[] = [
	[
		{ x: 0.182, y: 0.123, scale: 0.909, zIndex: 50 },
		{ x: 0.411, y: 0.051, scale: 0.966, zIndex: 40 },
		{ x: 0.627, y: 0.082, scale: 0.909, zIndex: 30 },
		{ x: 0.807, y: 0.062, scale: 0.955, zIndex: 20 },
	],
	[
		{ x: 0.173, y: 0.046, scale: 0.898, zIndex: 50 },
		{ x: 0.382, y: 0.034, scale: 0.807, zIndex: 40 },
		{ x: 0.604, y: 0.042, scale: 0.943, zIndex: 30 },
		{ x: 0.829, y: 0.036, scale: 0.875, zIndex: 20 },
	],
	[
		{ x: 0.198, y: 0.079, scale: 0.977, zIndex: 50 },
		{ x: 0.418, y: 0.026, scale: 0.83, zIndex: 40 },
		{ x: 0.613, y: 0.021, scale: 0.886, zIndex: 30 },
		{ x: 0.818, y: 0.015, scale: 0.841, zIndex: 20 },
	],
]

const THREE_BOOK_LAYOUTS: StackConfig[] = [
	[
		{ x: 0.197, y: 0.025, scale: 0.898, zIndex: 50 },
		{ x: 0.496, y: 0.026, scale: 0.807, zIndex: 40 },
		{ x: 0.795, y: 0.046, scale: 0.943, zIndex: 30 },
	],
	[
		{ x: 0.197, y: 0.027, scale: 0.83, zIndex: 50 },
		{ x: 0.512, y: 0.005, scale: 0.909, zIndex: 40 },
		{ x: 0.809, y: 0.011, scale: 0.727, zIndex: 30 },
	],
]

const TWO_BOOK_LAYOUTS: StackConfig[] = [
	[
		{ x: 0.291, y: 0.012, scale: 0.773, zIndex: 50 },
		{ x: 0.71, y: 0.034, scale: 0.909, zIndex: 30 },
	],
	[
		{ x: 0.313, y: 0.038, scale: 0.875, zIndex: 50 },
		{ x: 0.69, y: 0.025, scale: 0.807, zIndex: 30 },
	],
]

const ONE_BOOK_LAYOUTS: StackConfig[] = [[{ x: 0.5, y: 0.03, scale: 0.966, zIndex: 30 }]]

const LAYOUT_MAP: Record<number, StackConfig[]> = {
	1: ONE_BOOK_LAYOUTS,
	2: TWO_BOOK_LAYOUTS,
	3: THREE_BOOK_LAYOUTS,
	4: FOUR_BOOK_LAYOUTS,
	5: FIVE_BOOK_LAYOUTS,
}

export function getLayoutConfig(thumbnailCount: number, layoutNumber: number) {
	const layoutOptions = LAYOUT_MAP[thumbnailCount]
	const resolvedLayoutNumber: number = layoutNumber % (layoutOptions?.length || 1)
	// @ts-expect-error: it's fine
	const layoutConfig: StackConfig = layoutOptions[resolvedLayoutNumber]
	return layoutConfig
}
