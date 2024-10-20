import { CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import { useLibraryContextSafe } from '@/scenes/library/context'

import { CreateOrUpdateLibrarySchema } from '../schema'

type Props = {
	/**
	 * A callback that is triggered when the form values change, debounced by 1 second.
	 */
	onDidChange?: (
		values: Pick<CreateOrUpdateLibrarySchema, 'convert_rar_to_zip' | 'hard_delete_conversions'>,
	) => void
}

export default function FileConversionOptions({ onDidChange }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()

	const [convertRarToZip, hardDeleteConversions] = form.watch([
		'convert_rar_to_zip',
		'hard_delete_conversions',
	])
	const [debouncedOptions] = useDebouncedValue({ convertRarToZip, hardDeleteConversions }, 1000)

	const { t } = useLocaleContext()

	useEffect(() => {
		if (!convertRarToZip && hardDeleteConversions) {
			form.setValue('hard_delete_conversions', false)
		}
	}, [convertRarToZip, hardDeleteConversions])

	/***
	 * An effect that triggers the `onDidChange` callback when the form values change.
	 */
	useEffect(() => {
		if (!ctx?.library || !onDidChange) return

		const existingConvertToZip = ctx.library.config.convert_rar_to_zip
		const existingHardDelete = ctx.library.config.hard_delete_conversions
		const { convertRarToZip, hardDeleteConversions } = debouncedOptions

		if (convertRarToZip !== existingConvertToZip || hardDeleteConversions !== existingHardDelete) {
			onDidChange({
				convert_rar_to_zip: convertRarToZip,
				hard_delete_conversions: hardDeleteConversions,
			})
		}
	}, [ctx?.library, debouncedOptions, onDidChange])

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="sm">{t(getKey('section.heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('section.description'))}
				</Text>
			</div>

			<CheckBox
				id="convert_rar_to_zip"
				variant="primary"
				label={t(getKey('rarToZip.label'))}
				description={t(getKey('rarToZip.description'))}
				checked={convertRarToZip}
				onClick={() => form.setValue('convert_rar_to_zip', !convertRarToZip)}
				{...form.register('convert_rar_to_zip')}
			/>

			<CheckBox
				id="hard_delete_conversions"
				variant="primary"
				label={t(getKey('deleteRarAfter.label'))}
				description={t(getKey('deleteRarAfter.description'))}
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={() => form.setValue('hard_delete_conversions', !hardDeleteConversions)}
				{...form.register('hard_delete_conversions')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.convertOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
