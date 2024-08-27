import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Form } from '@stump/components'
import type { Library } from '@stump/types'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'
import DirectoryPickerModal from '@/components/DirectoryPickerModal'

import { buildScema, CreateOrUpdateLibrarySchema, formDefaults } from './schema'
import {
	BasicLibraryInformation,
	FileConversionOptions,
	LibraryPattern as LibraryPatternSection,
	ScanMode,
	ThumbnailConfig,
} from './sections'
import IgnoreRulesConfig from './sections/IgnoreRulesConfig'

type Props = {
	library?: Library
	existingLibraries: Library[]
	onSubmit: (values: CreateOrUpdateLibrarySchema) => void
	isLoading?: boolean
}

export default function CreateLibraryForm({
	library,
	existingLibraries,
	onSubmit,
	isLoading,
}: Props) {
	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

	const schema = useMemo(() => buildScema(existingLibraries, library), [existingLibraries, library])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(library),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const { reset } = form
	useEffect(() => {
		return () => {
			reset()
		}
	}, [reset])

	const isCreatingLibrary = !library

	const [formPath] = form.watch(['path'])

	return (
		<>
			<DirectoryPickerModal
				isOpen={showDirectoryPicker}
				onClose={() => setShowDirectoryPicker(false)}
				startingPath={formPath}
				onPathChange={(path) => {
					if (path) {
						form.setValue('path', path)
					}
				}}
			/>
			<Form form={form} onSubmit={onSubmit}>
				<ContentContainer className="mt-0">
					<BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />

					{isCreatingLibrary && <LibraryPatternSection />}
					<FileConversionOptions />
					<ThumbnailConfig />
					<IgnoreRulesConfig isCreatingLibrary={isCreatingLibrary} />
					<ScanMode isCreatingLibrary={isCreatingLibrary} />

					<div className="mt-6 flex w-full md:max-w-sm">
						<Button className="w-full md:max-w-sm" variant="primary" isLoading={isLoading}>
							{isCreatingLibrary ? 'Create library' : 'Save changes'}
						</Button>
					</div>
				</ContentContainer>
			</Form>
		</>
	)
}
