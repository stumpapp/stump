import { ResponsivePie } from '@nivo/pie'
import { statsApi } from '@stump/api'
import { useQuery } from '@stump/client'

export default function BookFormatPieChart() {
	const data = useQuery(
		[],
		async () => {
			const { data } = await statsApi.getTopBookFormats()
			return data
		},
		{
			suspense: true,
		},
	)

	console.log(data)

	// TODO: ugh -> https://nivo.rocks/pie/
	return <div></div>
}
