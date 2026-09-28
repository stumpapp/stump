import { parseGraphQLPercentageDecimal } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { View } from 'react-native'

import { Card, Progress, Text } from '~/components/ui'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../../image'

const fragment = graphql(`
	fragment ReadingSessionDetailHeader on ReadingSession {
		id
		startPage
		endPage
		# startLocator
		# endLocator
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

	if (!data.media) return null

	return (
		<Card>
			<Card.Row className="gap-4 flex-row">
				<View className="gap-2 flex-1">
					<ThumbnailImage
						source={{
							uri: data.media.thumbnail?.url,
						}}
						size={{ height: 115 / thumbnailRatio, width: 115 }}
						placeholderData={data.media.thumbnail.metadata}
						borderAndShadowStyle={{ shadowRadius: 5 }}
					/>

					<View className="px-2 w-full items-center justify-center">
						<Progress
							className="h-2.5"
							value={parseGraphQLPercentageDecimal(data.endPercentage) ?? 0}
							trackClassName="bg-black/10"
							indicatorClassName="bg-white/70"
						/>
					</View>

					{/*todo: overview text*/}
				</View>

				<View className="my-3 bg-black/10 dark:bg-white/10 h-full w-px shrink-0" />

				<View className="flex-1" />
			</Card.Row>
		</Card>
	)
}
