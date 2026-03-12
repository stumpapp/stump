import { View } from 'react-native'
import Svg, { Line } from 'react-native-svg'

import { useColors } from '~/lib/constants'

export const DottedLine = ({ inverted }: { inverted?: boolean }) => {
	const colors = useColors()
	return (
		<View className="flex-1">
			<Svg height="2" width="100%">
				<Line
					x1={inverted ? '100%' : '0'}
					y1="1"
					x2={inverted ? '0' : '100%'}
					y2="1"
					stroke={colors.edge.DEFAULT}
					strokeWidth="1.5"
					strokeDasharray="6,4"
					strokeLinecap="round"
				/>
			</Svg>
		</View>
	)
}
