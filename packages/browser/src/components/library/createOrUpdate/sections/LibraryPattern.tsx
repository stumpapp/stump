import { Label, Link, RadioGroup, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { LibraryPattern } from '@stump/types'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

type Props = {
	isCreating?: boolean
}

// TODO: Figure out heading style

export default function LibraryPatternRadioGroup({ isCreating }: Props) {
	const form = useFormContext()

	const { t } = useLocaleContext()

	const libraryPattern: LibraryPattern = form.watch('library_pattern')
	const isCollectionBasedSelected = libraryPattern === 'COLLECTION_BASED'

	const handleChange = useCallback(
		(pattern: LibraryPattern) => {
			if (isCreating) {
				form.setValue('library_pattern', pattern)
			}
		},
		[form, isCreating],
	)

	return (
		<div className="flex flex-col gap-y-1.5">
			<Label>{t(getKey('section.heading'))}</Label>
			<Text size="sm" variant="muted">
				{t(getKey('section.description'))}
			</Text>

			<input type="hidden" {...form.register('library_pattern')} />

			<RadioGroup
				value={libraryPattern}
				onValueChange={handleChange}
				className="mt-1 flex flex-col sm:flex-row"
				disabled={!isCreating}
				title={isCreating ? undefined : t(getKey('section.disabled'))}
			>
				<RadioGroup.CardItem
					label={t(getKey('collectionPriority.label'))}
					description={t(getKey('collectionPriority.description'))}
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={isCollectionBasedSelected}
					value="COLLECTION_BASED"
					className="md:w-1/2"
				/>

				<RadioGroup.CardItem
					label={t(getKey('seriesPriority.label'))}
					description={t(getKey('seriesPriority.description'))}
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					isActive={!isCollectionBasedSelected}
					value="SERIES_BASED"
					className="md:w-1/2"
				/>
			</RadioGroup>

			{isCreating && (
				<Text size="xs" variant="muted">
					{t(getKey('section.docs.0'))}{' '}
					<Link
						target="_blank"
						href="https://stumpapp.dev/guides/basics/libraries#supported-patterns"
					>
						{t(getKey('section.docs.1'))}
					</Link>{' '}
					{t(getKey('section.docs.2'))}
					{<b>{t(getKey('section.docs.3'))}</b>}
				</Text>
			)}
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.libraryPattern'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
