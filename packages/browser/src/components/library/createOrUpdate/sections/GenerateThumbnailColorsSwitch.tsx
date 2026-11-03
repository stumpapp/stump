import { NewCard, RawSwitch } from '@stump/components'
import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'

import { CreateOrUpdateLibrarySchema } from '../schema'

export default function GenerateThumbnailColorsSwitch() {
	const { t } = useTranslate()

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
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			disabled={thumbnailsEnabled}
			title={thumbnailsEnabled ? t(getKey('requiredWhenGenerationOn')) : undefined}
		>
			<RawSwitch
				checked={enabled}
				disabled={thumbnailsEnabled}
				onCheckedChange={() =>
					form.setValue(
						'processThumbnailColorsEvenWithoutConfig',
						!processThumbnailColorsEvenWithoutConfig,
					)
				}
			/>
		</NewCard.Row>
	)
}

const getKey = (key: string) =>
	`createOrUpdateLibraryForm.fields.thumbnailConfig.thumbnailColors.${key}`
