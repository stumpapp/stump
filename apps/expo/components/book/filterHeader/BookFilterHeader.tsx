import { View } from 'react-native'

import { ClearFilters, FilterHeader } from '~/components/filter'
import { useBookFilterStore } from '~/stores/filters'

import Characters from './Characters'
import { BookFilterHeaderContext, IBookFilterHeaderContext } from './context'
import Genres from './Genres'
import ReadStatus from './ReadStatus'
import Series from './Series'
import Sort from './Sort'
import Writers from './Writers'

// TODO: A LOT of these are largely duplicated logic, but different fields and
// queries (optionally). It would be good to generalize it at some point but I'm lazy
// When I support filtering inside of the sheets (like filter for character to select)
// then I'll try and do it

type Props = IBookFilterHeaderContext

// Note: The FlashList header doesn't seem to like Suspense
export default function BookFilterHeader(context: Props) {
	const clear = useBookFilterStore((state) => state.resetFilters)

	return (
		<BookFilterHeaderContext.Provider value={context}>
			<FilterHeader>
				<Sort />

				<View className="w-2" />
				<Characters />

				<View className="w-2" />
				<Genres />

				<View className="w-2" />
				<Series />

				<View className="w-2" />
				<ReadStatus />

				<View className="w-2" />
				<Writers />

				<View className="w-2" />
				<ClearFilters onPress={clear} />
			</FilterHeader>
		</BookFilterHeaderContext.Provider>
	)
}
