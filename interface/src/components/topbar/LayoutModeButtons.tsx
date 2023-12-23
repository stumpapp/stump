import { LayoutEntity, useLayoutMode } from '@stump/client'
import { IconButton } from '@stump/components'
import type { LayoutMode } from '@stump/types'
import { Rows, SquaresFour } from 'phosphor-react'
import toast from 'react-hot-toast'

// FIXME: I briefly worked on this file to remove chakra, but it needs a LOT of work.
// it is very ugly. stinky doody code, too.

export default function LayoutModeButtons({ entity }: { entity: LayoutEntity }) {
	const { layoutMode, updateLayoutMode } = useLayoutMode(entity)

	async function handleChange(mode: LayoutMode) {
		updateLayoutMode(mode, (err) => {
			console.error(err)
			toast.error('Failed to update layout mode')
		})
	}

	const viewAsGrid = layoutMode === 'GRID'

	// TODO: ButtonGroup isAttached
	return (
		<div className="flex items-center">
			<IconButton
				onClick={() => handleChange('GRID')}
				// bg={useColorModeValue(
				// 	viewAsGrid ? 'blackAlpha.200' : 'gray.150',
				// 	// viewAsGrid ? 'whiteAlpha.200' : 'gray.800',
				// 	viewAsGrid ? 'whiteAlpha.50' : 'whiteAlpha.200',
				// )}

				variant={viewAsGrid ? 'subtle-dark' : 'subtle'}
			>
				<SquaresFour className="text-lg" weight="regular" />
			</IconButton>

			<IconButton
				onClick={() => handleChange('LIST')}
				// bg={useColorModeValue(
				// 	viewAsGrid ? 'gray.150' : 'blackAlpha.200',
				// 	// viewAsGrid ? 'gray.800' : 'whiteAlpha.200',
				// 	viewAsGrid ? 'whiteAlpha.200' : 'whiteAlpha.50',
				// )}
				variant={viewAsGrid ? 'subtle' : 'subtle-dark'}
			>
				<Rows className="text-lg" weight="regular" />
			</IconButton>
		</div>
	)
}
