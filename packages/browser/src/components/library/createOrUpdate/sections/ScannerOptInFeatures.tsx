import { Alert, AlertDescription, CheckBox, Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useLibraryManagementSafe } from '@/scenes/library/tabs/settings/context'

type Props = {
	/**
	 * A callback that is triggered when the form values change, debounced by 1 second.
	 */
	onDidChange?: (
		values: Pick<
			CreateOrUpdateLibrarySchema,
			'processMetadata' | 'watch' | 'generateFileHashes' | 'generateKoreaderHashes'
		>,
	) => void
}

export default function ScannerOptInFeatures({ onDidChange }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryManagementSafe()
	const isCreating = !ctx?.library

	const [processMetadata, watch, generateFileHashes, koreaderHashes] = form.watch([
		'processMetadata',
		'watch',
		'generateFileHashes',
		'generateKoreaderHashes',
	])

	const params = useMemo(
		() => ({
			processMetadata,
			watch,
			generateFileHashes,
			generateKoreaderHashes: koreaderHashes,
		}),
		[processMetadata, watch, generateFileHashes, koreaderHashes],
	)

	const handleProcessMetadataChange = useCallback(() => {
		form.setValue('processMetadata', !processMetadata)
		if (onDidChange) {
			onDidChange({
				...params,
				processMetadata: !processMetadata,
			})
		}
	}, [form, processMetadata, params, onDidChange])

	const handleWatchChange = useCallback(() => {
		form.setValue('watch', !watch)
		if (onDidChange) {
			onDidChange({
				...params,
				watch: !watch,
			})
		}
	}, [form, watch, params, onDidChange])

	const handleGenerateFileHashesChange = useCallback(() => {
		form.setValue('generateFileHashes', !generateFileHashes)
		if (onDidChange) {
			onDidChange({
				...params,
				generateFileHashes: !generateFileHashes,
			})
		}
	}, [form, generateFileHashes, params, onDidChange])

	const handleGenerateKoreaderHashesChange = useCallback(() => {
		form.setValue('generateKoreaderHashes', !koreaderHashes)
		if (onDidChange) {
			onDidChange({
				...params,
				generateKoreaderHashes: !koreaderHashes,
			})
		}
	}, [form, koreaderHashes, params, onDidChange])

	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-y-6">
			<div className="flex flex-col gap-y-1.5">
				<Heading size="sm">{t(getKey('section.heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('section.description'))}
				</Text>
			</div>

			{isCreating && (
				<Alert variant="info">
					<AlertDescription>{t(getKey('section.disclaimer'))}</AlertDescription>
				</Alert>
			)}

			<CheckBox
				id="processMetadata"
				variant="primary"
				label={t(getKey('processMetadata.label'))}
				description={t(getKey('processMetadata.description'))}
				checked={processMetadata}
				onClick={handleProcessMetadataChange}
				{...form.register('processMetadata')}
			/>

			<CheckBox
				id="watch"
				variant="primary"
				label={t(getKey('watch.label'))}
				description={t(getKey('watch.description'))}
				checked={watch}
				onClick={handleWatchChange}
				{...form.register('watch')}
			/>

			<CheckBox
				id="generateFileHashes"
				variant="primary"
				label={t(getKey('generateFileHashes.label'))}
				description={t(getKey('generateFileHashes.description'))}
				checked={generateFileHashes}
				onClick={handleGenerateFileHashesChange}
				{...form.register('generateFileHashes')}
			/>

			<CheckBox
				id="generateKoreaderHashes"
				variant="primary"
				label={t(getKey('koreaderHashes.label'))}
				description={t(getKey('koreaderHashes.description'))}
				checked={koreaderHashes}
				onClick={handleGenerateKoreaderHashesChange}
				{...form.register('generateKoreaderHashes')}
			/>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.scannerFeatures'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
