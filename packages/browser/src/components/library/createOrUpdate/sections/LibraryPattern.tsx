import { NewCard, Select } from '@stump/components'
import { LibraryPattern, LibraryViewMode, OrganizationMode } from '@stump/graphql'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContextSafe } from '@/scenes/library/context'

export default function LibraryPatternRadioGroup() {
	const form = useFormContext()
	const ctx = useLibraryContextSafe()

	const { t } = useTranslate()

	const organizationMode = useWatch({ control: form.control, name: 'organizationMode' })
	const libraryPattern = useWatch({ control: form.control, name: 'libraryPattern' })
	const isMetadata = organizationMode === OrganizationMode.Metadata
	const isCreating = !ctx?.library

	const handleChange = useCallback(
		(pattern: LibraryPattern) => {
			if (isCreating) {
				form.setValue('libraryPattern', pattern)
			}
		},
		[form, isCreating],
	)

	const handleModeChange = useCallback(
		(mode: OrganizationMode) => {
			if (!isCreating) return
			form.setValue('organizationMode', mode, { shouldDirty: true })
			if (mode === OrganizationMode.Metadata) {
				form.setValue('processMetadata', true)
				form.setValue('oneshotsDirectory', null)
				form.setValue('defaultLibraryViewMode', LibraryViewMode.Books)
			}
		},
		[form, isCreating],
	)

	return (
		<NewCard label={t(getKey('label'))} description={t(getKey('description'))}>
			<NewCard.Row
				label={t(getKey('mode.label'))}
				description={
					<>
						{t(getKey(`mode.${isMetadata ? 'metadata' : 'filesystem'}.description`))}{' '}
						{t(getKey('mode.immutable'))}
					</>
				}
				disabled={!isCreating}
			>
				<div>
					<Select value={organizationMode} onValueChange={handleModeChange} disabled={!isCreating}>
						<Select.Trigger size="sm" aria-label={t(getKey('mode.label'))}>
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{[OrganizationMode.Filesystem, OrganizationMode.Metadata].map((mode) => (
								<Select.Item key={mode} value={mode}>
									{t(
										getKey(
											`mode.${mode === OrganizationMode.Metadata ? 'metadata' : 'filesystem'}.label`,
										),
									)}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</NewCard.Row>

			{/* metadata libraries group books by their series metadata, so folder patterns do not apply */}
			{!isMetadata && (
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
			)}
		</NewCard>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.organization'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
