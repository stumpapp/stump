import { LibraryPattern } from '@stump/graphql'
import pluralize from 'pluralize'
import { useFormContext, useWatch } from 'react-hook-form'
import { match } from 'ts-pattern'

import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate'
import { ReviewItem, ReviewSection } from '@/components/steppedForm'
import { useTranslate } from '@/hooks/useTranslate'

export default function LibraryReview() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const state = useWatch({ control: form.control })

	const { t, translate } = useTranslate()

	const renderThumbnailSettings = () => {
		if (!state.thumbnailConfig?.enabled || !state.thumbnailConfig?.resizeMethod) {
			return (
				<>
					<ReviewItem
						label={t(getLabelKey('generateThumbnails'))}
						value={translate('shared.common.no')}
					/>

					<ReviewItem
						label={t(getLabelKey('processThumbnailColors'))}
						value={
							state.processThumbnailColorsEvenWithoutConfig
								? translate('shared.common.yes')
								: translate('shared.common.no')
						}
					/>
				</>
			)
		}

		const dimensionUnit =
			state.thumbnailConfig.resizeMethod.mode === 'scaleEvenlyByFactor' ? 'x' : 'px'

		const renderResizeModeDetails = () =>
			match(state.thumbnailConfig?.resizeMethod)
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
				<ReviewItem
					label={t(getLabelKey('generateThumbnails'))}
					value={translate('shared.common.yes')}
				/>

				<ReviewItem
					label={t(getLabelKey('mode'))}
					value={`${t(
						getLabelKey(state.thumbnailConfig.resizeMethod.mode || 'scaleEvenlyByFactor'),
					)} (${renderResizeModeDetails()})`}
				/>

				<ReviewItem label={t(getLabelKey('format'))} value={state.thumbnailConfig.format} />

				<ReviewItem
					label={t(getLabelKey('quality'))}
					value={state.thumbnailConfig.quality || 'Default'}
				/>

				<ReviewItem
					label={t(getLabelKey('processThumbnailColors'))}
					value={translate('shared.common.yes')}
				/>
			</>
		)
	}

	return (
		<>
			<ReviewSection stepIndex={0}>
				<ReviewItem label={t(getLabelKey('name'))} value={state.name} />
				<ReviewItem label={t(getLabelKey('path'))} value={state.path} />
				<ReviewItem label={t(getLabelKey('oneshotsDirectory'))} value={state.oneshotsDirectory} />
				<ReviewItem label={t(getLabelKey('description'))} value={state.description} />
				<ReviewItem
					label={t(getLabelKey('tags'))}
					value={
						state.tags?.length ? (
							<span className="gap-1 flex flex-wrap">
								{state.tags.map(({ label }, index) => (
									<span key={index}>#{label}</span>
								))}
							</span>
						) : undefined
					}
				/>
			</ReviewSection>

			<ReviewSection stepIndex={1}>
				<ReviewItem
					label={t(getLabelKey('pattern'))}
					value={t(
						state.libraryPattern === LibraryPattern.CollectionBased
							? getPatternKey('COLLECTION_BASED')
							: getPatternKey('SERIES_BASED'),
					)}
				/>

				<ReviewItem
					label={t(getLabelKey('ignoreRules'))}
					value={
						state.ignoreRules?.length
							? `${state.ignoreRules.length} ${pluralize('rule', state.ignoreRules.length)}`
							: undefined
					}
				/>

				<ReviewItem
					label={t(getLabelKey('processMetadata'))}
					value={
						state.processMetadata ? translate('shared.common.yes') : translate('shared.common.no')
					}
				/>

				<ReviewItem
					label={t(getLabelKey('watch'))}
					value={state.watch ? translate('shared.common.yes') : translate('shared.common.no')}
				/>

				<ReviewItem
					label={t(getLabelKey('generateFileHashes'))}
					value={
						state.generateFileHashes
							? translate('shared.common.yes')
							: translate('shared.common.no')
					}
				/>

				<ReviewItem
					label={t(getLabelKey('generateKoreaderHashes'))}
					value={
						state.generateKoreaderHashes
							? translate('shared.common.yes')
							: translate('shared.common.no')
					}
				/>

				<ReviewItem
					label={t(getLabelKey('convertRar'))}
					value={
						state.convertRarToZip ? translate('shared.common.yes') : translate('shared.common.no')
					}
				/>

				<ReviewItem
					label={t(getLabelKey('deleteConversions'))}
					value={
						state.hardDeleteConversions
							? translate('shared.common.yes')
							: translate('shared.common.no')
					}
				/>
			</ReviewSection>

			<ReviewSection stepIndex={2}>{renderThumbnailSettings()}</ReviewSection>
		</>
	)
}

const LOCALE_KEY = 'createLibraryScene.form'
const getPatternKey = (key: string) =>
	`createOrUpdateLibraryForm.fields.organization.filesystemPattern.${key}.label`
const getKey = (key: string) => `${LOCALE_KEY}.review.${key}`
const getLabelKey = (key: string) => getKey(`labels.${key}`)
