import { useSuspenseGraphQL } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { STAT_COLORS, StatCard, StatCardProps } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Book, HardDrive, Layers, Library } from 'lucide-react'

import { useTheme } from '@/hooks/useTheme'

const query = graphql(`
	query ServerStats {
		numberOfLibraries
		numberOfSeries
		mediaCount
		mediaDiskUsage
	}
`)

export default function ServerStats() {
	const { data } = useSuspenseGraphQL(query, ['serverStats'])
	const { isDarkVariant } = useTheme()

	const diskUsage = formatBytesSeparate(data.mediaDiskUsage)

	const stats: StatCardProps[] = [
		{
			label: 'Libraries',
			value: data.numberOfLibraries,
			icon: Library,
			colors: STAT_COLORS.system,
			countUp: true,
		},
		{
			label: 'Series',
			value: data.numberOfSeries,
			icon: Layers,
			colors: STAT_COLORS.series,
			countUp: true,
		},
		{
			label: 'Books',
			value: data.mediaCount,
			icon: Book,
			colors: STAT_COLORS.books,
			countUp: true,
		},
		...(diskUsage
			? [
					{
						label: 'Disk usage',
						value: diskUsage.value,
						suffix: diskUsage.unit,
						icon: HardDrive,
						colors: STAT_COLORS.size,
						countUp: true,
					},
				]
			: []),
	]

	return (
		<div className="gap-2 sm:grid-cols-4 grid grid-cols-2">
			{stats.map((stat, index) => (
				<StatCard key={index} {...stat} isDark={isDarkVariant} />
			))}
		</div>
	)
}
