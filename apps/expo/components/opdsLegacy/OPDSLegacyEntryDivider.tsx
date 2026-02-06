import { View } from 'react-native'

import { useOPDSPreferencesStore } from '~/stores'

import { Divider } from '../Divider'

export default function OPDSLegacyEntryDivider() {
	const layout = useOPDSPreferencesStore((state) => state.layout)

	if (layout === 'grid') {
		return <View className="h-4" />
	} else {
		return <Divider />
	}
}
