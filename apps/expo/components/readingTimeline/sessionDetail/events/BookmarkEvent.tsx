import { parseGraphQLDateTime } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Bookmark } from 'lucide-react-native'

import { TemplatedTranslationText } from '~/components/TemplatedTranslationText'
import { useTranslate } from '~/lib/hooks'

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
	showTopConnector?: boolean
	showBottomConnector?: boolean
}

export function BookmarkEvent({
	fragmentRef,
	showTopConnector = true,
	showBottomConnector = true,
}: Props) {
	const { t } = useTranslate()
	const data = useFragment(fragment, fragmentRef)

	const bookmarkedPage =
		data.page && data.page > 0 ? data.page : (data.bookmarkLocator?.locations?.position ?? '??')

	const fakeTranslation = t('readingSessions.bookmarkSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})

	return (
		<EventTimelineRow
			icon={{ as: Bookmark, size: 'sm' }}
			timestamp={parseGraphQLDateTime(data.createdAt) ?? new Date()}
			showTopConnector={showTopConnector}
			showBottomConnector={showBottomConnector}
		>
			<TemplatedTranslationText
				className="text-foreground-muted"
				fakeTranslation={fakeTranslation}
				values={{
					PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: bookmarkedPage }),
				}}
			/>
		</EventTimelineRow>
	)
}
