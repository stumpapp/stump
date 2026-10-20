import { useGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'

import { useTranslate } from '~/lib/hooks'

import { Card } from '../ui'

const query = graphql(`
	query MyReadingStreaks {
		myReadingStreaks {
			currentDays
			longestDays
		}
	}
`)

export function Streaks() {
	const { translate } = useTranslate()
	const { data } = useGraphQL(query, ['myReadingStreaks'])

	const streaks = data?.myReadingStreaks

	if (!streaks) return null

	return (
		<Card>
			<Card.StatGroup>
				<Card.Stat
					label={translate('shared.readingStats.streaks.current')}
					value={translate('shared.common.time.daysCount', { count: streaks.currentDays })}
				/>
				<Card.Stat
					label={translate('shared.readingStats.streaks.longest')}
					value={translate('shared.common.time.daysCount', { count: streaks.longestDays })}
				/>
			</Card.StatGroup>
		</Card>
	)
}
