import {
	Button,
	cx,
	Heading,
	Input,
	Label,
	NativeSelect,
	RadioGroup,
	Text,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { ImageResizeMode, ImageResizeOptions } from '@stump/types'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'
import { WideStyleSwitch } from '@/scenes/settings'

import { CreateOrUpdateLibrarySchema } from '../schema'

const formatOptions = [
	{ label: 'WebP', value: 'Webp' },
	{ label: 'JPEG', value: 'Jpeg' },
	{ label: 'PNG', value: 'Png' },
]

// TODO: render submit button if:
// - isCreating is not true
// and disable it if:
// - form values are the same as the initial values
// - form is submitting

export default function ThumbnailConfigForm() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()
	const { errors, dirtyFields } = useFormState({ control: form.control })
	const { t } = useLocaleContext()

	const isCreating = !ctx?.library
	const resize_options = form.watch('thumbnail_config.resize_options')

	const handleSelection = useCallback(
		(option: ImageResizeMode | 'disabled') => {
			if (option === 'disabled' || option === resize_options?.mode) {
				form.setValue('thumbnail_config.enabled', false)
				form.setValue('thumbnail_config.resize_options', undefined)
			} else {
				const newOptions = {
					mode: option,
				} as ImageResizeOptions
				const currentQuality = form.getValues('thumbnail_config.quality')
				form.setValue('thumbnail_config.resize_options', newOptions)
				form.setValue('thumbnail_config.enabled', true)
				form.setValue('thumbnail_config.quality', currentQuality ?? 0.75)
			}
		},
		[form, resize_options?.mode],
	)

	const renderSaveButton = useCallback(() => {
		if (!ctx?.library) {
			return null
		}

		const hasChanges = Object.keys(dirtyFields).length > 0

		return (
			<div>
				<Button
					title={hasChanges ? undefined : t('common.noChanges')}
					type="submit"
					disabled={!hasChanges}
					variant="primary"
					className="mt-4"
				>
					{t('common.saveChanges')}
				</Button>
			</div>
		)
	}, [ctx, t, dirtyFields])

	/**
	 * This is an awkward way to get the error message for the resize options. Because of the the
	 * intersection types in the zod schema, the error message is nested in a few different places.
	 */
	const resizeOptionsError = useMemo(
		() =>
			errors.thumbnail_config?.resize_options?.message ||
			errors.thumbnail_config?.resize_options?.root?.message,
		[errors],
	)

	// TODO: The header looks awk
	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">{isCreating ? 'Thumbnail generation' : 'Generation'}</Heading>
				<Text size="sm" variant="muted">
					Optionally generate thumbnails for library content to improve image loading times
				</Text>
			</div>

			<div className="flex max-w-2xl flex-col gap-4">
				<WideStyleSwitch
					description="Generate thumbnail images for this library"
					label="Enabled"
					isChecked={!!resize_options}
					onToggle={() => handleSelection(resize_options ? 'disabled' : 'Scaled')}
				/>

				<AnimatePresence>
					{!!resize_options && (
						<motion.div
							className="flex flex-col gap-4"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{ duration: 0.15 }}
						>
							<RadioGroup
								value={resize_options?.mode}
								onValueChange={handleSelection}
								className="gap-4"
							>
								<RadioGroup.CardItem
									isActive={resize_options?.mode === 'Scaled'}
									label="Scaled"
									description="A fixed scale that applies to each dimension"
									value="Scaled"
								>
									<fieldset
										className="flex items-start justify-end gap-2"
										disabled={resize_options?.mode !== 'Scaled'}
									>
										<Input
											contrast
											variant="primary"
											label="Width Scale"
											placeholder="0.65"
											{...(resize_options?.mode === 'Scaled'
												? form.register('thumbnail_config.resize_options.width', {
														valueAsNumber: true,
													})
												: {})}
											{...(resize_options?.mode === 'Scaled'
												? {
														errorMessage:
															form.formState.errors.thumbnail_config?.resize_options?.width
																?.message,
													}
												: {})}
										/>
										<Input
											contrast
											variant="primary"
											label="Height Scale"
											placeholder="0.65"
											{...(resize_options?.mode === 'Scaled'
												? form.register('thumbnail_config.resize_options.height', {
														valueAsNumber: true,
													})
												: {})}
										/>
									</fieldset>

									{resizeOptionsError && resize_options?.mode === 'Scaled' && (
										<Text className="mt-2" size="xs" variant="danger">
											{resizeOptionsError}
										</Text>
									)}
								</RadioGroup.CardItem>

								<RadioGroup.CardItem
									isActive={resize_options?.mode === 'Sized'}
									label="Explicitly Sized"
									description="A fixed height and width (in pixels)"
									value="Sized"
								>
									<fieldset
										className="flex items-start justify-end gap-2"
										disabled={resize_options?.mode !== 'Sized'}
									>
										<Input
											contrast
											variant="primary"
											label="Width"
											placeholder="200"
											{...(resize_options?.mode === 'Sized'
												? form.register('thumbnail_config.resize_options.width', {
														valueAsNumber: true,
													})
												: {})}
											{...(resize_options?.mode === 'Sized'
												? {
														errorMessage:
															form.formState.errors.thumbnail_config?.resize_options?.width
																?.message,
													}
												: {})}
										/>
										<Input
											contrast
											variant="primary"
											label="Height"
											placeholder="350"
											{...(resize_options?.mode === 'Sized'
												? form.register('thumbnail_config.resize_options.height', {
														valueAsNumber: true,
													})
												: {})}
										/>
									</fieldset>

									{resizeOptionsError && resize_options?.mode === 'Sized' && (
										<Text className="mt-2" size="xs" variant="danger">
											{resizeOptionsError}
										</Text>
									)}
								</RadioGroup.CardItem>
							</RadioGroup>

							<div className="flex flex-col gap-6 py-6">
								<div className="flex flex-col gap-2">
									<Label className={cx({ 'cursor-not-allowed text-opacity-50': !resize_options })}>
										Image Format
									</Label>
									<NativeSelect
										options={formatOptions}
										disabled={!resize_options}
										{...form.register('thumbnail_config.format')}
									/>
									<Text
										size="xs"
										variant="muted"
										className={cx({ 'cursor-not-allowed text-opacity-50': !resize_options })}
									>
										The format of the generated thumbnail
									</Text>
								</div>

								<Input
									contrast
									variant="primary"
									label="Image Quality"
									disabled={!resize_options}
									descriptionProps={{ className: 'text-xs' }}
									description="The quality of the generated thumbnail, between 0 and 1.0"
									errorMessage={form.formState.errors.thumbnail_config?.quality?.message}
									placeholder="0.75"
									{...form.register('thumbnail_config.quality', { valueAsNumber: true })}
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{renderSaveButton()}
			</div>
		</div>
	)
}
