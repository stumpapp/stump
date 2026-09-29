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
}

export function BookmarkEvent({ fragmentRef }: Props) {
	const { t } = useTranslate()
	const data = useFragment(fragment, fragmentRef)

	const bookmarkedPage =
		data.page && data.page > 0 ? data.page : (data.bookmarkLocator?.locations?.position ?? '??')

	const fakeTranslation = t('readingSessions.bookmarkSentence', {
		pageFragment: 'PAGE_FRAGMENT',
	})

	return (
		<EventTimelineRow
			icon={{ as: Bookmark }}
			timestamp={parseGraphQLDateTime(data.createdAt) ?? new Date()}
		>
			<TemplatedTranslationText
				className="text-foreground-muted text-center"
				fakeTranslation={fakeTranslation}
				values={{
					PAGE_FRAGMENT: t('readingSessions.pageFragment', { page: bookmarkedPage }),
				}}
			/>
		</EventTimelineRow>
	)
}
