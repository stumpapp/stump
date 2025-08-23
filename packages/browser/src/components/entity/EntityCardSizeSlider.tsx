import { Slider } from '@stump/components'
import { Grid3X3, LayoutGrid } from 'lucide-react'

import { useGridSize } from '../container/useGridSize'

export function GridSizeSlider() {
	const { density, setDensity, availableDensities } = useGridSize()
	const currentIndex = availableDensities.indexOf(density)

	const handleValueChange = (value: number[]) => {
		const newIndex = value[0]
		if (newIndex != null && newIndex >= 0 && newIndex < availableDensities.length) {
			const selectedDensity = availableDensities[newIndex]
			if (selectedDensity) {
				setDensity(selectedDensity)
			}
		}
	}

	// TODO: Tooltip as you drag that shows a label, e.g. below but from locale files
	return (
		<div className="flex items-center gap-2">
			<LayoutGrid className="h-4 w-4 text-foreground-muted" />
			<Slider
				value={[currentIndex]}
				onValueChange={handleValueChange}
				max={availableDensities.length - 1}
				min={0}
				step={1}
				className="w-24"
			/>
			<Grid3X3 className="h-4 w-4 text-foreground-muted" />
		</div>
	)
}

// const DENSITY_LABELS: Record<GridDensity, string> = {
// 	'ultra-compact': 'Ultra Compact',
// 	compact: 'Compact',
// 	cozy: 'Cozy',
// 	comfortable: 'Comfortable',
// 	spacious: 'Spacious',
// 	expansive: 'Expansive',
// }
