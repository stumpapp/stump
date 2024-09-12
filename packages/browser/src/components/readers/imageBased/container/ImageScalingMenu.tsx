import { BookImageScalingMethod } from '@stump/client'
import { Popover, ToolTip } from '@stump/components'
import { Scaling } from 'lucide-react'
import React, { useCallback } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'
import ImageScalingSelect from './ImageScalingSelect'

export default function ImageScalingMenu() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { imageScaling },
		setBookPreferences,
	} = useBookPreferences({ book })

	const scaleChangeHandler = useCallback(
		(variant: 'height' | 'width') => (value: BookImageScalingMethod) => {
			setBookPreferences({ imageScaling: { ...imageScaling, [variant]: value } })
		},
		[imageScaling, setBookPreferences],
	)

	return (
		<Popover>
			<ToolTip content="Scaling config" align="end">
				<Popover.Trigger asChild data-testid="trigger">
					<ControlButton>
						<Scaling className="h-4 w-4" />
					</ControlButton>
				</Popover.Trigger>
			</ToolTip>

			<Popover.Content
				size="md"
				align="end"
				className="z-[101] flex flex-col gap-1.5 bg-background-surface"
			>
				<ImageScalingSelect
					variant="height"
					onChange={scaleChangeHandler('height')}
					value={imageScaling.height}
				/>
				<ImageScalingSelect
					variant="width"
					onChange={scaleChangeHandler('width')}
					value={imageScaling.width}
				/>
			</Popover.Content>
		</Popover>
	)
}
