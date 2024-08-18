import { useSmartListsQuery } from '@stump/client'
import {
	ButtonOrLink,
	Heading,
	Input,
	ProgressSpinner,
	ScrollArea,
	Text,
	usePreviousIsDifferent,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Search } from 'lucide-react'
import pluralize from 'pluralize'
import React, { useEffect, useState } from 'react'
import { useDebouncedValue } from 'rooks'

import { SceneContainer } from '@/components/container'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import SmartListCard from './SmartListCard'

// TODO: move filter to URL params

const LOCALE_BASE_KEY = `userSmartListsScene`
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

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

	const { lists, isLoading, isRefetching } = useSmartListsQuery({
		params: {
			search,
		},
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
			<ScrollArea className="w-full pr-3 md:w-2/3 lg:max-w-xl">
				<div className="flex-col divide-y divide-edge">
					{smartLists.map((list) => (
						<SmartListCard key={list.id} list={list} />
					))}
				</div>
			</ScrollArea>
		)
	}

	// TODO: move header to a layout for the smart list router
	// TODO: can't decide if I like the border-b
	return (
		<>
			<header className="flex h-32 w-full flex-col justify-center gap-y-2 border-b border-edge px-4">
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
				<div className="sticky top-0 z-10 min-h-10 bg-background py-2 backdrop-blur-sm">
					<div className="flex w-full flex-row items-center justify-between gap-x-2 pr-3 md:w-2/3 lg:max-w-xl">
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
							className="pointer-events-none h-full shrink-0"
							disabled
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
