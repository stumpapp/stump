import { useSuspenseGraphQL } from '@stump/client'
import { formatBytesSeparate } from '@stump/client'
import { Statistic } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'

const query = graphql(`
	query ServerStats {
		numberOfLibraries
		numberOfSeries
		mediaCount
		mediaDiskUsage
	}
`)

export default function ServerStats() {
	const { t } = useLocaleContext()
	const { data } = useSuspenseGraphQL(query, ['serverStats'])

	const stats = useMemo(
		() => ({
			seriesCount: data.numberOfSeries,
			bookCount: data.mediaCount,
			libraryCount: data.numberOfLibraries,
			diskUsage: formatBytesSeparate(data.mediaDiskUsage),
		}),
		[data],
	)

	return (
		<div className="max-w-xl gap-4 flex items-center justify-around divide-x divide-border">
			<Statistic className="pr-10">
				<Statistic.Label>
					{t('settingsScene.server/general.sections.stats.libraries')}
				</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.libraryCount)} />
			</Statistic>

			<Statistic className="px-10">
				<Statistic.Label>{t('settingsScene.server/general.sections.stats.series')}</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.seriesCount)} />
			</Statistic>

			<Statistic className="px-10">
				<Statistic.Label>{t('settingsScene.server/general.sections.stats.books')}</Statistic.Label>
				<Statistic.CountUpNumber value={Number(stats.bookCount)} />
			</Statistic>

			<Statistic className="pl-10">
				<Statistic.Label>
					{t('settingsScene.server/general.sections.stats.diskUsage')}
				</Statistic.Label>
				<Statistic.CountUpNumber
					unit={stats.diskUsage?.unit || 'B'}
					value={stats.diskUsage?.value || 0}
					decimal={true}
				/>
			</Statistic>
		</div>
	)
}
