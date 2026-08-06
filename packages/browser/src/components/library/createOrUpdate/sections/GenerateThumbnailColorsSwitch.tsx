import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function GenerateThumbnailColorsSwitch() {
	const { t } = useLocaleContext()
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [thumbnailsEnabled, processThumbnailColorsEvenWithoutConfig] = useWatch({
		control: form.control,
		name: ['thumbnailConfig.enabled', 'processThumbnailColorsEvenWithoutConfig'],
	})

	// Note: If thumbnail generation is enabled, this feature is enforced
	const enabled = useMemo(
		() => processThumbnailColorsEvenWithoutConfig || thumbnailsEnabled,
		[processThumbnailColorsEvenWithoutConfig, thumbnailsEnabled],
	)

	return (
		<div className="py-4">
			<WideSwitch
				label={t('libraryUi.thumbnailColors')}
				description={t('libraryUi.thumbnailColorsDescription')}
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
