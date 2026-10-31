import { Button, cx, Input, Label, NativeSelect, NewCard, RawSwitch } from '@stump/components'
import { SupportedImageFormat } from '@stump/graphql'
import { Fragment, useCallback } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { match } from 'ts-pattern'

import { useTranslate } from '@/hooks/useTranslate'
import { useLibraryManagementSafe } from '@/scenes/library/tabs/settings/context'

import { CreateOrUpdateLibrarySchema, intoFormThumbnailConfig } from '../schema'
import GenerateThumbnailColorsSwitch from './GenerateThumbnailColorsSwitch'

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
	const ctx = useLibraryManagementSafe()

	const { t, translate } = useTranslate()

	const [resizeMethod, enabled] = useWatch({
		control: form.control,
		name: ['thumbnailConfig.resizeMethod', 'thumbnailConfig.enabled'],
	})

	const {
		errors: { thumbnailConfig: configErrors },
	} = useFormState({ control: form.control })

	const isCreating = !ctx?.library

	const handleEnabledChange = useCallback(
		(checked: boolean) => {
			form.setValue('thumbnailConfig.enabled', checked)
			if (checked && !resizeMethod) {
				// @ts-expect-error: I intentionally omit certain values to have the user fill them in
				form.setValue('thumbnailConfig.resizeMethod', {
					mode: 'scaleEvenlyByFactor',
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

				const newOptions = match(value)
					.with(
						'scaleEvenlyByFactor',
						() =>
							({
								mode: 'scaleEvenlyByFactor',
							}) as const,
					)
					.with(
						'exact',
						() =>
							({
								mode: 'exact',
							}) as const,
					)
					.with(
						'scaleDimension',
						() =>
							({
								mode: 'scaleDimension',
								dimension: 'WIDTH',
							}) as const,
					)
					.otherwise(() => null)

				if (newOptions?.mode === existingConfig.resizeMethod?.mode) {
					// @ts-expect-error: I intentionally omit certain values to have the user fill them in
					form.setValue('thumbnailConfig.resizeMethod', {
						...existingConfig.resizeMethod,
						...newOptions,
					})
				} else {
					// @ts-expect-error: I intentionally omit certain values to have the user fill them in
					form.setValue('thumbnailConfig.resizeMethod', newOptions)
				}

				form.setValue('thumbnailConfig.enabled', true)
				form.clearErrors('thumbnailConfig.resizeMethod')
			}
		},
		[form, resizeMethod?.mode, ctx?.library],
	)

	return (
		<NewCard
			label={t(getKey(`section.heading.${isCreating ? 'create' : 'update'}`))}
			description={t(getKey('section.description'))}
		>
			<NewCard.Row
				label={translate('shared.common.enabled')}
				description={t(getKey('enableSwitch.generateDescription'))}
			>
				<RawSwitch checked={enabled} onCheckedChange={() => handleEnabledChange(!enabled)} />
			</NewCard.Row>

			{enabled && (
				<Fragment key="thumbnail-config">
					<NewCard.Row label={t(getKey('resizeMethod.label'))}>
						<div>
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
					</NewCard.Row>

					{resizeMethod?.mode === 'scaleEvenlyByFactor' && (
						<NewCard.Row
							label={t(getKey('scaleEvenlyByFactor.label'))}
							description={t(getKey('scaleEvenlyByFactor.description'))}
						>
							<div>
								<Input
									placeholder="0.65"
									{...form.register('thumbnailConfig.resizeMethod.factor', {
										valueAsNumber: true,
									})}
									// @ts-expect-error: This does exist...
									errorMessage={configErrors?.resizeMethod?.factor?.message}
								/>
							</div>
						</NewCard.Row>
					)}

					{resizeMethod?.mode === 'exact' && (
						<NewCard.Row
							label={translate('shared.common.size')}
							description={t(getKey('exact.description'))}
						>
							<div className="gap-2 flex flex-row items-center">
								<Input
									label={t(getKey('exact.width.label'))}
									placeholder="200"
									{...form.register('thumbnailConfig.resizeMethod.width', {
										valueAsNumber: true,
									})}
									// @ts-expect-error: This does exist...
									errorMessage={configErrors?.resizeMethod?.width?.message}
								/>
								<Input
									label={t(getKey('exact.height.label'))}
									placeholder="350"
									{...form.register('thumbnailConfig.resizeMethod.height', {
										valueAsNumber: true,
									})}
									// @ts-expect-error: This does exist...
									errorMessage={configErrors?.resizeMethod?.height?.message}
								/>
							</div>
						</NewCard.Row>
					)}

					{resizeMethod?.mode === 'scaleDimension' && (
						<NewCard.Row
							label={t(getKey('scaleDimension.label'))}
							description={t(getKey('scaleDimension.description'))}
						>
							<div className="gap-2 flex flex-row items-center">
								<div className="gap-2 lg:max-w-xs grid w-full items-center">
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
									label={translate('shared.common.size')}
									placeholder="350"
									{...form.register('thumbnailConfig.resizeMethod.size', {
										valueAsNumber: true,
									})}
									// @ts-expect-error: This does exist...
									errorMessage={configErrors?.resizeMethod?.size?.message}
								/>
							</div>
						</NewCard.Row>
					)}

					<NewCard.Row
						label={translate('shared.common.output')}
						description={t(getKey('output.description'))}
					>
						<div className="gap-4 flex flex-row items-center">
							<div className="gap-1.5 grid w-full items-center">
								<Label className={cx({ 'cursor-not-allowed opacity-50': !resizeMethod })}>
									{t(getKey('output.format'))}
								</Label>
								<NativeSelect
									options={formatOptions}
									disabled={!enabled}
									{...form.register('thumbnailConfig.format')}
									// errorMessage={form.formState.errors.thumbnailConfig?.format?.message}
								/>
							</div>

							<Input
								label={t(getKey('output.quality'))}
								disabled={!enabled}
								descriptionProps={{ className: 'text-xs' }}
								errorMessage={form.formState.errors.thumbnailConfig?.quality?.message}
								placeholder="75"
								{...form.register('thumbnailConfig.quality', { valueAsNumber: true })}
							/>
						</div>
					</NewCard.Row>
				</Fragment>
			)}

			<GenerateThumbnailColorsSwitch />

			{!!ctx?.library && (
				<NewCard.Footer className="justify-end">
					<Button type="submit">{translate('shared.common.saveChanges')}</Button>
				</NewCard.Footer>
			)}
		</NewCard>
	)
}

const LOCALE_KEY = 'createOrUpdateLibraryForm.fields.thumbnailConfig'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
