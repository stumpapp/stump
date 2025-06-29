import { CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import { useLibraryManagementSafe } from '@/scenes/library/tabs/settings/context'

import { CreateOrUpdateLibrarySchema } from '../schema'

type Props = {
	/**
	 * A callback that is triggered when the form values change, debounced by 1 second.
	 */
	onDidChange?: (
		values: Pick<CreateOrUpdateLibrarySchema, 'convertRarToZip' | 'hardDeleteConversions'>,
	) => void
}

export default function FileConversionOptions({ onDidChange }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryManagementSafe()

	const [convertRarToZip, hardDeleteConversions] = form.watch([
		'convertRarToZip',
		'hardDeleteConversions',
	])
	const [debouncedOptions] = useDebouncedValue({ convertRarToZip, hardDeleteConversions }, 1000)

	const { t } = useLocaleContext()

	useEffect(() => {
		if (!convertRarToZip && hardDeleteConversions) {
			form.setValue('hardDeleteConversions', false)
		}
	}, [convertRarToZip, hardDeleteConversions, form])

	/***
	 * An effect that triggers the `onDidChange` callback when the form values change.
	 */
	useEffect(() => {
		if (!ctx?.library || !onDidChange) return

		const existingConvertToZip = ctx.library.config.convertRarToZip
		const existingHardDelete = ctx.library.config.hardDeleteConversions
		const { convertRarToZip, hardDeleteConversions } = debouncedOptions

		if (convertRarToZip !== existingConvertToZip || hardDeleteConversions !== existingHardDelete) {
			onDidChange({
				convertRarToZip: convertRarToZip,
				hardDeleteConversions: hardDeleteConversions,
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
				id="convertRarToZip"
				variant="primary"
				label={t(getKey('rarToZip.label'))}
				description={t(getKey('rarToZip.description'))}
				checked={convertRarToZip}
				onClick={() => form.setValue('convertRarToZip', !convertRarToZip)}
				{...form.register('convertRarToZip')}
			/>

			<CheckBox
				id="hardDeleteConversions"
				variant="primary"
				label={t(getKey('deleteRarAfter.label'))}
				description={t(getKey('deleteRarAfter.description'))}
				checked={hardDeleteConversions}
				disabled={!convertRarToZip}
				onClick={() => form.setValue('hardDeleteConversions', !hardDeleteConversions)}
				{...form.register('hardDeleteConversions')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.convertOptions'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
