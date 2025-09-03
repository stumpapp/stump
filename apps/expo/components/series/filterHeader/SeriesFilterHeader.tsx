import { View } from 'react-native'

import { FilterHeader } from '~/components/filter'

import Sort from './Sort'

export default function SeriesFilterHeader() {
	return (
		<FilterHeader>
			<Sort />
			<View className="w-2" />
		</FilterHeader>
	)
}
