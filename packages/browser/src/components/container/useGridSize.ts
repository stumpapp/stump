import { useMemo } from 'react'
import { useWindowSize } from 'rooks'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { usePreferences } from '@/hooks/usePreferences'

import { SIDEBAR_WIDTH } from '../navigation/sidebar'

export type GridDensity =
	| 'ultra-compact'
	| 'compact'
	| 'cozy'
	| 'comfortable'
	| 'spacious'
	| 'expansive'
export const DEFAULT_DENSITY: GridDensity = 'comfortable'

export const GRID_GAP = 8 // 0.5rem

type DeviceType = 'mobile' | 'tablet' | 'desktop-md' | 'desktop-lg' | 'desktop-xl' | 'desktop-xxl'

const DENSITY_TO_COLUMNS: Record<DeviceType, Record<GridDensity, number>> = {
	mobile: {
		'ultra-compact': 4,
		compact: 3,
		cozy: 3,
		comfortable: 2,
		spacious: 2,
		expansive: 1,
	},
	tablet: {
		'ultra-compact': 6,
		compact: 5,
		cozy: 4,
		comfortable: 3,
		spacious: 2,
		expansive: 1,
	},
	'desktop-md': {
		'ultra-compact': 8,
		compact: 8,
		cozy: 7,
		comfortable: 6,
		spacious: 5,
		expansive: 4,
	},
	'desktop-lg': {
		'ultra-compact': 10,
		compact: 9,
		cozy: 8,
		comfortable: 7,
		spacious: 6,
		expansive: 5,
	},
	'desktop-xl': {
		'ultra-compact': 13,
		compact: 12,
		cozy: 10,
		comfortable: 8,
		spacious: 6,
		expansive: 5,
	},
	'desktop-xxl': {
		'ultra-compact': 15,
		compact: 12,
		cozy: 10,
		comfortable: 8,
		spacious: 6,
		expansive: 5,
	},
}

export const getDensityTextSize = (density?: GridDensity): 'sm' | 'xs' => {
	if (!density) return 'sm'
	switch (density) {
		case 'ultra-compact':
		case 'compact':
			return 'xs'
		case 'cozy':
		case 'comfortable':
		case 'spacious':
		case 'expansive':
			return 'sm'
	}
}

type IGridSizeStore = {
	density?: GridDensity
	setDensity: (density: GridDensity) => void
}

export const useGridSizeStore = create<IGridSizeStore>()(
	persist<IGridSizeStore>(
		(set) => ({
			setDensity: (density) => set({ density }),
		}),
		{
			name: 'stump:entity-card-density',
			getStorage: () => localStorage,
		},
	),
)

const computePercentageWidth = (cols: number) => {
	const percentageRaw = `${(100 / cols).toFixed(6)}%`
	return `calc(${percentageRaw} - ${GRID_GAP}px)`
}

const getDeviceType = (width: number): DeviceType => {
	if (width <= 640) return 'mobile'
	if (width <= 1024) return 'tablet'
	if (width <= 1280) return 'desktop-md'
	if (width <= 1536) return 'desktop-lg'
	if (width <= 1920) return 'desktop-xl'
	// if (width <= 2560) return 'desktop-xxl'
	return 'desktop-xxl'
}

const getColumnsForDensity = (density: GridDensity, deviceType: DeviceType): number => {
	return DENSITY_TO_COLUMNS[deviceType][density]
}

const getAvailableDensities = (): GridDensity[] => {
	return [
		'ultra-compact',
		'compact',
		'cozy',
		'comfortable',
		'spacious',
		'expansive',
	].reverse() as GridDensity[]
}

export const useGridSize = () => {
	const dimensions = useWindowSize()
	const { density, setDensity } = useGridSizeStore()

	const {
		preferences: { primaryNavigationMode },
	} = usePreferences()
	const { innerWidth } = useMemo(
		() => ({
			innerWidth: dimensions.innerWidth ?? window.innerWidth,
		}),
		[dimensions],
	)
	const adjustedWidth = useMemo(
		() =>
			primaryNavigationMode === 'SIDEBAR' && innerWidth <= 768
				? innerWidth - SIDEBAR_WIDTH
				: innerWidth,
		[innerWidth, primaryNavigationMode],
	)

	const deviceType = useMemo(() => getDeviceType(adjustedWidth), [adjustedWidth])

	const currentDensity = density ?? DEFAULT_DENSITY
	const columns = useMemo(
		() => getColumnsForDensity(currentDensity, deviceType),
		[currentDensity, deviceType],
	)

	const availableDensities = useMemo(() => getAvailableDensities(), [])

	return {
		density: currentDensity,
		setDensity,
		columns,
		deviceType,
		availableDensities,
		percentageWidth: sizeToPercentageWidth[columns],
	}
}

export const sizeToPercentageWidth: Record<number, string> = {
	1: computePercentageWidth(1),
	2: computePercentageWidth(2),
	3: computePercentageWidth(3),
	4: computePercentageWidth(4),
	5: computePercentageWidth(5),
	6: computePercentageWidth(6),
	7: computePercentageWidth(7),
	8: computePercentageWidth(8),
	9: computePercentageWidth(9),
	10: computePercentageWidth(10),
	11: computePercentageWidth(11),
	12: computePercentageWidth(12),
	13: computePercentageWidth(13),
	14: computePercentageWidth(14),
	15: computePercentageWidth(15),
}
