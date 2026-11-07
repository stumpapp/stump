import { useGraphQL } from '@stump/client'
import { NewCard } from '@stump/components'
import { graphql } from '@stump/graphql'

import { useTranslate } from '@/hooks/useTranslate'

const query = graphql(`
	query ReadingStatsStreaks {
		myReadingStreaks {
			currentDays
			longestDays
		}
	}
`)

export default function Streaks() {
	const { translate } = useTranslate()
	const { data } = useGraphQL(query, ['readingStatsStreaks'])

	const streaks = data?.myReadingStreaks

	if (!streaks) return null

	return (
		<NewCard>
			<NewCard.StatGroup>
				<NewCard.Stat
					label={translate('shared.readingStats.streaks.current')}
					value={translate('shared.common.time.daysCount', { count: streaks.currentDays })}
				/>
				<NewCard.Stat
					label={translate('shared.readingStats.streaks.longest')}
					value={translate('shared.common.time.daysCount', { count: streaks.longestDays })}
				/>
			</NewCard.StatGroup>
		</NewCard>
	)
}
