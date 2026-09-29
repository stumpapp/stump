import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { useMemo } from 'react'
import { View } from 'react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { Card, Progress, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../../image'

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

	const durationText = formatHumanDuration(data.elapsedSeconds ?? 0)
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

	if (!data.media) return null

	return (
		<Card>
			<Card.Row className="gap-2.5 flex-row">
				<View className="gap-3 flex-1">
					<ThumbnailImage
						source={{
							uri: data.media.thumbnail?.url,
						}}
						size={{ height: 115 / thumbnailRatio, width: 115 }}
						placeholderData={data.media.thumbnail.metadata}
						borderAndShadowStyle={{ shadowRadius: 5 }}
					/>

					<View className="w-full items-center justify-center">
						<Progress
							className="h-2.5"
							value={parseGraphQLPercentageDecimal(data.endPercentage) ?? 0}
							trackClassName="bg-black/10"
							indicatorClassName="bg-white/70"
						/>
					</View>

					{/*TODO: i think the phrasing here is not quite right, but maybe just me. im
					wondering if something more along the lines of this might work:
					- You read pages 1-10 between 12:00 PM and 12:30 PM
					- You read page 23 between 1:00 PM and 1:15 PM
					maybe it's just the word `spent` when used with time range that feels a little off.
					separately, page range will be tricky because _technically_ can go backwards,
					and seeing "read pages 10-5" is not my fav. "from 10 to 5" makes it feel better
					*/}
					<TemplatedTranslationText
						className="text-foreground-muted text-center"
						fakeTranslation={fakeTranslation}
						values={{
							TIME_RANGE: timeRange,
							START_PAGE: startPageFragment,
							END_PAGE: endPageFragment,
						}}
					/>
				</View>

				<View className="bg-black/10 dark:bg-white/10 h-full w-px shrink-0" />

				<View className="gap-4 px-2 flex flex-1 items-start">
					<Text size="lg">{t('readingSessions.pagesRead', { count: pagesRead })}</Text>
					<Text size="lg">{durationText}</Text>
					{data.chaptersRead.length > 0 && (
						<Text size="lg">
							{t('readingSessions.chaptersRead', { count: data.chaptersRead.length })}
						</Text>
					)}
				</View>
			</Card.Row>
		</Card>
	)
}
