import {
	Button,
	Card,
	cx,
	Heading,
	Input,
	Label,
	NativeSelect,
	Text,
	WideSwitch,
} from '@stump/components'
import { SupportedImageFormat } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Check } from 'lucide-react'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'

import { useLibraryManagementSafe } from '@/scenes/library/tabs/settings/context'

import { CreateOrUpdateLibrarySchema, intoFormThumbnailConfig } from '../schema'

type Option =
	| NonNullable<CreateOrUpdateLibrarySchema['thumbnailConfig']['resizeMethod']>['mode']
	| 'none'

const formatOptions = [
	{ label: 'WebP', value: 'WEBP' },
	{ label: 'JPEG', value: 'JPEG' },
	{ label: 'PNG', value: 'PNG' },
]

// TODO(graphql): Add appropriate error reporting

export default function ThumbnailConfigForm() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryManagementSafe()

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
				form.setValue('thumbnailConfig.quality', 75)
				form.setValue('thumbnailConfig.format', SupportedImageFormat.Webp)
			} else if (!checked) {
				const existingConfig = intoFormThumbnailConfig(ctx?.library.config.thumbnailConfig)
				form.setValue('thumbnailConfig', { ...existingConfig, enabled: false })
			}
		},
		[form, resizeMethod, ctx?.library],
	)

	const handleResizeMethodChange = useCallback(
		(value: Option) => {
			if (value === 'none' || value === resizeMethod?.mode) {
				form.setValue('thumbnailConfig.resizeMethod', null)
			} else {
				const existingConfig = intoFormThumbnailConfig(ctx?.library.config.thumbnailConfig)
				const newOptions = {
					...existingConfig?.resizeMethod,
					mode: value,
				} as NonNullable<CreateOrUpdateLibrarySchema['thumbnailConfig']>['resizeMethod']
				form.setValue('thumbnailConfig.resizeMethod', newOptions)
				form.setValue('thumbnailConfig.enabled', true)
			}
		},
		[form, resizeMethod?.mode, ctx?.library],
	)

	// const existingConfig = useMemo(
	// 	() => intoFormThumbnailConfig(ctx?.library.config.thumbnailConfig),
	// 	[ctx?.library.config.thumbnailConfig],
	// )
	// const formConfig = form.watch('thumbnailConfig')

	// TODO(graphql): Fix this
	// // FIXME: This very much doesn't work lol
	// const isDifferent = useMemo(
	// 	() => !isEqual(formConfig, existingConfig),
	// 	[formConfig, existingConfig],
	// )
	// console.log('isDifferent', isDifferent, {
	// 	formConfig,
	// 	existingConfig,
	// })

	// /**
	//  * This is an awkward way to get the error message for the resize options. Because of the the
	//  * intersection types in the zod schema, the error message is nested in a few different places.
	//  */
	// const resizeOptionsError = useMemo(
	// 	() =>
	// 		errors.thumbnailConfig?.resizeMethod?.message ||
	// 		errors.thumbnailConfig?.resizeMethod?.root?.message,
	// 	[errors],
	// )

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

				{!enabled && (
					<div key="no-thumbnail-config">
						<Card className="flex flex-col items-center gap-y-4 border-dashed p-6">
							<span className="rounded-full border border-fill-brand-secondary bg-fill-brand p-1">
								<Check className="text-foreground" />
							</span>
							<Text size="sm" variant="muted">
								{t(getKey('section.disabled'))}
							</Text>
						</Card>
					</div>
				)}

				{enabled && (
					<div key="thumbnail-config" className="flex flex-col gap-4">
						<div className="grid w-full items-center gap-1.5 lg:max-w-sm">
							<Label>{t(getKey('resizeMethod.label'))}</Label>
							<NativeSelect
								options={[
									{
										label: t(getKey('resizeMethod.options.scaleEvenlyByFactor')),
										value: 'scaleEvenlyByFactor',
									},
									{ label: t(getKey('resizeMethod.options.exact')), value: 'exact' },
									{
										label: t(getKey('resizeMethod.options.scaleDimension')),
										value: 'scaleDimension',
									},
									{ label: t(getKey('resizeMethod.options.none')), value: 'none' },
								]}
								value={resizeMethod?.mode || 'none'}
								onChange={(e) => handleResizeMethodChange(e.target.value as Option)}
							/>
						</div>

						{resizeMethod?.mode === 'scaleEvenlyByFactor' && (
							<>
								<Text size="xs" variant="muted">
									{t(getKey('scaleEvenlyByFactor.description'))}
								</Text>
								<div className="flex flex-col gap-2">
									<Label>{t(getKey('scaleEvenlyByFactor.factor.label'))}</Label>
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

						{resizeMethod?.mode === 'exact' && (
							<>
								<Text size="xs" variant="muted">
									{t(getKey('exact.description'))}
								</Text>
								<Input
									contrast
									variant="primary"
									label={t(getKey('exact.width.label'))}
									placeholder="200"
									{...form.register('thumbnailConfig.resizeMethod.width', {
										valueAsNumber: true,
									})}
									// errorMessage={form.formState.errors.thumbnailConfig?.resizeMethod?.width?.message}
								/>
								<Input
									contrast
									variant="primary"
									label={t(getKey('exact.height.label'))}
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

						{resizeMethod?.mode === 'scaleDimension' && (
							<>
								<Text size="xs" variant="muted">
									{t(getKey('scaleDimension.description'))}
								</Text>

								<div className="grid w-full items-center gap-2 lg:max-w-xs">
									<Label>{t(getKey('scaleDimension.dimension.label'))}</Label>
									<NativeSelect
										options={[
											{
												label: t(getKey('scaleDimension.dimension.options.width')),
												value: 'WIDTH',
											},
											{
												label: t(getKey('scaleDimension.dimension.options.height')),
												value: 'HEIGHT',
											},
										]}
										{...form.register('thumbnailConfig.resizeMethod.dimension')}
										defaultValue="WIDTH"
									/>
								</div>

								<Input
									contrast
									variant="primary"
									label={t(getKey('scaleDimension.size.label'))}
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
					</div>
				)}

				{enabled && (
					<>
						<div className="grid w-full items-center gap-2 lg:max-w-sm">
							<Label className={cx({ 'cursor-not-allowed text-opacity-50': !resizeMethod })}>
								{t(getKey('format.label'))}
							</Label>
							<NativeSelect
								options={formatOptions}
								disabled={!enabled}
								{...form.register('thumbnailConfig.format')}
								// errorMessage={form.formState.errors.thumbnailConfig?.format?.message}
							/>
							<Text
								size="xs"
								variant="muted"
								className={cx({ 'cursor-not-allowed text-opacity-50': !enabled })}
							>
								{t(getKey('format.description'))}
							</Text>
						</div>

						<Input
							contrast
							variant="primary"
							label={t(getKey('quality.label'))}
							disabled={!enabled}
							descriptionProps={{ className: 'text-xs' }}
							description={t(getKey('quality.description'))}
							errorMessage={form.formState.errors.thumbnailConfig?.quality?.message}
							placeholder="75"
							{...form.register('thumbnailConfig.quality', { valueAsNumber: true })}
						/>
						{/*
						{resizeOptionsError && resizeMethod?.mode === 'Scaled' && (
							<Text className="mt-2" size="xs" variant="danger">
								{resizeOptionsError}
							</Text>
						)} */}
					</>
				)}

				{!!ctx?.library && (
					<div className="mt-4">
						<Button
							// title={isDifferent ? undefined : t('common.noChanges')}
							type="submit"
							// disabled={!isDifferent}
							variant="primary"
						>
							{t('common.saveChanges')}
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.thumbnailConfig'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
