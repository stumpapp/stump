import { LayoutEntity, useTopBarStore } from '@stump/client'
import { Heading } from '@stump/components'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

import MobileDrawer from '../sidebar/MobileDrawer'
import LayoutModeButtons from './LayoutModeButtons'
import QueryConfig from './query-options/QueryConfig'

// FIXME: this is not good AT ALL for mobile. It *looks* fine, but the navigation is gone, the
// sort/view mode buttons are gone, the sort config is gone,and the search bar is meh. I need to
// plan out the layout for mobile.
export default function TopBar() {
	const title = useTopBarStore(({ title }) => title)
	const location = useLocation()

	const { entity, showQueryParamOptions } = useMemo(() => {
		const match =
			location.pathname.match(/\/libraries\/.+$/) || location.pathname.match(/\/series\/.+$/)

		let _entity: LayoutEntity = 'SERIES'

		// TODO: what if not either of these?
		if (location.pathname.startsWith('/libraries')) {
			_entity = 'LIBRARY'
		}

		return {
			entity: _entity,
			showQueryParamOptions: !!match,
		}
	}, [location])

	return (
		<header className="sticky top-0 z-10 w-full border-b border-gray-50 bg-white px-4 py-2 dark:border-gray-900 dark:bg-gray-975 md:py-3">
			<div className="flex w-full items-center justify-between space-x-2">
				<div className="flex min-h-[2.5rem] flex-col justify-center">
					<MobileDrawer />
					<Heading
						size="xs"
						// noOfLines={1}
					>
						{title}
					</Heading>
				</div>

				{showQueryParamOptions && (
					<div className="flex items-center space-x-2">
						<LayoutModeButtons entity={entity} />
						<QueryConfig />
						{/* <OrderByConfig /> */}
					</div>
				)}
			</div>
		</header>
	)
}
