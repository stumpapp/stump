import { parseGraphQLDateTime } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { ChevronRight, Highlighter, PencilLine } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'

import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment AnnotationEvent on MediaAnnotation {
		id
		# page
		annotationText
		locator {
			locations {
				position
			}
			text {
				highlight
			}
		}
		createdAt
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function AnnotationEvent({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)

	return (
		<EventTimelineRow
			icon={{ as: data.annotationText ? PencilLine : Highlighter }}
			timestamp={parseGraphQLDateTime(data.createdAt) ?? new Date()}
		>
			<View className="gap-2 flex w-full flex-row items-center justify-between">
				<View className="gap-1.5">
					<Text className="text-sm text-foreground-muted" numberOfLines={3}>
						&ldquo;{data.locator?.text?.highlight}&rdquo;
					</Text>
					{data.annotationText && (
						<Text className="text-foreground" numberOfLines={3}>
							{data.annotationText}
						</Text>
					)}
				</View>

				{/*FIXME: off screen*/}
				<Icon
					as={ChevronRight}
					size={18}
					strokeWidth={1.8}
					absoluteStrokeWidth
					className="text-foreground-muted shrink-0"
				/>
			</View>
		</EventTimelineRow>
	)
}
