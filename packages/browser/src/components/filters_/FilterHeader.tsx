import { Badge, cn, Text, useSticky } from '@stump/components'
import React, { Fragment } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from '@/hooks/usePreferences'

import { AlphabetSelect } from './alphabet'
import Search from './Search'
import SmartFilterModal from './SmartFilterModal'
import SmartSearchButton from './SmartSearchButton'
import { useFilterStore, useSyncSearch } from './store'

type Props = {
	navOffset?: boolean
	// /**
	//  * The controls for adjusting the filters
	//  */
	// filterControls?: React.ReactNode
	/**
	 * The controls for adjusting the layout, i.e. GRID or TABLE
	 */
	layoutControls?: React.ReactNode
	/**
	 * Whether the search is being fetched from the server
	 */
	isSearching?: boolean
}

export default function FilterHeader({ navOffset, layoutControls, isSearching }: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const {
		preferences: { enable_alphabet_select },
	} = usePreferences()
	const { ref, isSticky } = useSticky({
		extraOffset: isMobile ? 56 : 0,
	})

	const store = useFilterStore((state) => ({
		bodyStore: state.bodyStore,
		urlStore: state.urlStore,
		mode: state.mode,
		patchBody: state.patchBody,
	}))
	const { updateSearch } = useSyncSearch()

	const renderLeft = () => {
		if (store.mode === 'body') {
			return (
				<>
					<SmartFilterModal
						initialValues={store.bodyStore.filters}
						onSave={({ filters: { groups } }) => store.patchBody({ filters: groups })}
					/>

					<Badge
						variant="primary"
						size="sm"
						className="flex cursor-pointer items-center justify-between space-x-1 pl-2 pr-1 opacity-95 hover:opacity-100"
					>
						<span>Order params</span>
						<span className="flex h-5 w-5 items-center justify-center rounded-md bg-fill-brand-secondary">
							2
						</span>
					</Badge>

					{store.bodyStore.totalCount != undefined && (
						<Text variant="muted" size="sm" className="pl-2">
							{store.bodyStore.totalCount} results
						</Text>
					)}
				</>
			)
		} else {
			const { urlStore } = store
			return (
				<>
					<Search
						initialValue={(urlStore.filters?.search as string) || ''}
						onChange={updateSearch}
						isLoading={isSearching}
					/>
				</>
			)
		}
	}

	return (
		<Fragment>
			<header
				ref={ref}
				className={cn(
					'sticky z-10 flex h-12 w-full shrink-0 justify-between gap-2 border-b border-edge px-4 md:top-0',
					{
						'bg-background': isSticky,
					},
					navOffset ? 'top-12' : 'top-0',
				)}
			>
				<div className="relative flex flex-1 items-center space-x-2">{renderLeft()}</div>

				<div className="flex items-center gap-4">
					<div className="flex items-center gap-x-1">
						<SmartSearchButton />

						{/* {orderControls} */}
						{/* {filterControls} */}
					</div>
					{layoutControls}
				</div>
			</header>

			{enable_alphabet_select && <AlphabetSelect />}
		</Fragment>
	)
}
