import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'
import { Link } from '@/context'
import { usePaths } from '@/paths'

import {
	getHomeSectionId,
	homeArrangementQuery,
	useHomeArrangement,
	useHomeArrangementKey,
} from './arrangement'
import ContinueReadingMedia, { usePrefetchContinueReading } from './ContinueReading'
import NoLibraries from './NoLibraries'
import OnDeck, { usePrefetchOnDeck } from './OnDeck'
import RecentlyAddedMedia, { usePrefetchRecentlyAddedMedia } from './RecentlyAddedMedia'
import RecentlyAddedSeries, { usePrefetchRecentlyAddedSeries } from './RecentlyAddedSeries'

const query = graphql(`
	query HomeSceneQuery {
		numberOfLibraries
	}
`)

export const usePrefetchHomeScene = () => {
	const prefetchRecentMedia = usePrefetchRecentlyAddedMedia()
	const prefetchContinueReading = usePrefetchContinueReading()
	const prefetchRecentSeries = usePrefetchRecentlyAddedSeries()
	const prefetchOnDeck = usePrefetchOnDeck()

	const { sdk } = useSDK()
	const client = useQueryClient()
	const queryKey = useHomeArrangementKey()
	return async () => {
		const data = await client
			.fetchQuery({
				queryKey,
				queryFn: () => sdk.execute(homeArrangementQuery),
				staleTime: PREFETCH_STALE_TIME,
			})
			.catch(() => undefined)
		if (!data) return
		const prefetch = {
			continueReading: prefetchContinueReading,
			onDeck: prefetchOnDeck,
			recentlyAddedBooks: prefetchRecentMedia,
			recentlyAddedSeries: prefetchRecentSeries,
		}
		await Promise.all(
			data.me.preferences.homeArrangement.sections.map((section) => {
				const id = getHomeSectionId(section)
				return section.visible && id ? prefetch[id]() : undefined
			}),
		)
	}
}

// TODO: account for new accounts, i.e. no media at all
export default function HomeScene() {
	const { t } = useLocaleContext()
	const paths = usePaths()
	const { data: arrangement } = useHomeArrangement()
	const { sdk } = useSDK()
	const { data } = useSuspenseGraphQL(query, sdk.cacheKey('numberOfLibraries'))

	const helmet = (
		<Helmet>
			{/* Doing this so Helmet splits the title into an array, I'm not just insane lol */}
			<title>Stump | {'Home'}</title>
		</Helmet>
	)

	if (!data) {
		return null
	}

	const { numberOfLibraries } = data

	if (numberOfLibraries === 0) {
		return (
			<>
				{helmet}
				<NoLibraries />
			</>
		)
	}

	const sections = arrangement.me.preferences.homeArrangement.sections
	const components = {
		continueReading: ContinueReadingMedia,
		onDeck: OnDeck,
		recentlyAddedBooks: RecentlyAddedMedia,
		recentlyAddedSeries: RecentlyAddedSeries,
	}

	return (
		<SceneContainer className="gap-6 flex flex-col">
			{helmet}

			{sections.map((section) => {
				const id = getHomeSectionId(section)
				if (!id || !section.visible) return null
				const Component = components[id]
				return <Component key={id} />
			})}
			{!sections.some((section) => section.visible && getHomeSectionId(section)) && (
				<div className="space-y-2 py-6">
					<Text>{t('homeScene.allSectionsHidden')}</Text>
					<Link to={paths.settings('preferences')} className="text-primary underline">
						{t('homeScene.customizeHome')}
					</Link>
				</div>
			)}
			<div className="pb-5 sm:pb-0" />
		</SceneContainer>
	)
}
