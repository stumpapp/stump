import { Heading, Link, RadioGroup, Text } from '@stump/components'
import { LibraryPattern, LibraryViewMode, OrganizationMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'

export default function LibraryPatternRadioGroup() {
	const form = useFormContext()
	const ctx = useLibraryContextSafe()

	const { t } = useLocaleContext()

	const organizationMode = useWatch({ control: form.control, name: 'organizationMode' })
	const isMetadata = organizationMode === OrganizationMode.Metadata
	const libraryPattern = useWatch({ control: form.control, name: 'libraryPattern' })
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

	const handleOrganizationChange = (mode: OrganizationMode) => {
		if (!isCreating) return
		form.setValue('organizationMode', mode, { shouldDirty: true })
		if (mode === OrganizationMode.Metadata) {
			form.setValue('processMetadata', true)
			form.setValue('oneshotsDirectory', null)
			form.setValue('defaultLibraryViewMode', LibraryViewMode.Books)
		}
	}
	return (
		<div className="gap-6 flex flex-col">
			<div className="space-y-4">
				<div>
					<Heading size="sm">
						{t('createOrUpdateLibraryForm.fields.organizationMode.label')}
					</Heading>
					<Text size="sm" variant="muted">
						{t('createOrUpdateLibraryForm.fields.organizationMode.description')}
					</Text>
				</div>
				<input type="hidden" {...form.register('organizationMode')} />
				<RadioGroup
					value={organizationMode}
					onValueChange={handleOrganizationChange}
					disabled={!isCreating}
					className="sm:flex-row flex flex-col"
					aria-label={t('createOrUpdateLibraryForm.fields.organizationMode.label')}
				>
					<RadioGroup.CardItem
						label={t('createOrUpdateLibraryForm.fields.organizationMode.filesystem.label')}
						description={t(
							'createOrUpdateLibraryForm.fields.organizationMode.filesystem.description',
						)}
						value={OrganizationMode.Filesystem}
						isActive={!isMetadata}
						className="md:w-1/2"
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					/>
					<RadioGroup.CardItem
						label={t('createOrUpdateLibraryForm.fields.organizationMode.metadata.label')}
						description={t(
							'createOrUpdateLibraryForm.fields.organizationMode.metadata.description',
						)}
						value={OrganizationMode.Metadata}
						isActive={isMetadata}
						className="md:w-1/2"
						innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
					/>
				</RadioGroup>
				<Text size="xs" variant="muted">
					{t('createOrUpdateLibraryForm.fields.organizationMode.immutable')}
				</Text>
			</div>
			{!isMetadata && (
				<>
					<div>
						<Heading size="sm">{t(getOptionKey('label'))}</Heading>
						<Text size="sm" variant="muted">
							{t(getOptionKey('description'))}
						</Text>
					</div>

					<div className="gap-y-4 flex flex-col">
						<input type="hidden" {...form.register('libraryPattern')} />

						<RadioGroup
							value={libraryPattern}
							onValueChange={handleChange}
							className="mt-1 sm:flex-row flex flex-col"
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
									href="https://stumpapp.dev/docs/guides/fundamentals/libraries#supported-patterns"
								>
									{t(getKey('section.docs.1'))}
								</Link>{' '}
								{t(getKey('section.docs.2'))} {<b>{t(getKey('section.docs.3'))}</b>}
							</Text>
						)}
					</div>
				</>
			)}
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.libraryPattern'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
const getOptionKey = (key: string) => getKey(`options.${key}`)
