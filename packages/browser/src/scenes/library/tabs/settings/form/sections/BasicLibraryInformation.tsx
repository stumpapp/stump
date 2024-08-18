import { Heading, IconButton, Input, Text, TextArea } from '@stump/components'
import { Folder } from 'lucide-react'
import React, { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { Schema } from '../CreateOrUpdateLibraryForm'

type Props = {
	onSetShowDirectoryPicker: (value: boolean) => void
}
export default function BasicLibraryInformation({ onSetShowDirectoryPicker }: Props) {
	const form = useFormContext<Schema>()

	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">Basic information</Heading>
				<Text size="sm" variant="muted">
					This information will be used to identify your library and find its content
				</Text>
			</div>
			<Input
				variant="primary"
				label="Name"
				placeholder="My library"
				containerClassName="max-w-full md:max-w-sm"
				required
				errorMessage={errors.name?.message}
				data-1p-ignore
				{...form.register('name')}
			/>
			<Input
				variant="primary"
				label="Path"
				placeholder="/path/to/library"
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

			{/* <TagSelect
		isLoading={isLoadingTags}
		options={tags.map((tag) => ({ label: tag.name, value: tag.name }))}
		defaultValue={library?.tags?.map((tag) => ({ label: tag.name, value: tag.name }))}
		onCreateTag={handleCreateTag}
	/> */}

			<TextArea
				className="flex"
				variant="primary"
				label="Description"
				placeholder="A short description of your library (optional)"
				containerClassName="max-w-full md:max-w-sm"
				{...form.register('description')}
			/>
		</div>
	)
}
