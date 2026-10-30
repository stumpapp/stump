import { NewCard, Select } from '@stump/components'
import { LibraryPattern } from '@stump/graphql'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContextSafe } from '@/scenes/library/context'

export default function LibraryPatternRadioGroup() {
	const form = useFormContext()
	const ctx = useLibraryContextSafe()

	const { t } = useTranslate()

	const libraryPattern = useWatch({ control: form.control, name: 'libraryPattern' })
	const isCreating = !ctx?.library

	const handleChange = useCallback(
		(pattern: LibraryPattern) => {
			if (isCreating) {
				form.setValue('libraryPattern', pattern)
			}
		},
		[form, isCreating],
	)

	// TODO: metadata options can live here once implemented, prob
	// do sm like if organization_mode = metadata, hide filesystem pattern?
	// otherwise if organization_mode = filesystem then show it?
	// or maybe disable? idk

	return (
		<NewCard label={t(getKey('label'))} description={t(getKey('description'))}>
			{/*<NewCard.Row
				label="Mode"
				// The library will be constructed based on how the files are organized
				description="The library will be constructed from the metadata of books within it"
			>
				<div>
					<Select value="Metadata" onValueChange={() => {}}>
						<Select.Trigger size="sm">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{['Metadata', 'Filesystem'].map((mode) => (
								<Select.Item key={mode} value={mode}>
									{mode}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</NewCard.Row>*/}

			<NewCard.Row
				label={t(getKey('filesystemPattern.label'))}
				description={t(getKey(`filesystemPattern.${libraryPattern}.description`))}
			>
				<div>
					<Select value={libraryPattern} onValueChange={handleChange}>
						<Select.Trigger size="sm">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{[LibraryPattern.CollectionBased, LibraryPattern.SeriesBased].map((pattern) => (
								<Select.Item key={pattern} value={pattern}>
									{t(getKey(`filesystemPattern.${pattern}.label`))}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</NewCard.Row>
		</NewCard>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.organization'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
