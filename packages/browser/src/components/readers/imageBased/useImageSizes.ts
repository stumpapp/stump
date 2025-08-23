import { useCallback, useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { IImageBaseReaderContext, ImagePageDimensionRef } from './context'

type Params = Pick<IImageBaseReaderContext, 'book'>

export function useImageSizes({ book: { id, metadata } }: Params) {
	const cachedSizes = useSizeStore((state) => state.cache[id]?.imageSizes || {})
	const storeSize = useSizeStore((state) => state.storeSize)

	const [initialSizes] = useState(
		() =>
			metadata?.pageAnalysis?.dimensions
				?.map(({ height, width }) => ({
					height,
					width,
					ratio: width / height,
				}))
				.reduce(
					(acc, ref, index) => {
						acc[index] = ref
						return acc
					},
					{} as Record<number, { height: number; width: number; ratio: number }>,
				) ?? {},
	)

	const imageSizes = useMemo(
		() => ({
			...cachedSizes,
			...initialSizes,
		}),
		[cachedSizes, initialSizes],
	)

	const setPageSize = useCallback(
		(page: number, dimensions: ImagePageDimensionRef) => {
			storeSize(id, page, dimensions)
		},
		[storeSize, id],
	)

	return {
		imageSizes,
		setPageSize,
	}
}

type SizeCache = {
	imageSizes: Record<number, ImagePageDimensionRef>
	// setImageSizes: (sizes: Record<number, ImagePageDimensionRef>) => void
	// storeImageSizes: (page: number, dimensions: ImagePageDimensionRef) => void
}

type ISizeStore = {
	cache: Record<string, SizeCache>
	store: (key: string, sizes: Record<number, ImagePageDimensionRef>) => void
	storeSize: (key: string, page: number, dimensions: ImagePageDimensionRef) => void
}

const useSizeStore = create<ISizeStore>()(
	persist(
		(set) => ({
			cache: {},
			store: (key, sizes) =>
				set((state) => ({
					cache: {
						...state.cache,
						[key]: {
							...state.cache[key],
							imageSizes: sizes,
						},
					},
				})),
			storeSize: (key, page, dimensions) =>
				set((state) => ({
					cache: {
						...state.cache,
						[key]: {
							...state.cache[key],
							imageSizes: {
								...state.cache[key]?.imageSizes,
								[page]: dimensions,
							},
						},
					},
				})),
		}),
		{
			name: 'stump-image-sizes',
		},
	),
)
