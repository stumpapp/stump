import { Alert, AlertDescription, NewCard } from '@stump/components'
import { Info } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { useTranslate } from '@/hooks/useTranslate'
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

	const [processMetadata, watch, generateFileHashes, koreaderHashes] = useWatch({
		control: form.control,
		name: ['processMetadata', 'watch', 'generateFileHashes', 'generateKoreaderHashes'],
	})

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

	const { t } = useTranslate()

	return (
		<div className="gap-y-6 flex flex-col">
			<NewCard label={t(getKey('section.heading'))} description={t(getKey('section.description'))}>
				<NewCard.CheckboxRow
					id="processMetadata"
					label={t(getKey('processMetadata.label'))}
					description={t(getKey('processMetadata.description'))}
					checked={processMetadata}
					onClick={handleProcessMetadataChange}
					{...form.register('processMetadata')}
				/>

				<NewCard.CheckboxRow
					id="watch"
					label={t(getKey('watch.label'))}
					description={t(getKey('watch.description'))}
					checked={watch}
					onClick={handleWatchChange}
					{...form.register('watch')}
				/>

				<NewCard.CheckboxRow
					id="generateFileHashes"
					label={t(getKey('generateFileHashes.label'))}
					description={t(getKey('generateFileHashes.description'))}
					checked={generateFileHashes}
					onClick={handleGenerateFileHashesChange}
					{...form.register('generateFileHashes')}
				/>

				<NewCard.CheckboxRow
					id="generateKoreaderHashes"
					label={t(getKey('koreaderHashes.label'))}
					description={t(getKey('koreaderHashes.description'))}
					checked={koreaderHashes}
					onClick={handleGenerateKoreaderHashesChange}
					{...form.register('generateKoreaderHashes')}
				/>
			</NewCard>

			{isCreating && (
				<Alert variant="info">
					<Info />
					<AlertDescription>{t(getKey('section.disclaimer'))}</AlertDescription>
				</Alert>
			)}
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.scannerFeatures'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
