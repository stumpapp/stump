import { View } from 'react-native'

import { FilterHeader } from '~/components/filter'

import { ISeriesFilterHeaderContext, SeriesFilterHeaderContext } from './context'
import Sort from './Sort'
import Status from './Status'

type Props = ISeriesFilterHeaderContext

export default function SeriesFilterHeader(context: Props) {
	return (
		<SeriesFilterHeaderContext.Provider value={context}>
			<FilterHeader>
				<Sort />
				<View className="w-2" />
				<Status />
			</FilterHeader>
		</SeriesFilterHeaderContext.Provider>
	)
}
