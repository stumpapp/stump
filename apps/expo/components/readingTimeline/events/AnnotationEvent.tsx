import { parseGraphQLDateTime } from '@stump/client'
import { AnnotationEventFragment, FragmentType, graphql, useFragment } from '@stump/graphql'
import { ChevronRight, Highlighter, PencilLine } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { Icon, Text } from '~/components/ui'

import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment AnnotationEvent on MediaAnnotation {
		id
		# page
		annotationText
		locator {
			href
			type
			chapterTitle
			locations {
				position
				progression
				totalProgression
			}
			text {
				highlight
				after
				before
			}
		}
		createdAt
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
	showTopConnector?: boolean
	showBottomConnector?: boolean
	onPress: (data: AnnotationEventFragment) => void
}

export function AnnotationEvent({
	fragmentRef,
	showTopConnector = true,
	showBottomConnector = true,
	onPress,
}: Props) {
	const data = useFragment(fragment, fragmentRef)

	return (
		<Pressable onPress={() => onPress(data)}>
			{({ pressed }) => (
				<EventTimelineRow
					icon={{ as: data.annotationText ? PencilLine : Highlighter, size: 'sm' }}
					timestamp={parseGraphQLDateTime(data.createdAt) ?? new Date()}
					style={pressed ? { opacity: 0.8 } : undefined}
					showTopConnector={showTopConnector}
					showBottomConnector={showBottomConnector}
				>
					<View className="gap-2 flex flex-1 flex-row items-center">
						<View className="gap-1.5 flex-1">
							<Text className="text-sm text-foreground-muted" numberOfLines={3}>
								&ldquo;{data.locator?.text?.highlight}&rdquo;
							</Text>
							{data.annotationText && (
								<Text className="text-foreground" numberOfLines={3}>
									{data.annotationText}
								</Text>
							)}
						</View>

						<Icon
							as={ChevronRight}
							size={18}
							strokeWidth={1.8}
							absoluteStrokeWidth
							className="text-foreground-muted ml-auto shrink-0 self-center opacity-90"
						/>
					</View>
				</EventTimelineRow>
			)}
		</Pressable>
	)
}
