import { Heading, RadioGroup, Text } from '@stump/components'
import { LibraryViewMode, OrganizationMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useFormContext, useWatch } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'

export default function OrganizationModeRadioGroup() {
	const form = useFormContext()
	const ctx = useLibraryContextSafe()

	const { t } = useLocaleContext()

	const organizationMode = useWatch({ control: form.control, name: 'organizationMode' })
	const isMetadata = organizationMode === OrganizationMode.Metadata
	const isCreating = !ctx?.library

	const handleChange = (mode: OrganizationMode) => {
		if (!isCreating) return
		form.setValue('organizationMode', mode, { shouldDirty: true })
		if (mode === OrganizationMode.Metadata) {
			form.setValue('processMetadata', true)
			form.setValue('oneshotsDirectory', null)
			form.setValue('defaultLibraryViewMode', LibraryViewMode.Books)
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<Heading size="sm">{t(getKey('label'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<input type="hidden" {...form.register('organizationMode')} />
			<RadioGroup
				value={organizationMode}
				onValueChange={handleChange}
				disabled={!isCreating}
				className="sm:flex-row flex flex-col"
				aria-label={t(getKey('label'))}
			>
				<RadioGroup.CardItem
					label={t(getKey('filesystem.label'))}
					description={t(getKey('filesystem.description'))}
					value={OrganizationMode.Filesystem}
					isActive={!isMetadata}
					className="md:w-1/2"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
				/>
				<RadioGroup.CardItem
					label={t(getKey('metadata.label'))}
					description={t(getKey('metadata.description'))}
					value={OrganizationMode.Metadata}
					isActive={isMetadata}
					className="md:w-1/2"
					innerContainerClassName="block sm:flex-col sm:items-start sm:gap-2"
				/>
			</RadioGroup>
			<Text size="xs" variant="muted">
				{t(getKey('immutable'))}
			</Text>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.organizationMode'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
