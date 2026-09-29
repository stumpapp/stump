import { parseGraphQLDateTime } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Bookmark } from 'lucide-react-native'

import { Text } from '~/components/ui'

import { EventTimelineRow } from './EventTimelineRow'

const fragment = graphql(`
	fragment BookmarkEvent on Bookmark {
		id
		page
		# conflicts with locator selection in other events, so renamed
		bookmarkLocator: locator {
			locations {
				position
			}
		}
		createdAt
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export function BookmarkEvent({ fragmentRef }: Props) {
	const data = useFragment(fragment, fragmentRef)

	const bookmarkedPage =
		data.page && data.page > 0 ? data.page : (data.bookmarkLocator?.locations?.position ?? '??')

	return (
		<EventTimelineRow
			icon={{ as: Bookmark }}
			timestamp={parseGraphQLDateTime(data.createdAt) ?? new Date()}
		>
			<Text className="text-foreground-muted">
				Bookmarked page <Text>{bookmarkedPage}</Text>
			</Text>
		</EventTimelineRow>
	)
}
