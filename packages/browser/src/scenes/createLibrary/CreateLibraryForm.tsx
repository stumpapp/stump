import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@stump/components'
import { CreateLibrarySceneExistingLibrariesQuery, UserPermission } from '@stump/graphql'
import { ClipboardCheck, FolderOpen, Image, ScanSearch } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import DirectoryPickerModal from '@/components/DirectoryPickerModal'
import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
} from '@/components/library/createOrUpdate/schema'
import {
	BasicLibraryInformation,
	DefaultLibraryView,
	FileConversionOptions,
	LibraryPattern as LibraryPatternSection,
	ScannerOptInFeatures,
	ThumbnailConfig,
} from '@/components/library/createOrUpdate/sections'
import IgnoreRulesConfig from '@/components/library/createOrUpdate/sections/IgnoreRulesConfig'
import { SteppedForm, type SteppedFormStep } from '@/components/steppedForm'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

import LibraryReview from './LibraryReview'
import ScanAfterPersist from './ScanAfterPersist'

type Props = {
	existingLibraries: CreateLibrarySceneExistingLibrariesQuery['libraries']['nodes']
	onSubmit: (values: CreateOrUpdateLibrarySchema) => void
	isLoading?: boolean
}

export default function CreateLibraryForm({ existingLibraries, onSubmit, isLoading }: Props) {
	const { checkPermission } = useAppContext()
	const { t } = useTranslate()

	const [showDirectoryPicker, setShowDirectoryPicker] = useState(false)

	const schema = useMemo(() => buildSchema(existingLibraries), [existingLibraries])
	const form = useForm<CreateOrUpdateLibrarySchema>({
		defaultValues: formDefaults(),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const { reset } = form
	useEffect(() => {
		return () => {
			reset()
		}
	}, [reset])

	/**
	 * The current path value from the form
	 */
	const [formPath] = useWatch({ control: form.control, name: ['path'] })

	const steps = useMemo<SteppedFormStep[]>(
		() => [
			{
				key: 'basics',
				icon: FolderOpen,
				fields: ['name', 'description', 'path', 'tags'],
				render: () => <BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />,
			},
			{
				key: 'scanning',
				icon: ScanSearch,
				fields: [
					'libraryPattern',
					'ignoreRules',
					'convertRarToZip',
					'hardDeleteConversions',
					'watch',
				],
				render: () => (
					<>
						<LibraryPatternSection />
						<DefaultLibraryView />
						<ScannerOptInFeatures />
						<FileConversionOptions />
						<IgnoreRulesConfig />
					</>
				),
			},
			{
				key: 'thumbnails',
				icon: Image,
				fields: ['thumbnailConfig'],
				render: () => <ThumbnailConfig />,
			},
			{
				key: 'review',
				icon: ClipboardCheck,
				isReview: true,
				render: () => (
					<>
						<LibraryReview />
						<ScanAfterPersist />
					</>
				),
			},
		],
		[],
	)

	/**
	 * Prevent a submit event triggering when the enter key is pressed on an input
	 */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
			e.preventDefault()
		}
	}

	return (
		<>
			{checkPermission(UserPermission.FileExplorer) && (
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
			)}
			<Form form={form} onSubmit={onSubmit} id="createLibraryForm" onKeyDown={handleKeyDown}>
				<SteppedForm
					localeBase="createLibraryScene"
					steps={steps}
					submitLabel={t('createLibraryScene.form.buttons.confirm')}
					isSubmitting={isLoading}
				/>
			</Form>
		</>
	)
}
