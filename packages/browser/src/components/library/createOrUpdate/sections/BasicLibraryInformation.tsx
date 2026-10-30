import { useOidcConfig } from '@stump/client'
import { ComboBox, InputGroup, NewCard, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { Folder } from 'lucide-react'
import { Suspense, useState } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'

import TagSelect from '@/components/TagSelect'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryContextSafe } from '@/scenes/library/context'

import { CreateOrUpdateLibrarySchema } from '../schema'
import LibraryTypeSelect from './LibraryType'

const LOCALE_KEY = 'createOrUpdateLibraryForm'
const getKey = (key: string) => `${LOCALE_KEY}.fields.${key}`

type Props = {
	onSetShowDirectoryPicker: (value: boolean) => void
}

export default function BasicLibraryInformation({ onSetShowDirectoryPicker }: Props) {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()
	const { checkPermission } = useAppContext()

	const isCreatingLibrary = !ctx?.library
	const tags = useWatch({ control: form.control, name: 'tags' })

	const { t } = useTranslate()
	const { errors } = useFormState({
		control: form.control,
	})

	const oidcConfig = useOidcConfig()
	const oidcGroups = useWatch({ control: form.control, name: 'oidcGroups' })

	const [groupOptions, setGroupOptions] = useState(
		(oidcGroups || []).map((group) => ({ label: group, value: group })),
	)

	return (
		<>
			<NewCard label="Details">
				<NewCard.InputRow
					label={t(getKey('name.label'))}
					description={t(getKey('name.description'))}
					placeholder={t(getKey('name.placeholder'))}
					required={isCreatingLibrary}
					errorMessage={errors.name?.message}
					data-1p-ignore
					{...form.register('name')}
				/>

				<NewCard.TextAreaRow
					label={t(getKey('description.label'))}
					description={t(getKey('description.description'))}
					placeholder={t(getKey('description.placeholder'))}
					{...form.register('description')}
				/>

				<Suspense fallback={null}>
					<NewCard.Row label={t(getKey('tags.label'))} description={t(getKey('tags.description'))}>
						<TagSelect selected={tags} onChange={(value) => form.setValue('tags', value)} />
					</NewCard.Row>
				</Suspense>

				<LibraryTypeSelect />
			</NewCard>

			<NewCard label="Folders">
				<NewCard.Row label={t(getKey('path.label'))} description={t(getKey('path.description'))}>
					<div className="gap-1.5 lg:flex-1 flex w-full flex-col">
						<InputGroup>
							<InputGroup.Input
								id="path"
								placeholder={t(getKey('path.placeholder'))}
								required={isCreatingLibrary}
								aria-invalid={!!errors.path?.message}
								{...form.register('path')}
							/>
							{checkPermission(UserPermission.FileExplorer) && (
								<InputGroup.Addon align="inline-end">
									<InputGroup.Button
										type="button"
										variant="ghost"
										size="icon-xs"
										onClick={() => onSetShowDirectoryPicker(true)}
									>
										<Folder className="h-4 w-4 text-muted-foreground" />
									</InputGroup.Button>
								</InputGroup.Addon>
							)}
						</InputGroup>
						{errors.path?.message && (
							<Text variant="danger" size="xs">
								{errors.path.message}
							</Text>
						)}
					</div>
				</NewCard.Row>

				<NewCard.InputRow
					label={t(getKey('oneshotsDirectory.label'))}
					id="oneshotsDirectory"
					placeholder={t(getKey('oneshotsDirectory.placeholder'))}
					errorMessage={errors.oneshotsDirectory?.message}
					description={t(getKey('oneshotsDirectory.description'))}
					{...form.register('oneshotsDirectory')}
				/>
			</NewCard>

			{oidcConfig.enabled && (
				<NewCard label={t(getKey('oidcGroups.label'))}>
					<NewCard.Row
						label={t(getKey('oidcGroups.label'))}
						description={t(getKey('oidcGroups.description'))}
					>
						<ComboBox
							options={groupOptions}
							value={oidcGroups ?? []}
							isMultiSelect
							onChange={(value) => form.setValue('oidcGroups', value ?? [])}
							onAddOption={(option) => setGroupOptions((prev) => [...prev, option])}
							filterable
						/>
					</NewCard.Row>
				</NewCard>
			)}
		</>
	)
}
