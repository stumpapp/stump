import { Heading, Label, Text } from '@stump/components'
import { LibraryPattern } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import pluralize from 'pluralize'
import { PropsWithChildren } from 'react'
import { useFormContext } from 'react-hook-form'
import { match } from 'ts-pattern'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'

export default function LibraryReview() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const state = form.watch()

	const { t } = useLocaleContext()

	const renderThumbnailSettings = () => {
		if (!state.thumbnailConfig.enabled || !state.thumbnailConfig.resizeMethod) {
			return (
				<div>
					<Label>{t(getLabelKey('generateThumbnails'))}</Label>
					<Text variant="muted" size="sm">
						{t(getKey('no'))}
					</Text>
				</div>
			)
		} else {
			const dimensionUnit =
				state.thumbnailConfig.resizeMethod.mode === 'scaleEvenlyByFactor' ? 'x' : 'px'

			const renderResizeModeDetails = () =>
				match(state.thumbnailConfig.resizeMethod)
					.with({ mode: 'scaleEvenlyByFactor' }, ({ factor }) => `${factor}${dimensionUnit}`)
					.with(
						{ mode: 'exact' },
						({ width, height }) => `${width}${dimensionUnit}:${height}${dimensionUnit}`,
					)
					.with({ mode: 'scaleDimension' }, ({ dimension, size }) =>
						dimension === 'WIDTH' ? `${size}${dimensionUnit}:auto` : `auto:${size}${dimensionUnit}`,
					)
					.otherwise(() => '')

			return (
				<>
					<div>
						<Label>{t(getLabelKey('generateThumbnails'))}</Label>
						<Text variant="muted" size="sm">
							{t(getKey('yes'))}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('mode'))}</Label>
						<Text variant="muted" size="sm">
							{t(getLabelKey(state.thumbnailConfig.resizeMethod.mode))} ({renderResizeModeDetails()}
							)
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('format'))}</Label>
						<Text variant="muted" size="sm">
							{state.thumbnailConfig.format}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('quality'))}</Label>
						<Text variant="muted" size="sm">
							{state.thumbnailConfig.quality || 'Default'}
						</Text>
					</div>
				</>
			)
		}
	}

	return (
		<div className="flex flex-col space-y-8">
			<StepContainer
				label={t(getStepKey(1, 'heading'))}
				description={t(getStepKey(1, 'description'))}
			>
				<div>
					<Label>{t(getLabelKey('name'))}</Label>
					<Text variant="muted" size="sm">
						{state.name}
					</Text>
				</div>

				<div>
					<Label>{t(getLabelKey('path'))}</Label>
					<Text variant="muted" size="sm">
						{state.path}
					</Text>
				</div>

				<div>
					<Label>{t(getLabelKey('description'))}</Label>
					<Text variant="muted" size="sm">
						{state.description || 'None'}
					</Text>
				</div>

				<div>
					<Label>{t(getLabelKey('tags'))}</Label>
					<div className="flex flex-wrap gap-1">
						{!state.tags?.length && (
							<Text variant="muted" size="sm">
								{t(getKey('none'))}
							</Text>
						)}
						{state.tags?.map(({ label }, index) => (
							<Text variant="muted" size="sm" key={index}>
								#{label}
							</Text>
						))}
					</div>
				</div>
			</StepContainer>

			<StepContainer
				label={t(getStepKey(2, 'heading'))}
				description={t(getStepKey(2, 'description'))}
			>
				<div>
					<Label>{t(getLabelKey('pattern'))}</Label>
					<Text variant="muted" size="sm">
						{state.libraryPattern === LibraryPattern.CollectionBased
							? t(getPatternKey('collectionPriority.label'))
							: t(getPatternKey('seriesPriority.label'))}
					</Text>
				</div>

				<div>
					<Label>{t(getLabelKey('ignoreRules'))}</Label>
					<div className="flex flex-wrap gap-1">
						{!state.ignoreRules?.length && (
							<Text variant="muted" size="sm">
								{t(getKey('none'))}
							</Text>
						)}
						{!!state.ignoreRules?.length && (
							<Text variant="muted" size="sm">
								{state.ignoreRules.length} {pluralize('rule', state.ignoreRules.length)}
							</Text>
						)}
					</div>

					<div>
						<Label>{t(getLabelKey('processMetadata'))}</Label>
						<Text variant="muted" size="sm">
							{state.processMetadata ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('watch'))}</Label>
						<Text variant="muted" size="sm">
							{state.watch ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('generateFileHashes'))}</Label>
						<Text variant="muted" size="sm">
							{state.generateFileHashes ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('generateKoreaderHashes'))}</Label>
						<Text variant="muted" size="sm">
							{state.generateKoreaderHashes ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('convertRar'))}</Label>
						<Text variant="muted" size="sm">
							{state.convertRarToZip ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('deleteConversions'))}</Label>
						<Text variant="muted" size="sm">
							{state.hardDeleteConversions ? 'Yes' : 'No'}
						</Text>
					</div>
				</div>
			</StepContainer>

			<StepContainer
				label={t(getStepKey(3, 'heading'))}
				description={t(getStepKey(3, 'description'))}
			>
				{renderThumbnailSettings()}
			</StepContainer>
		</div>
	)
}

const LOCALE_KEY = 'createLibraryScene.form'
const getPatternKey = (key: string) =>
	`createOrUpdateLibraryForm.fields.libraryPattern.options.${key}`
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.steps.${step - 1}.${key}`
const getKey = (key: string) => `${LOCALE_KEY}.review.${key}`
const getLabelKey = (key: string) => getKey(`labels.${key}`)

type StepContainerProps = PropsWithChildren<{
	label: string
	description: string
}>

const StepContainer = ({ label, description, children }: StepContainerProps) => (
	<div className="grid grid-cols-7 justify-between space-y-4 md:space-y-0">
		<div className="col-span-7 md:col-span-4">
			<Heading size="sm">{label}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{description}
			</Text>
		</div>

		<div className="col-span-7 flex flex-col space-y-2 md:col-span-3">{children}</div>
	</div>
)
