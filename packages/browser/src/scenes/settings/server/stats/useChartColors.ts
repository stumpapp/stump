import { useMemo } from 'react'

import { useTheme } from '@/hooks/useTheme'

// TODO: figure out if I can somehow get resolveTailwind to work with this

export function useChartColors() {
	const { theme } = useTheme()

	const palette = useMemo(
		() => hardCodedPalettes[theme] || (hardCodedPalettes.light as Palette),
		[theme],
	)

	return palette
}

type Palette = {
	calendar: {
		emptyColor: string
		monthBorderColor: string
		dayBorderColor: string
		legendColor: string
		tooltipColor?: string
	}
	colors: string[]
}

const hardCodedPalettes: Record<string, Palette> = {
	dark: {
		calendar: {
			dayBorderColor: '#1F2123',
			emptyColor: '#1B1C1D',
			legendColor: '#F5F3EF',
			monthBorderColor: '#1F2123',
			tooltipColor: '#1D1B1B',
		},
		colors: ['#CF9977', '#3F89CA', '#F59E0B', '#b02a2999'],
	},
	light: {} as Palette,
}
