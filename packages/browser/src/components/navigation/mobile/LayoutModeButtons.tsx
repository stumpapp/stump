import { IconButton } from '@stump/components'
import { Grid2X2, Rows } from 'lucide-react'

import { useLayoutMode } from '@/hooks'

export default function LayoutModeButtons() {
	const { layoutMode, setLayoutMode } = useLayoutMode()

	const viewAsGrid = layoutMode === 'GRID'

	return (
		<div className="flex items-center">
			<IconButton
				onClick={() => setLayoutMode('GRID')}
				variant={viewAsGrid ? 'subtle-dark' : 'subtle'}
			>
				<Grid2X2 className="text-lg" />
			</IconButton>

			<IconButton
				onClick={() => setLayoutMode('LIST')}
				variant={viewAsGrid ? 'subtle' : 'subtle-dark'}
			>
				<Rows className="text-lg" />
			</IconButton>
		</div>
	)
}
