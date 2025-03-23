import { Alert, CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useDebouncedValue } from 'rooks'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useLibraryContextSafe } from '@/scenes/library/context'

type Props = {
	/**
	 * A callback that is triggered when the form values change, debounced by 1 second.
	 */
	onDidChange?: (
		values: Pick<
			CreateOrUpdateLibrarySchema,
			'process_metadata' | 'watch' | 'generate_file_hashes' | 'generate_koreader_hashes'
		>,
	) => void
}

export default function ScannerOptInFeatures({ onDidChange }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()
	const isCreating = !ctx?.library

	const [processMetadata, watch, generateFileHashes, koreaderHashes] = form.watch([
		'process_metadata',
		'watch',
		'generate_file_hashes',
		'generate_koreader_hashes',
	])
	const [debouncedOptions] = useDebouncedValue(
		{ processMetadata, watch, generateFileHashes, koreaderHashes },
		1000,
	)

	const { t } = useLocaleContext()

	/***
	 * An effect that triggers the `onDidChange` callback when the form values change.
	 */
	useEffect(() => {
		if (!ctx?.library || !onDidChange) return

		const existingProcessMetadata = ctx.library.config.process_metadata
		const existingWatch = ctx.library.config.watch
		const existingHashFiles = ctx.library.config.generate_file_hashes
		const existingKoreaderHashes = ctx.library.config.generate_koreader_hashes
		const { processMetadata, watch, generateFileHashes, koreaderHashes } = debouncedOptions

		const didChange =
			processMetadata !== existingProcessMetadata ||
			watch !== existingWatch ||
			generateFileHashes !== existingHashFiles ||
			koreaderHashes !== existingKoreaderHashes

		if (didChange) {
			onDidChange({
				process_metadata: processMetadata,
				watch: watch,
				generate_file_hashes: generateFileHashes,
				generate_koreader_hashes: koreaderHashes,
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

			{isCreating && (
				<Alert level="info">
					<Alert.Content>{t(getKey('section.disclaimer'))}</Alert.Content>
				</Alert>
			)}

			<CheckBox
				id="process_metadata"
				variant="primary"
				label={t(getKey('processMetadata.label'))}
				description={t(getKey('processMetadata.description'))}
				checked={processMetadata}
				onClick={() => form.setValue('process_metadata', !processMetadata)}
				{...form.register('process_metadata')}
			/>

			<CheckBox
				id="watch"
				variant="primary"
				label={t(getKey('watch.label'))}
				description={t(getKey('watch.description'))}
				checked={watch}
				onClick={() => form.setValue('watch', !watch)}
				{...form.register('watch')}
			/>

			<CheckBox
				id="generate_file_hashes"
				variant="primary"
				label={t(getKey('generateFileHashes.label'))}
				description={t(getKey('generateFileHashes.description'))}
				checked={generateFileHashes}
				onClick={() => form.setValue('generate_file_hashes', !generateFileHashes)}
				{...form.register('generate_file_hashes')}
			/>

			<CheckBox
				id="generate_koreader_hashes"
				variant="primary"
				label={t(getKey('koreaderHashes.label'))}
				description={t(getKey('koreaderHashes.description'))}
				checked={koreaderHashes}
				onClick={() => form.setValue('generate_koreader_hashes', !koreaderHashes)}
				{...form.register('generate_koreader_hashes')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.scannerFeatures'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
