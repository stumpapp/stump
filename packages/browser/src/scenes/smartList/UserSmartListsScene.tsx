import { useGraphQL, useSDK } from '@stump/client'
import {
	ButtonOrLink,
	Heading,
	Input,
	ProgressSpinner,
	ScrollArea,
	Text,
	usePreviousIsDifferent,
} from '@stump/components'
import { graphql, SmartListsInput } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Search } from 'lucide-react'
import pluralize from 'pluralize'
import { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'

import { SceneContainer } from '@/components/container'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import SmartListCard from './SmartListCard'

// TODO: move filter to URL params
// TODO(ui): this scene lowkey ugly

const LOCALE_BASE_KEY = `userSmartListsScene`
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

const query = graphql(`
	query SmartListsWithSearch($input: SmartListsInput!) {
		smartLists(input: $input) {
			id
			creatorId
			description
			defaultGrouping
			filters
			joiner
			name
			visibility
			...SmartListCard
		}
	}
`)

export default function UserSmartListsScene() {
	const { t } = useLocaleContext()
	/**
	 * The local value state for the search input
	 */
	const [value, setValue] = useState<string>()
	/**
	 * The debounced value of the local value state
	 */
	const [debouncedValue] = useDebouncedValue(value, 500)

	const [search, setSearch] = useState<string>()

	const shouldUpdate = usePreviousIsDifferent(debouncedValue)

	/**
	 * An effect that updates the search state only when the debounced value *actually* changes
	 */
	useEffect(() => {
		if (shouldUpdate) {
			setSearch(debouncedValue)
		}
	}, [debouncedValue, setSearch, shouldUpdate])

	const { sdk } = useSDK()
	const {
		data: { smartLists: lists } = {},
		isLoading,
		isRefetching,
	} = useGraphQL(query, [sdk.cacheKeys.smartLists, search], {
		input: {
			search,
		} as SmartListsInput,
	})

	if (isLoading) {
		return null
	}

	const smartLists = lists ?? []

	const renderLists = () => {
		if (!smartLists.length) {
			return (
				<GenericEmptyState
					containerClassName="justify-start items-start pt-0 pl-1"
					contentClassName="text-left"
					title={t(withLocaleKey('list.emptyState.heading'))}
					subtitle={
						search
							? t(withLocaleKey('list.emptyState.noMatchesMessage'))
							: t(withLocaleKey('list.emptyState.noListsMessage'))
					}
				/>
			)
		}

		// TODO: prolly don't scrollarea on mobile... just scroll on the page
		return (
			<ScrollArea className="pr-3 md:w-2/3 lg:max-w-xl w-full">
				<div className="space-y-2 flex-col">
					{smartLists.map((list) => (
						<SmartListCard key={list.id} data={list} />
					))}
				</div>
			</ScrollArea>
		)
	}

	// TODO: move header to a layout for the smart list router
	// TODO: can't decide if I like the border-b
	return (
		<>
			<header className="h-32 gap-y-2 px-4 flex w-full flex-col justify-center border-b border-edge">
				<div>
					<Heading size="lg" bold>
						Smart lists
					</Heading>
					<Text>Your favorite searches and filters saved for easy access</Text>
				</div>

				<Text variant="muted" size="sm">
					You have access to {smartLists.length} smart {pluralize('list', smartLists.length)}
				</Text>
			</header>

			<SceneContainer className="relative h-full overflow-hidden">
				<div className="top-0 min-h-10 py-2 backdrop-blur-sm sticky z-10 bg-background">
					<div className="gap-x-2 pr-3 md:w-2/3 lg:max-w-xl flex w-full flex-row items-center justify-between">
						<Input
							placeholder={t(withLocaleKey('searchPlaceholder'))}
							variant="primary"
							leftDecoration={<Search className="h-4 w-4 text-foreground-muted" />}
							rightDecoration={isRefetching ? <ProgressSpinner size="sm" /> : null}
							className="h-9"
							fullWidth
							value={value}
							onChange={(e) => setValue(e.target.value)}
						/>

						<ButtonOrLink
							href={paths.smartListCreate()}
							variant="ghost"
							className="h-full shrink-0"
						>
							{t(withLocaleKey('buttons.createSmartList'))}
						</ButtonOrLink>
					</div>
				</div>

				{renderLists()}
			</SceneContainer>
		</>
	)
}
