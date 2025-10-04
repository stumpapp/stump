import { View } from 'react-native'

import { ClearFilters, FilterHeader } from '~/components/filter'
import { useSeriesFilterStore } from '~/stores/filters'

import { ISeriesFilterHeaderContext, SeriesFilterHeaderContext } from './context'
import Sort from './Sort'
import Status from './Status'

type Props = ISeriesFilterHeaderContext

export default function SeriesFilterHeader(context: Props) {
	const clear = useSeriesFilterStore((state) => state.resetFilters)

	return (
		<SeriesFilterHeaderContext.Provider value={context}>
			<FilterHeader>
				<View className="w-[16]" />
				<Sort />
				<View className="w-2" />
				<Status />

				<View className="w-2" />
				<ClearFilters onPress={clear} />
				<View className="w-[16]" />
			</FilterHeader>
		</SeriesFilterHeaderContext.Provider>
	)
}
