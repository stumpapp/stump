import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { useMemo } from 'react'
import { View } from 'react-native'

import { Card, Progress, Text } from '~/components/ui'
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
	const data = useFragment(fragment, fragmentRef)
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const durationText = formatHumanDuration(data.elapsedSeconds ?? 0)

	const timeRange = `${intlFormat(data.createdAt, {
		hour: 'numeric',
		minute: 'numeric',
	})} - ${intlFormat(data.updatedAt, {
		hour: 'numeric',
		minute: 'numeric',
	})}`

	const startPage = data.startPage ?? data.startLocator?.locations?.position ?? '??'
	const endPage = data.endPage ?? data.endLocator?.locations?.position ?? '??'

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
					<Text className="text-foreground-muted text-sm text-center">
						You spent <Text className="font-medium text-foreground">{timeRange}</Text> reading{' '}
						{endPage !== startPage && 'from '}
						<Text className="font-medium text-foreground">page {startPage}</Text>
						{endPage !== startPage && (
							<>
								{'to '}
								<Text className="font-medium text-foreground">page {endPage}</Text>
							</>
						)}
					</Text>
				</View>

				<View className="bg-black/10 dark:bg-white/10 h-full w-px shrink-0" />

				<View className="gap-4 flex flex-1 items-start">
					<Text className="text-lg">{pagesRead} page read</Text>
					<Text className="text-lg">{durationText}</Text>
				</View>
			</Card.Row>
		</Card>
	)
}
