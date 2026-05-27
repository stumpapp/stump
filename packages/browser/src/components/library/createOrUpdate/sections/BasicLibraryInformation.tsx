import { Input, InputGroup, Label, Text, TextArea } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Folder } from 'lucide-react'
import { Suspense } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'

import TagSelect from '@/components/TagSelect'
import { useAppContext } from '@/context'
import { useLibraryContextSafe } from '@/scenes/library/context'

import { CreateOrUpdateLibrarySchema } from '../schema'

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

	const { t } = useLocaleContext()
	const { errors } = useFormState({
		control: form.control,
	})

	return (
		<div className="gap-6 flex grow flex-col">
			<div className="gap-y-6 md:flex-row md:gap-x-6 md:gap-y-6 flex flex-col flex-wrap">
				<Input
					label={t(getKey('name.label'))}
					description={t(getKey('name.description'))}
					placeholder={t(getKey('name.placeholder'))}
					containerClassName="max-w-full md:max-w-sm"
					required={isCreatingLibrary}
					errorMessage={errors.name?.message}
					data-1p-ignore
					{...form.register('name')}
				/>

				<div className="gap-2 md:max-w-sm grid w-full max-w-full items-center">
					<Label htmlFor="path">
						{t(getKey('path.label'))}
						{isCreatingLibrary && <span className="text-destructive"> *</span>}
					</Label>

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
						<Text variant="danger" size="xs" className="break-all">
							{errors.path.message}
						</Text>
					)}

					{!errors.path?.message && (
						<Text variant="muted" size="sm">
							{t(getKey('path.description'))}
						</Text>
					)}
				</div>
			</div>

			<TextArea
				className="flex"
				label={t(getKey('description.label'))}
				description={t(getKey('description.description'))}
				placeholder={t(getKey('description.placeholder'))}
				containerClassName="max-w-full md:max-w-sm lg:max-w-lg"
				{...form.register('description')}
			/>

			<Suspense fallback={null}>
				<TagSelect
					label={t(getKey('tags.label'))}
					description={t(getKey('tags.description'))}
					selected={tags}
					onChange={(value) => form.setValue('tags', value)}
				/>
			</Suspense>
		</div>
	)
}
