import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { formatNarrowDuration } from '@stump/i18n'

import { Card } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

const fragment = graphql(`
	fragment TimeToFinishStats on ReadingStats {
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

export function TimeToFinishStats({ fragmentRef }: Props) {
	const { translate, locale } = useTranslate()

	const stats = useFragment(fragment, fragmentRef)

	if (!stats.timeToFinish.length) return null

	return (
		<Card label={translate('shared.readingStats.timeToFinish.title')}>
			{stats.timeToFinish.map((stat) => (
				<Card.Row
					key={stat.libraryType}
					label={translate(`shared.libraryType.${stat.libraryType}`)}
					description={translate('shared.readingStats.timeToFinish.books', {
						count: stat.sampleSize,
					})}
					value={formatNarrowDuration(stat.medianActiveSeconds, { significantUnits: 1, locale })}
				/>
			))}
		</Card>
	)
}
