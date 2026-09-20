import { useWindowDimensions } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { useColors } from '~/lib/constants'

type Props = {
	height?: number
}

export function BranchSplitSvg({ height = 52 }: Props) {
	const { width } = useWindowDimensions()

	const adjustedWidth = width - 32

	const colors = useColors()
	const cx = adjustedWidth / 2
	const lx = adjustedWidth * 0.25
	const rx = adjustedWidth * 0.75

	const leftPath = `M ${cx} 0 C ${cx} ${height * 0.6} ${lx} ${height * 0.4} ${lx} ${height}`
	const rightPath = `M ${cx} 0 C ${cx} ${height * 0.6} ${rx} ${height * 0.4} ${rx} ${height}`

	return (
		<Svg width={adjustedWidth} height={height}>
			<Path d={leftPath} stroke={colors.dots.inactive} strokeWidth={1.5} fill="none" />
			<Path d={rightPath} stroke={colors.dots.inactive} strokeWidth={1.5} fill="none" />
		</Svg>
	)
}
