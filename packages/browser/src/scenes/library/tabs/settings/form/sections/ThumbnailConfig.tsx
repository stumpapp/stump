import { cx, Heading, Input, Label, NativeSelect, RadioGroup, Text } from '@stump/components'
import { ImageResizeMode, ImageResizeOptions } from '@stump/types'
import { useFormContext } from 'react-hook-form'

import { Schema } from '../CreateOrUpdateLibraryForm'

const formatOptions = [
	{ label: 'WebP', value: 'Webp' },
	{ label: 'JPEG', value: 'Jpeg' },
	{ label: 'PNG', value: 'Png' },
]

export default function ThumbnailConfigForm() {
	const form = useFormContext<Schema>()

	const resize_options = form.watch('thumbnail_config.resize_options')

	const handleSelection = (option: ImageResizeMode | 'disabled') => {
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
	}

	const resizeOptionsError = form.formState.errors.thumbnail_config?.resize_options?.message

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">Thumbnail generation</Heading>
				<Text size="sm" variant="muted">
					Optionally generate thumbnails for library content to improve image loading times
				</Text>
			</div>

			<div className="flex max-w-2xl flex-col gap-4">
				<RadioGroup
					value={resize_options?.mode || 'disabled'}
					onValueChange={handleSelection}
					className="gap-4"
				>
					<RadioGroup.CardItem
						isActive={!resize_options}
						label="Disabled"
						description="No thumbnails will be generated for this library"
						value="disabled"
					/>

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
									? form.register('thumbnail_config.resize_options.width', { valueAsNumber: true })
									: {})}
								{...(resize_options?.mode === 'Sized'
									? {
											errorMessage:
												form.formState.errors.thumbnail_config?.resize_options?.width?.message,
										}
									: {})}
							/>
							<Input
								contrast
								variant="primary"
								label="Height"
								placeholder="350"
								{...(resize_options?.mode === 'Sized'
									? form.register('thumbnail_config.resize_options.height', { valueAsNumber: true })
									: {})}
							/>
						</fieldset>
					</RadioGroup.CardItem>

					<RadioGroup.CardItem
						isActive={resize_options?.mode === 'Scaled'}
						label="Custom Scaled"
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
									? form.register('thumbnail_config.resize_options.width', { valueAsNumber: true })
									: {})}
								{...(resize_options?.mode === 'Scaled'
									? {
											errorMessage:
												form.formState.errors.thumbnail_config?.resize_options?.width?.message,
										}
									: {})}
							/>
							<Input
								contrast
								variant="primary"
								label="Height Scale"
								placeholder="0.65"
								{...(resize_options?.mode === 'Scaled'
									? form.register('thumbnail_config.resize_options.height', { valueAsNumber: true })
									: {})}
							/>
						</fieldset>

						{resizeOptionsError && (
							<Text
								className={cx('mt-2', {
									'opacity-50': resize_options?.mode === undefined,
								})}
								size="xs"
								variant="danger"
							>
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
			</div>
		</div>
	)
}
