import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatHumanDuration } from '@stump/i18n'
import { intlFormat } from 'date-fns'
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

	// const chaptersRead
	const pagesRead = data.endPage - data.startPage
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

					{/*TODO: if start page = end page do sm else? "you spent 30 min reading page 30" lol*/}
					<Text className="text-foreground-muted text-sm text-center">
						You spent <Text className="font-medium text-foreground">{timeRange}</Text> reading from{' '}
						<Text className="font-medium text-foreground">page {startPage}</Text> to{' '}
						<Text className="font-medium text-foreground">page {endPage}</Text>
					</Text>
				</View>

				<View className="bg-black/10 dark:bg-white/10 h-full w-px shrink-0" />

				<View className="flex-1" />
			</Card.Row>
		</Card>
	)
}
