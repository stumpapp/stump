import { View } from 'react-native'

import { ClearFilters, FilterHeader } from '~/components/filter'

import { ISeriesFilterHeaderContext, SeriesFilterHeaderContext } from './context'
import Sort from './Sort'
import Status from './Status'
import { useSeriesFilterStore } from '~/stores/filters'

type Props = ISeriesFilterHeaderContext

export default function SeriesFilterHeader(context: Props) {
	const clear = useSeriesFilterStore((state) => state.resetFilters)

	return (
		<SeriesFilterHeaderContext.Provider value={context}>
			<FilterHeader>
				<Sort />
				<View className="w-2" />
				<Status />

				<View className="w-2" />
				<ClearFilters onPress={clear} />
			</FilterHeader>
		</SeriesFilterHeaderContext.Provider>
	)
}
