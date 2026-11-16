import { Breadcrumbs } from '@stump/components'

import { AppTitle } from '@/AppTitle'
import { SceneContainer } from '@/components/container'
import { RangedStats, Streaks } from '@/components/readingStats'
import { PageHeader } from '@/components/sharedLayout'
import { useTranslate } from '@/hooks/useTranslate'

export default function StatsScene() {
	const { translate } = useTranslate()

	const title = translate('shared.readingStats.title')

	return (
		<>
			<AppTitle title={title} />

			<PageHeader>
				<Breadcrumbs segments={[{ label: title }]} />
			</PageHeader>

			<SceneContainer className="gap-6 flex flex-1 flex-col">
				<div className="max-w-4xl">
					<Streaks />
				</div>
				<RangedStats />
				<div className="pb-5 sm:pb-0" />
			</SceneContainer>
		</>
	)
}
