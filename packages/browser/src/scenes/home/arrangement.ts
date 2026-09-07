import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import {
	ArrangementSectionInput,
	FilterableArrangementEntity,
	graphql,
	HomeArrangementPreferencesQuery,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'

import { useUserStore } from '@/stores'

export const homeArrangementQuery = graphql(`
	query HomeArrangementPreferences {
		me {
			preferences {
				homeArrangement {
					sections {
						visible
						config {
							__typename
							... on InProgressBooks {
								name
								links
							}
							... on OnDeckBooks {
								name
							}
							... on RecentlyAdded {
								entity
								name
								links
							}
						}
					}
				}
			}
		}
	}
`)

const updateMutation = graphql(`
	mutation UpdateHomeArrangement($input: HomeArrangementInput!) {
		updateHomeArrangement(input: $input) {
			sections {
				visible
				config {
					__typename
					... on InProgressBooks {
						name
						links
					}
					... on OnDeckBooks {
						name
					}
					... on RecentlyAdded {
						entity
						name
						links
					}
				}
			}
		}
	}
`)

export type HomeSection =
	HomeArrangementPreferencesQuery['me']['preferences']['homeArrangement']['sections'][number]
export const HOME_SECTION_IDS = [
	'continueReading',
	'onDeck',
	'recentlyAddedBooks',
	'recentlyAddedSeries',
] as const
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number]

export function defaultHomeSections(): HomeSection[] {
	return [
		{ visible: true, config: { __typename: 'InProgressBooks', name: null, links: [] } },
		{ visible: true, config: { __typename: 'OnDeckBooks', name: null } },
		{
			visible: true,
			config: {
				__typename: 'RecentlyAdded',
				entity: FilterableArrangementEntity.Books,
				name: null,
				links: [],
			},
		},
		{
			visible: true,
			config: {
				__typename: 'RecentlyAdded',
				entity: FilterableArrangementEntity.Series,
				name: null,
				links: [],
			},
		},
	]
}

export function getHomeSectionId(section: HomeSection): HomeSectionId | undefined {
	const { config } = section
	switch (config.__typename) {
		case 'InProgressBooks':
			return 'continueReading'
		case 'OnDeckBooks':
			return 'onDeck'
		case 'RecentlyAdded':
			if (config.entity === FilterableArrangementEntity.Books) return 'recentlyAddedBooks'
			if (config.entity === FilterableArrangementEntity.Series) return 'recentlyAddedSeries'
	}
	return undefined
}

export function toHomeSectionInput({ config, visible }: HomeSection): ArrangementSectionInput {
	switch (config.__typename) {
		case 'InProgressBooks':
			return { visible, config: { inProgressBooks: { name: config.name, links: config.links } } }
		case 'OnDeckBooks':
			return { visible, config: { onDeckBooks: { name: config.name } } }
		case 'RecentlyAdded':
			return {
				visible,
				config: {
					recentlyAdded: { entity: config.entity, name: config.name, links: config.links },
				},
			}
		default:
			throw new Error('Unsupported home section')
	}
}

export function useHomeArrangementKey() {
	const { sdk } = useSDK()
	const userId = useUserStore((state) => state.user?.id)
	return sdk.cacheKey('homeArrangement', [userId])
}

export function useHomeArrangement() {
	return useSuspenseGraphQL(homeArrangementQuery, useHomeArrangementKey())
}

export function useUpdateHomeArrangement() {
	const client = useQueryClient()
	const queryKey = useHomeArrangementKey()
	return useGraphQLMutation(updateMutation, {
		onSuccess: async (data) => {
			// A background read started before the save must not replace its result.
			await client.cancelQueries({ queryKey, exact: true })
			client.setQueryData<HomeArrangementPreferencesQuery>(queryKey, {
				me: { preferences: { homeArrangement: { sections: data.updateHomeArrangement.sections } } },
			})
		},
	})
}
