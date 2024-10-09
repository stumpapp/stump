import { Pie } from '@nivo/pie'
import { statsApi } from '@stump/api'
import { useQuery } from '@stump/client'
import AutoSizer from 'react-virtualized-auto-sizer'

import { useChartColors } from '../useChartColors'

export default function BookFormatPieChart() {
	const { data } = useQuery(
		[],
		async () => {
			const { data } = await statsApi.getTopBookFormats()
			return data
		},
		{
			suspense: true,
		},
	)

	const {
		calendar: { legendColor },
		colors,
	} = useChartColors()

	// TODO: ugh -> https://nivo.rocks/pie/
	return (
		<div className="h-56 w-full">
			<AutoSizer>
				{({ height, width }) => (
					<Pie
						id="extension"
						value="count"
						height={height}
						width={width / 2}
						data={(data || []).map((d) => ({
							...d,
							extension: d.extension.toUpperCase(),
						}))}
						margin={{ bottom: 80, top: 40 }}
						colors={colors}
						innerRadius={0.5}
						padAngle={0.7}
						cornerRadius={3}
						activeOuterRadiusOffset={8}
						borderWidth={1}
						borderColor={{
							from: 'color',
							modifiers: [['darker', 0.2]],
						}}
						arcLinkLabelsSkipAngle={10}
						arcLinkLabelsTextColor={legendColor}
						arcLinkLabelsThickness={2}
						arcLinkLabelsColor={{ from: 'color' }}
						arcLabelsSkipAngle={10}
						arcLabelsTextColor={{
							from: 'color',
							modifiers: [['darker', 2]],
						}}
						defs={[
							{
								background: 'inherit',
								color: legendColor,
								id: 'dots',
								padding: 1,
								size: 4,
								stagger: true,
								type: 'patternDots',
							},
							{
								background: 'inherit',
								color: legendColor,
								id: 'lines',
								lineWidth: 6,
								rotation: -45,
								spacing: 10,
								type: 'patternLines',
							},
						]}
						fill={[
							{
								id: 'lines',
								match: {
									id: 'pdf',
								},
							},
							{
								id: 'lines',
								match: {
									id: 'cbr',
								},
							},
						]}
						legends={[
							{
								anchor: 'bottom',
								direction: 'row',
								effects: [
									{
										on: 'hover',
										style: {
											itemTextColor: legendColor,
										},
									},
								],
								itemDirection: 'left-to-right',
								itemHeight: 18,
								itemOpacity: 1,
								itemTextColor: '#999',
								itemWidth: 100,
								itemsSpacing: 0,
								justify: false,
								symbolShape: 'circle',
								symbolSize: 18,
								translateX: 0,
								translateY: 56,
							},
						]}
					/>
				)}
			</AutoSizer>
		</div>
	)
}
