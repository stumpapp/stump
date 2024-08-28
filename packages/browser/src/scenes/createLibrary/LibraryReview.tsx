import { Heading, Label, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import pluralize from 'pluralize'
import React, { PropsWithChildren } from 'react'
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
					<Label>Generate thumbnails</Label>
					<Text variant="muted" size="sm">
						No
					</Text>
				</div>
			)
		} else {
			const dimensionUnit = state.thumbnail_config.resize_options.mode === 'Scaled' ? 'x' : 'px'

			return (
				<>
					<div>
						<Label>Generate thumbnails</Label>
						<Text variant="muted" size="sm">
							Yes
						</Text>
					</div>

					<div>
						<Label>Mode</Label>
						<Text variant="muted" size="sm">
							{state.thumbnail_config.resize_options.mode} (
							{`${state.thumbnail_config.resize_options.width}${dimensionUnit}:${state.thumbnail_config.resize_options.height}${dimensionUnit}`}
							)
						</Text>
					</div>

					<div>
						<Label>Format</Label>
						<Text variant="muted" size="sm">
							{state.thumbnail_config.format}
						</Text>
					</div>

					<div>
						<Label>Quality</Label>
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
					<Label>Name</Label>
					<Text variant="muted" size="sm">
						{state.name}
					</Text>
				</div>

				<div>
					<Label>Path</Label>
					<Text variant="muted" size="sm">
						{state.path}
					</Text>
				</div>

				<div>
					<Label>Description</Label>
					<Text variant="muted" size="sm">
						{state.description || 'None'}
					</Text>
				</div>

				<div>
					<Label>Tags</Label>
					<div className="flex flex-wrap gap-1">
						{!state.tags?.length && (
							<Text variant="muted" size="sm">
								None
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
					<Label>Pattern</Label>
					<Text variant="muted" size="sm">
						{state.library_pattern === 'COLLECTION_BASED'
							? t(getPatternKey('collectionPriority.label'))
							: t(getPatternKey('seriesPriority.label'))}
					</Text>
				</div>

				<div>
					<Label>Ignore rules</Label>
					<div className="flex flex-wrap gap-1">
						{!state.ignore_rules?.length && (
							<Text variant="muted" size="sm">
								None
							</Text>
						)}
						{!!state.ignore_rules?.length && (
							<Text variant="muted" size="sm">
								{state.ignore_rules.length} {pluralize('rule', state.ignore_rules.length)}
							</Text>
						)}
					</div>

					<div>
						<Label>Convert RAR/CBR</Label>
						<Text variant="muted" size="sm">
							{state.convert_rar_to_zip ? 'Yes' : 'No'}
						</Text>
					</div>

					<div>
						<Label>Delete converted files</Label>
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
const getPatternKey = (key: string) => `createOrUpdateLibraryForm.fields.libraryPattern.${key}`
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.steps.${step - 1}.${key}`

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
