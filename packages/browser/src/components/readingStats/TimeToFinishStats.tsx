import { NewCard } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatNarrowDuration } from '@stump/i18n'

import { useTranslate } from '@/hooks/useTranslate'

const fragment = graphql(`
	fragment ReadingStatsTimeToFinish on ReadingStats {
		timeToFinish {
			libraryType
			sampleSize
			medianActiveSeconds
		}
	}
`)

type Props = {
	fragmentRef: FragmentType<typeof fragment>
}

export default function TimeToFinishStats({ fragmentRef }: Props) {
	const { translate, locale } = useTranslate()

	const stats = useFragment(fragment, fragmentRef)

	if (!stats.timeToFinish.length) return null

	return (
		<NewCard label={translate('shared.readingStats.timeToFinish.title')}>
			{stats.timeToFinish.map((stat) => (
				<NewCard.Row
					key={stat.libraryType}
					label={translate(`shared.libraryType.${stat.libraryType}`)}
					description={translate('shared.readingStats.timeToFinish.books', {
						count: stat.sampleSize,
					})}
					value={formatNarrowDuration(stat.medianActiveSeconds, { significantUnits: 1, locale })}
				/>
			))}
		</NewCard>
	)
}
