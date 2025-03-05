import { Heading, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import pluralize from 'pluralize'
import { PropsWithChildren } from 'react'
import { useFormContext } from 'react-hook-form'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'

export default function LibraryReview() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const state = form.watch()

	const { t } = useLocaleContext()

	const renderThumbnailSettings = () => {
		if (!state.thumbnail_config.enabled || !state.thumbnail_config.resize_options) {
			return (
				<div>
					<Label>{t(getLabelKey('generateThumbnails'))}</Label>
					<Text variant="muted" size="sm">
						{t(getKey('no'))}
					</Text>
				</div>
			)
		} else {
			const dimensionUnit = state.thumbnail_config.resize_options.mode === 'Scaled' ? 'x' : 'px'

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
							{state.thumbnail_config.resize_options.mode} (
							{`${state.thumbnail_config.resize_options.width}${dimensionUnit}:${state.thumbnail_config.resize_options.height}${dimensionUnit}`}
							)
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('format'))}</Label>
						<Text variant="muted" size="sm">
							{state.thumbnail_config.format}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('quality'))}</Label>
						<Text variant="muted" size="sm">
							{state.thumbnail_config.quality || 'Default'}
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
						{state.library_pattern === 'COLLECTION_BASED'
							? t(getPatternKey('collectionPriority.label'))
							: t(getPatternKey('seriesPriority.label'))}
					</Text>
				</div>

				<div>
					<Label>{t(getLabelKey('ignoreRules'))}</Label>
					<div className="flex flex-wrap gap-1">
						{!state.ignore_rules?.length && (
							<Text variant="muted" size="sm">
								{t(getKey('none'))}
							</Text>
						)}
						{!!state.ignore_rules?.length && (
							<Text variant="muted" size="sm">
								{state.ignore_rules.length} {pluralize('rule', state.ignore_rules.length)}
							</Text>
						)}
					</div>

					<div>
						<Label>{t(getLabelKey('processMetadata'))}</Label>
						<Text variant="muted" size="sm">
							{state.process_metadata ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('dirWatch'))}</Label>
						<Text variant="muted" size="sm">
							{state.watch ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('generateFileHashes'))}</Label>
						<Text variant="muted" size="sm">
							{state.generate_file_hashes ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('convertRar'))}</Label>
						<Text variant="muted" size="sm">
							{state.convert_rar_to_zip ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>{t(getLabelKey('deleteConversions'))}</Label>
						<Text variant="muted" size="sm">
							{state.hard_delete_conversions ? 'Yes' : 'No'}
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
