import {
	Button,
	Card,
	cx,
	Heading,
	Input,
	Label,
	NativeSelect,
	RadioGroup,
	Text,
	WideSwitch,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useFormState } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'

import { CreateOrUpdateLibrarySchema } from '../schema'

type Option =
	| NonNullable<CreateOrUpdateLibrarySchema['thumbnailConfig']['resizeMethod']>['mode']
	| 'none'

const formatOptions = [
	{ label: 'WebP', value: 'WEBP' },
	{ label: 'JPEG', value: 'JPEG' },
	{ label: 'PNG', value: 'PNG' },
]

export default function ThumbnailConfigForm() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()

	const { errors, dirtyFields } = useFormState({ control: form.control })
	const { t } = useLocaleContext()

	const [resizeMethod, enabled] = form.watch([
		'thumbnailConfig.resizeMethod',
		'thumbnailConfig.enabled',
	])
	const isCreating = !ctx?.library

	const handleEnabledChange = useCallback(
		(checked: boolean) => {
			form.setValue('thumbnailConfig.enabled', checked)
			if (checked && !resizeMethod) {
				form.setValue('thumbnailConfig.resizeMethod', {
					mode: 'scaleEvenlyByFactor',
					factor: 0.65,
				})
				form.setValue('thumbnailConfig.quality', 0.75)
			}
		},
		[form, resizeMethod],
	)

	const handleResizeMethodChange = useCallback(
		(value: Option) => {
			if (value === 'none' || value === resizeMethod?.mode) {
				form.setValue('thumbnailConfig.resizeMethod', null)
			} else {
				const newOptions = {
					mode: value,
				} as NonNullable<CreateOrUpdateLibrarySchema['thumbnailConfig']>['resizeMethod']
				const currentQuality = form.getValues('thumbnailConfig.quality')
				form.setValue('thumbnailConfig.resizeMethod', newOptions)
				form.setValue('thumbnailConfig.enabled', true)
				form.setValue('thumbnailConfig.quality', currentQuality ?? 0.75)
			}
		},
		[form, resizeMethod?.mode],
	)

	/**
	 * A function to render the save button. This will only render if there are changes to the form
	 * that have not been saved, and if we are editing an existing library
	 */
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
			errors.thumbnailConfig?.resizeMethod?.message ||
			errors.thumbnailConfig?.resizeMethod?.root?.message,
		[errors],
	)

	// TODO: I actually can't tell if I hate this animation or not. I think it might just
	// be doing too much, yknow

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">
					{t(getKey(`section.heading.${isCreating ? 'create' : 'update'}`))}
				</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('section.description'))}
				</Text>
			</div>

			<div className="flex max-w-2xl flex-col gap-4">
				<WideSwitch
					description="Generate thumbnail images for this library"
					label="Enabled"
					checked={enabled}
					onCheckedChange={() => handleEnabledChange(!enabled)}
				/>

				<AnimatePresence mode="wait">
					{!enabled && (
						<motion.div
							key="no-thumbnail-config"
							initial={{ height: 0, opacity: 0, y: -10 }}
							animate={{
								height: 'auto',
								opacity: 1,
								y: 0,
								transition: {
									height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
									opacity: { duration: 0.2, ease: 'easeOut' },
									y: { duration: 0.2, ease: 'easeOut' },
								},
							}}
							exit={{
								height: 0,
								opacity: 0,
								y: -10,
								transition: {
									height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
									opacity: { duration: 0.15, ease: 'easeIn' },
									y: { duration: 0.15, ease: 'easeIn' },
								},
							}}
						>
							<Card className="flex flex-col items-center gap-y-4 border-dashed p-6">
								<span className="rounded-full border border-fill-brand-secondary bg-fill-brand p-1">
									<Check className="text-foreground" />
								</span>
								<Text size="sm" variant="muted">
									No additional configuration is required when thumbnail generation is disabled
								</Text>
							</Card>
						</motion.div>
					)}

					{enabled && resizeMethod && (
						<motion.div
							key="thumbnail-config"
							className="flex flex-col gap-4"
							initial={{ height: 0, opacity: 0, y: 10 }}
							animate={{
								height: 'auto',
								opacity: 1,
								y: 0,
								transition: {
									height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
									opacity: { duration: 0.2, ease: 'easeOut' },
									y: { duration: 0.2, ease: 'easeOut' },
								},
							}}
							exit={{
								height: 0,
								opacity: 0,
								y: 10,
								transition: {
									height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
									opacity: { duration: 0.15, ease: 'easeIn' },
									y: { duration: 0.15, ease: 'easeIn' },
								},
							}}
						>
							<Label>Resize Method</Label>
							<NativeSelect
								options={[
									{ label: 'Evenly Scale', value: 'scaleEvenlyByFactor' },
									{ label: 'Exact Size', value: 'exact' },
									{ label: 'Scale Dimension', value: 'scaleDimension' },
									{ label: 'None', value: 'none' },
								]}
								value={resizeMethod.mode}
								onChange={(e) => handleResizeMethodChange(e.target.value as Option)}
							/>

							{resizeMethod.mode === 'scaleEvenlyByFactor' && (
								<>
									<Text size="xs" variant="muted">
										Scale the thumbnail by a factor of the original size. For example, a scale
										factor of 0.65 will result in a thumbnail that is 65% of the original size
									</Text>
									<div className="flex flex-col gap-2">
										<Label>Scale Factor</Label>
										<Input
											contrast
											variant="primary"
											placeholder="0.65"
											{...form.register('thumbnailConfig.resizeMethod.factor', {
												valueAsNumber: true,
											})}
											errorMessage={form.formState.errors.thumbnailConfig?.resizeMethod?.message}
										/>
									</div>
								</>
							)}

							{resizeMethod.mode === 'exact' && (
								<>
									<Text size="xs" variant="muted">
										Resize the thumbnail to an exact size. If the original image is smaller than the
										specified size, it will be upscaled
									</Text>
									<Input
										contrast
										variant="primary"
										label="Width"
										placeholder="200"
										{...form.register('thumbnailConfig.resizeMethod.width', {
											valueAsNumber: true,
										})}
										// errorMessage={form.formState.errors.thumbnailConfig?.resizeMethod?.width?.message}
									/>
									<Input
										contrast
										variant="primary"
										label="Height"
										placeholder="350"
										{...form.register('thumbnailConfig.resizeMethod.height', {
											valueAsNumber: true,
										})}
										// errorMessage={
										// 	form.formState.errors.thumbnailConfig?.resizeMethod?.height?.message
										// }
									/>
								</>
							)}

							{resizeMethod.mode === 'scaleDimension' && (
								<>
									<Text size="xs" variant="muted">
										Set either the width or height of the thumbnail and auto-scale the other to keep
										the original aspect ratio
									</Text>

									<div className="flex flex-col gap-2">
										<Label>Dimension</Label>
										<NativeSelect
											options={[
												{ label: 'Width', value: 'WIDTH' },
												{ label: 'Height', value: 'HEIGHT' },
											]}
											{...form.register('thumbnailConfig.resizeMethod.dimension')}
											defaultValue="WIDTH"
										/>
									</div>

									<Input
										contrast
										variant="primary"
										label="Size"
										placeholder="350"
										{...form.register('thumbnailConfig.resizeMethod.size', {
											valueAsNumber: true,
										})}
										// errorMessage={
										// 	form.formState.errors.thumbnailConfig?.resizeMethod?.height?.message
										// }
									/>
								</>
							)}

							{/* <RadioGroup
								value={!resizeMethod && (
								?.mode}
								onValueChange={handleResizeMethodChange}
								className="gap-4"
							>
								<RadioGroup.CardItem
									isActive={resizeMethod?.mode === 'Scaled'}
									label={t(getKey('scaled.label'))}
									description={t(getKey('scaled.description'))}
									value="Scaled"
								>
									<fieldset
										className="flex items-start justify-end gap-2"
										disabled={resizeMethod?.mode !== 'Scaled'}
									>
										<Input
											contrast
											variant="primary"
											label={t(getKey('scaled.width.label'))}
											placeholder="0.65"
											{...(resizeMethod?.mode === 'Scaled'
												? form.register('thumbnailConfig.resizeMethod.width', {
														valueAsNumber: true,
													})
												: {})}
											{...(resizeMethod?.mode === 'Scaled'
												? {
														errorMessage:
															form.formState.errors.thumbnailConfig?.resizeMethod?.width?.message,
													}
												: {})}
										/>
										<Input
											contrast
											variant="primary"
											label={t(getKey('scaled.height.label'))}
											placeholder="0.65"
											{...(resizeMethod?.mode === 'Scaled'
												? form.register('thumbnailConfig.resizeMethod.height', {
														valueAsNumber: true,
													})
												: {})}
										/>
									</fieldset>

									{resizeOptionsError && resizeMethod?.mode === 'Scaled' && (
										<Text className="mt-2" size="xs" variant="danger">
											{resizeOptionsError}
										</Text>
									)}
								</RadioGroup.CardItem>

								<RadioGroup.CardItem
									isActive={resizeMethod?.mode === 'Sized'}
									label={t(getKey('sized.label'))}
									description={t(getKey('sized.description'))}
									value="Sized"
								>
									<fieldset
										className="flex items-start justify-end gap-2"
										disabled={resizeMethod?.mode !== 'Sized'}
									>
										<Input
											contrast
											variant="primary"
											label={t(getKey('sized.width.label'))}
											placeholder="200"
											{...(resizeMethod?.mode === 'Sized'
												? form.register('thumbnailConfig.resizeMethod.width', {
														valueAsNumber: true,
													})
												: {})}
											{...(resizeMethod?.mode === 'Sized'
												? {
														errorMessage:
															form.formState.errors.thumbnailConfig?.resizeMethod?.width?.message,
													}
												: {})}
										/>
										<Input
											contrast
											variant="primary"
											label={t(getKey('sized.height.label'))}
											placeholder="350"
											{...(resizeMethod?.mode === 'Sized'
												? form.register('thumbnailConfig.resizeMethod.height', {
														valueAsNumber: true,
													})
												: {})}
										/>
									</fieldset>

									{resizeOptionsError && resizeMethod?.mode === 'Sized' && (
										<Text className="mt-2" size="xs" variant="danger">
											{resizeOptionsError}
										</Text>
									)}
								</RadioGroup.CardItem>
							</RadioGroup>

							<div className="flex flex-col gap-6 py-6">
								<div className="flex flex-col gap-2">
									<Label className={cx({ 'cursor-not-allowed text-opacity-50': !resizeMethod })}>
										{t(getKey('format.label'))}
									</Label>
									<NativeSelect
										options={formatOptions}
										disabled={!resizeMethod}
										{...form.register('thumbnailConfig.format')}
									/>
									<Text
										size="xs"
										variant="muted"
										className={cx({ 'cursor-not-allowed text-opacity-50': !resizeMethod })}
									>
										{t(getKey('format.description'))}
									</Text>
								</div>

								<Input
									contrast
									variant="primary"
									label={t(getKey('quality.label'))}
									disabled={!resizeMethod}
									descriptionProps={{ className: 'text-xs' }}
									description={t(getKey('quality.description'))}
									errorMessage={form.formState.errors.thumbnailConfig?.quality?.message}
									placeholder="0.75"
									{...form.register('thumbnailConfig.quality', { valueAsNumber: true })}
								/>
							</div> */}
						</motion.div>
					)}
				</AnimatePresence>

				{renderSaveButton()}
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.thumbnailConfig'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
