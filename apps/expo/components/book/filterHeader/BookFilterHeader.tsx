import { Suspense } from 'react'
import { View } from 'react-native'

import { ClearFilters, FilterHeader } from '~/components/filter'

import Characters from './Characters'
import { BookFilterHeaderContext, IBookFilterHeaderContext } from './context'
import Genres from './Genres'
import ReadStatus from './ReadStatus'
import Series from './Series'
import Sort from './Sort'
import Writers from './Writers'
import { useBookFilterStore } from '~/stores/filters'

// TODO: A LOT of these are largely duplicated logic, but different fields and
// queries (optionally). It would be good to generalize it at some point but I'm lazy
// When I support filtering inside of the sheets (like filter for character to select)
// then I'll try and do it

type Props = IBookFilterHeaderContext

export default function BookFilterHeader(context: Props) {
	const clear = useBookFilterStore((state) => state.resetFilters)

	return (
		<BookFilterHeaderContext.Provider value={context}>
			<FilterHeader>
				<Sort />

				<View className="w-2" />
				<Suspense>
					<Characters />
				</Suspense>

				<View className="w-2" />
				<Suspense>
					<Genres />
				</Suspense>

				<View className="w-2" />
				<Suspense>
					<Series />
				</Suspense>

				<View className="w-2" />
				<ReadStatus />

				<View className="w-2" />
				<Suspense>
					<Writers />
				</Suspense>

				<View className="w-2" />
				<ClearFilters onPress={clear} />
			</FilterHeader>
		</BookFilterHeaderContext.Provider>
	)
}
