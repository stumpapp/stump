import { Heading, Link, RadioGroup, Text } from '@stump/components'
import { LibraryPattern } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'

export default function LibraryPatternRadioGroup() {
	const form = useFormContext()
	const ctx = useLibraryContextSafe()

	const { t } = useLocaleContext()

	const libraryPattern: LibraryPattern = form.watch('libraryPattern')
	const isCollectionBasedSelected = libraryPattern === LibraryPattern.CollectionBased
	const isCreating = !ctx?.library

	const handleChange = useCallback(
		(pattern: LibraryPattern) => {
			if (isCreating) {
				form.setValue('libraryPattern', pattern)
			}
		},
		[form, isCreating],
	)

	// Note: if this section ever becomes more than library pattern, restore the section locale keys
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getOptionKey('label'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getOptionKey('description'))}
				</Text>
			</div>

			<div className="flex flex-col gap-y-4">
				<input type="hidden" {...form.register('libraryPattern')} />

				<RadioGroup
					value={libraryPattern}
					onValueChange={handleChange}
					className="mt-1 flex flex-col sm:flex-row"
					disabled={!isCreating}
					title={isCreating ? undefined : t(getKey('section.disabled'))}
					defaultValue="SERIES_BASED"
				>
					<RadioGroup.CardItem
						label={t(getOptionKey('collectionPriority.label'))}
						description={t(getOptionKey('collectionPriority.description'))}
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
						isActive={isCollectionBasedSelected}
						value={LibraryPattern.CollectionBased}
						className="md:w-1/2"
					/>

					<RadioGroup.CardItem
						label={t(getOptionKey('seriesPriority.label'))}
						description={t(getOptionKey('seriesPriority.description'))}
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
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.libraryPattern'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (key: string) => getKey(`options.${key}`)
