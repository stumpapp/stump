import { Button, Input, TextArea } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Folder } from 'lucide-react'
import { Suspense } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import TagSelect from '@/components/TagSelect'
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

	const isCreatingLibrary = !ctx?.library
	const tags = form.watch('tags')

	const { t } = useLocaleContext()
	const { errors } = useFormState({
		control: form.control,
	})

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div className="flex flex-col flex-wrap gap-y-6 md:flex-row md:gap-x-6 md:gap-y-6">
				<Input
					variant="primary"
					label={t(getKey('name.label'))}
					description={t(getKey('name.description'))}
					placeholder={t(getKey('name.placeholder'))}
					containerClassName="max-w-full md:max-w-sm"
					required={isCreatingLibrary}
					errorMessage={errors.name?.message}
					data-1p-ignore
					{...form.register('name')}
				/>

				<Input
					variant="primary"
					label={t(getKey('path.label'))}
					description={t(getKey('path.description'))}
					placeholder={t(getKey('path.placeholder'))}
					containerClassName="max-w-full md:max-w-sm"
					rightDecoration={
						<Button size="icon" type="button" onClick={() => onSetShowDirectoryPicker(true)}>
							<Folder className="h-4 w-4 text-foreground-muted" />
						</Button>
					}
					required={isCreatingLibrary}
					errorMessage={errors.path?.message}
					{...form.register('path')}
				/>
			</div>

			<TextArea
				className="flex"
				variant="primary"
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
