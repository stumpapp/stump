import { WideSwitch } from '@stump/components'
import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function GenerateThumbnailColorsSwitch() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [thumbnailsEnabled, processThumbnailColorsEvenWithoutConfig] = form.watch([
		'thumbnailConfig.enabled',
		'processThumbnailColorsEvenWithoutConfig',
	])

	// Note: If thumbnail generation is enabled, this feature is enforced
	const enabled = useMemo(
		() => processThumbnailColorsEvenWithoutConfig || thumbnailsEnabled,
		[processThumbnailColorsEvenWithoutConfig, thumbnailsEnabled],
	)

	return (
		<div className="py-4">
			<WideSwitch
				label="Thumbnail colors"
				description="Extract dominant colors for thumbnails. This is used for thumbnail placeholders and accent colors"
				checked={enabled}
				disabled={thumbnailsEnabled}
				onCheckedChange={() =>
					form.setValue(
						'processThumbnailColorsEvenWithoutConfig',
						!processThumbnailColorsEvenWithoutConfig,
					)
				}
			/>
		</div>
	)
}
