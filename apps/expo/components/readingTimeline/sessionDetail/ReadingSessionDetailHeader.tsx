import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatHumanDurationSeparate } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { useMemo } from 'react'
import { View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../../image'
import { SessionProgressBar } from '../SessionProgressBar'

const fragment = graphql(`
	fragment ReadingSessionDetailHeader on ReadingSession {
		id
		startPage
		endPage
		startLocator {
			locations {
				position
			}
		}
		endLocator {
			locations {
				position
			}
		}
		startPercentage
		endPercentage
		createdAt
		updatedAt
		elapsedSeconds
		chaptersRead
		media {
			thumbnail {
				url
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
			}
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function ReadingSessionDetailHeader({ fragmentRef }: Props) {
	const { t } = useTranslate()

	const data = useFragment(fragment, fragmentRef)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const durationText = formatHumanDurationSeparate(data.elapsedSeconds ?? 0, {
		significantUnits: 2,
	})
	// TODO: this is really awkward in that you could:
	// - start session, read for 30 seconds, exit reader
	// - come back minutes before the session lapses, add an annotation
	// - exit reader, let session lapse
	// and this would read e.g. "1 minute 4 seconds" while the timeline shows e.g.:
	// - 2:19 PM - opened book at page foo
	// - 2:32 PM - added annotation at page biz
	// - 2:32 PM - closed book at page biz
	// it's kinda just a limitation of active reading time vs how granular session events are. by design
	// they are extendable with the grace period / offset preferences, but this def hsows a bit
	// of an awkward point. it's probably fine, i'm likely overthinking it. it is a weird disconnect
	// on the ui tho

	const timeRange = `${intlFormat(data.createdAt, {
		hour: 'numeric',
		minute: 'numeric',
	})} - ${intlFormat(data.updatedAt, {
		hour: 'numeric',
		minute: 'numeric',
	})}`

	const startPage = data.startPage ?? data.startLocator?.locations?.position ?? '??'
	const endPage = data.endPage ?? data.endLocator?.locations?.position ?? '??'

	const startPageFragment = t('readingSessions.pageFragment', { page: startPage })
	const endPageFragment = t('readingSessions.pageFragment', { page: endPage })

	const localeKey =
		endPage !== startPage
			? 'readingSessions.sessionSentence.pageRange'
			: 'readingSessions.sessionSentence.singlePage'
	const fakeTranslation = t(localeKey, {
		timeRange: 'TIME_RANGE',
		startPageFragment: 'START_PAGE',
		endPageFragment: 'END_PAGE',
	})

	const pagesRead = useMemo(() => {
		if (typeof startPage === 'string' && typeof endPage === 'string') return '??'
		if (startPage === endPage) return 1
		if (typeof startPage === 'number' && typeof endPage === 'number') {
			return Math.abs(endPage - startPage)
		}
		return '??'
	}, [startPage, endPage])

	const chaptersRead = Math.max(0, data.chaptersRead.length - 1)

	if (!data.media) return null

	return (
		<Card>
			<Card.Row className="gap-4 flex-col">
				<View className="gap-2.5 flex-row items-start">
					<View className="flex-1">
						<ThumbnailImage
							source={{
								uri: data.media.thumbnail?.url,
							}}
							size={{ height: 175, width: 175 * thumbnailRatio }}
							placeholderData={data.media.thumbnail.metadata}
							borderAndShadowStyle={{ shadowRadius: 5 }}
						/>
					</View>

					<View className="gap-3 flex-1 items-start justify-between">
						{/*TODO(reading-timeline): localizing this will be a bit tricky:
						- curretnly opinionated on order (value then suffix)
						- some langs are not in that order
						i think maybe the TemplatedTranslationText can serve as an example here where
            we extract the value from the translated sentence and render it in the correct order
            for now just leaving as todo
						*/}
						<View className="squircle py-2 px-4 gap-2 bg-black/5 dark:bg-white/10 w-full flex-col items-start rounded-[1.25rem]">
							<StatText value={pagesRead} suffix={' pages read'} />
							{/* TODO: might be too wide for larger numbers */}
							<Text>
								{durationText.map((d, i) => (
									<StatText key={i} value={d.value} suffix={d.unit} />
								))}
							</Text>
							<StatText value={chaptersRead} suffix={' chapters finished'} />
						</View>

						<TemplatedTranslationText
							className="text-foreground-muted px-1"
							fakeTranslation={fakeTranslation}
							values={{
								TIME_RANGE: timeRange,
								START_PAGE: startPageFragment,
								END_PAGE: endPageFragment,
							}}
						/>
					</View>
				</View>

				<SessionProgressBar
					startPercentage={parseGraphQLPercentageDecimal(data.startPercentage) ?? 0}
					endPercentage={parseGraphQLPercentageDecimal(data.endPercentage) ?? 0}
				/>
			</Card.Row>
		</Card>
	)
}

function StatText({ value, suffix }: { value: number | string; suffix: string }) {
	return (
		<Text size="xl" className="font-extrabold text-center">
			{value}
			<Text size="sm" className="font-bold text-foreground-muted text-center">
				{suffix}
			</Text>
		</Text>
	)
}
