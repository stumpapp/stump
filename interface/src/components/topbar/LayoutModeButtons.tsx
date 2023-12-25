import { useLayoutMode } from '@stump/client'
import { IconButton } from '@stump/components'
import { Rows, SquaresFour } from 'phosphor-react'

export default function LayoutModeButtons() {
	const { layoutMode, setLayoutMode } = useLayoutMode()

	const viewAsGrid = layoutMode === 'GRID'

	return (
		<div className="flex items-center">
			<IconButton
				onClick={() => setLayoutMode('GRID')}
				variant={viewAsGrid ? 'subtle-dark' : 'subtle'}
			>
				<SquaresFour className="text-lg" weight="regular" />
			</IconButton>

			<IconButton
				onClick={() => setLayoutMode('LIST')}
				variant={viewAsGrid ? 'subtle' : 'subtle-dark'}
			>
				<Rows className="text-lg" weight="regular" />
			</IconButton>
		</div>
	)
}
