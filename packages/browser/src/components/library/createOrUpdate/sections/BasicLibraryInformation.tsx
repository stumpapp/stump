import { Heading, IconButton, Input, Text, TextArea } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Folder } from 'lucide-react'
import React, { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import TagSelect from '@/components/TagSelect'

import { CreateOrUpdateLibrarySchema } from '../schema'

const LOCALE_KEY = 'createOrUpdateLibraryForm'
const getKey = (key: string) => `${LOCALE_KEY}.fields.${key}`
const getSectionKey = (key: string) => `${LOCALE_KEY}.sections.${key}`

type Props = {
	isCreatingLibrary?: boolean
	onSetShowDirectoryPicker: (value: boolean) => void
}

export default function BasicLibraryInformation({
	isCreatingLibrary,
	onSetShowDirectoryPicker,
}: Props) {
	const { t } = useLocaleContext()

	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const tags = form.watch('tags')

	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	return (
		<div className="flex flex-grow flex-col gap-6">
			{isCreatingLibrary && (
				<div>
					<Heading size="sm">{t(getSectionKey('heading'))}</Heading>
					<Text size="sm" variant="muted">
						{t(getSectionKey('description'))}
					</Text>
				</div>
			)}

			<div className="flex flex-col flex-wrap gap-y-6 md:flex-row md:gap-x-6 md:gap-y-0">
				<Input
					variant="primary"
					label={t(getKey('name.label'))}
					description={t(getKey('name.description'))}
					placeholder={t(getKey('name.placeholder'))}
					containerClassName="max-w-full md:max-w-sm"
					required
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
						<IconButton
							size="xs"
							variant="ghost"
							type="button"
							onClick={() => onSetShowDirectoryPicker(true)}
						>
							<Folder className="h-4 w-4 text-foreground-muted" />
						</IconButton>
					}
					required
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

			<TagSelect
				label={t(getKey('tags.label'))}
				description={t(getKey('tags.description'))}
				selected={tags}
				onChange={(value) => form.setValue('tags', value)}
			/>
		</div>
	)
}
