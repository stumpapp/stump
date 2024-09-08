import { zodResolver } from '@hookform/resolvers/zod'
import { Button, cn, Form } from '@stump/components'
import type { Library } from '@stump/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'

import { ContentContainer } from '@/components/container'
import DirectoryPickerModal from '@/components/DirectoryPickerModal'

import {
	buildSchema,
	CreateOrUpdateLibrarySchema,
	formDefaults,
} from '../../components/library/createOrUpdate/schema'
import {
	BasicLibraryInformation,
	FileConversionOptions,
	LibraryPattern as LibraryPatternSection,
	ScanMode,
	ScannerOptInFeatures,
	ThumbnailConfig,
} from '../../components/library/createOrUpdate/sections'
import IgnoreRulesConfig from '../../components/library/createOrUpdate/sections/IgnoreRulesConfig'
import { useCreateLibraryContext } from './context'
import LibraryReview from './LibraryReview'

type Props = {
	existingLibraries: Library[]
	onSubmit: (values: CreateOrUpdateLibrarySchema) => void
	isLoading?: boolean
}

export default function CreateLibraryForm({ existingLibraries, onSubmit, isLoading }: Props) {
	const { formStep, setStep } = useCreateLibraryContext()

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
	const [formPath] = form.watch(['path'])

	/**
	 * A callback to handle changing the form step. This will validate the current step
	 * before moving to the next step.
	 */
	const handleChangeStep = useCallback(
		async (nextStep: number) => {
			let isValid = false

			switch (formStep) {
				case 1:
					isValid = await form.trigger(['name', 'description', 'path', 'tags'])
					break
				case 2:
					isValid = await form.trigger([
						'library_pattern',
						'ignore_rules',
						'convert_rar_to_zip',
						'hard_delete_conversions',
					])
					break
				case 3:
					// TODO: do I need to validate children?
					isValid = await form.trigger(['thumbnail_config'])
					break
				default:
					break
			}

			if (isValid) {
				setStep(nextStep)
			}
		},
		[form, formStep, setStep],
	)

	/**
	 * Render the current step of the form
	 */
	const renderStep = () => {
		switch (formStep) {
			case 1:
				return (
					<>
						<BasicLibraryInformation onSetShowDirectoryPicker={setShowDirectoryPicker} />
						<div className="mt-6 flex w-full md:max-w-sm">
							<Button
								className="w-full md:w-auto"
								variant="primary"
								onClick={() => handleChangeStep(2)}
							>
								Next step
							</Button>
						</div>
					</>
				)
			case 2:
				return (
					<>
						<LibraryPatternSection />
						<ScannerOptInFeatures />
						<FileConversionOptions />
						<IgnoreRulesConfig />
						<div className="mt-6 flex w-full md:max-w-sm">
							<Button
								className="w-full md:w-auto"
								variant="primary"
								onClick={() => handleChangeStep(3)}
							>
								Next step
							</Button>
						</div>
					</>
				)
			case 3:
				return (
					<>
						<ThumbnailConfig />
						<div className="mt-6 flex w-full md:max-w-sm">
							<Button
								className="w-full md:w-auto"
								variant="primary"
								onClick={() => handleChangeStep(4)}
								type="button"
							>
								Continue to review
							</Button>
						</div>
					</>
				)
			default:
				return (
					<>
						<LibraryReview />
						<ScanMode />
					</>
				)
		}
	}

	// Note: The submit button is always rendered because I noticed that conditional rendering
	// causes the form to trigger a submit event. FYI
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
			<Form form={form} onSubmit={onSubmit} id="createLibraryForm">
				<ContentContainer className="mt-0">
					{renderStep()}

					<div
						className={cn('mt-6 flex w-full md:max-w-sm', {
							'invisible hidden': formStep < 4,
						})}
					>
						<Button
							type="submit"
							form="createLibraryForm"
							className="w-full md:w-auto"
							variant="primary"
							isLoading={isLoading}
						>
							Create library
						</Button>
					</div>
				</ContentContainer>
			</Form>
		</>
	)
}
