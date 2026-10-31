import { useSuspenseGraphQL } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { STAT_COLORS, StatCard, StatCardProps } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Book, HardDrive, Layers, Library } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'
import { useTheme } from '@/hooks/useTheme'

const query = graphql(`
	query ServerStats {
		numberOfLibraries
		numberOfSeries
		mediaCount
		mediaDiskUsage
	}
`)

const getKey = (key: string) => `settingsScene.server/general.sections.stats.`+key

export default function ServerStats() {
	const { data } = useSuspenseGraphQL(query, ['serverStats'])
	const { isDarkVariant } = useTheme()
	const { t } = useTranslate()

	const diskUsage = formatBytesSeparate(data.mediaDiskUsage)

	const stats: StatCardProps[] = [
		{
			label: t(getKey('libraries')),
			value: data.numberOfLibraries,
			icon: Library,
			colors: STAT_COLORS.system,
			countUp: true,
		},
		{
			label: t(getKey('series')),
			value: data.numberOfSeries,
			icon: Layers,
			colors: STAT_COLORS.series,
			countUp: true,
		},
		{
			label: t(getKey('books')),
			value: data.mediaCount,
			icon: Book,
			colors: STAT_COLORS.books,
			countUp: true,
		},
		...(diskUsage
			? [
					{
						label: t(getKey('diskUsage')),
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
