import { parseGraphQLDecimal } from '@stump/client'
import { BookByIdQuery } from '@stump/graphql'
import { formatHumanDuration, formatNarrowDuration } from '@stump/i18n'
import { formatDistanceToNowStrict } from 'date-fns'
import { toOrdinal } from 'to-words'

import { DownloadedFile } from '~/components/localLibrary/types'
import { Card } from '~/components/ui'
import { useDisplay, useTranslate } from '~/lib/hooks'

export type CurrentProgressCardProps = {
	hidden: boolean
	showChapterTitle: boolean
	chapterTitle: string | undefined | null
	page: number | undefined | null
	totalPages: number | undefined | null
	percentage: number | undefined | null
	readingTimeSeconds: number | undefined | null
}

export function CurrentProgressCard({
	hidden,
	showChapterTitle,
	chapterTitle,
	page,
	totalPages,
	percentage,
	readingTimeSeconds,
}: CurrentProgressCardProps) {
	const { isTablet } = useDisplay()
	const { t, locale } = useTranslate()

	if (hidden) return

	const readingTime = readingTimeSeconds
		? isTablet
			? formatHumanDuration(readingTimeSeconds)
			: formatNarrowDuration(readingTimeSeconds, { locale })
		: t('common.unknown')

	return (
		<Card>
			{showChapterTitle && chapterTitle && (
				<Card.StatGroup>
					<Card.Stat label={t('common.chapter')} value={chapterTitle} />
				</Card.StatGroup>
			)}
			<Card.StatGroup>
				<Card.Stat
					label={t('common.page')}
					value={page ?? '??'}
					suffix={totalPages ? ` / ${totalPages}` : undefined}
				/>
				<Card.Stat label={t('common.completed')} value={percentage} suffix={'%'} />
				<Card.Stat label={t('common.readTime')} value={readingTime} />
			</Card.StatGroup>
		</Card>
	)
}

type LastFinishedCardProps = {
	hidden: boolean
	readthroughNumber?: number
	lastCompletedAt: string | undefined | null | unknown
	readingTimeSeconds: number | undefined | null
}

export function LastFinishedCard({
	hidden,
	readthroughNumber,
	lastCompletedAt,
	readingTimeSeconds,
}: LastFinishedCardProps) {
	const { isTablet } = useDisplay()
	const { t, locale } = useTranslate()

	if (hidden) return

	const readingTime = readingTimeSeconds
		? isTablet
			? formatHumanDuration(readingTimeSeconds)
			: formatNarrowDuration(readingTimeSeconds, { locale })
		: t('common.unknown')

	const lastCompletedDistance =
		typeof lastCompletedAt === 'string'
			? formatDistanceToNowStrict(new Date(lastCompletedAt), { addSuffix: true })
			: t('common.unknown')

	return (
		<Card>
			<Card.StatGroup>
				{readthroughNumber && readthroughNumber > 1 && (
					<Card.Stat label={t('common.readthrough')} value={toOrdinal(readthroughNumber)} />
				)}
				<Card.Stat label={t('common.finished')} value={lastCompletedDistance} />
				<Card.Stat label={t('common.readTime')} value={readingTime} />
			</Card.StatGroup>
		</Card>
	)
}

type ActiveReadingSession = NonNullable<
	NonNullable<Pick<NonNullable<BookByIdQuery['mediaById']>, 'readProgress'>>['readProgress']
>

export function getPercentage({
	readProgress,
	totalPages,
}: {
	readProgress: ActiveReadingSession | DownloadedFile['readProgress'] | null
	totalPages: number | undefined | null
}) {
	if (!readProgress) return

	let fraction: number | undefined | null

	if ('percentageCompleted' in readProgress) {
		fraction =
			parseGraphQLDecimal(readProgress.percentageCompleted) ??
			parseGraphQLDecimal(readProgress.locator?.locations?.totalProgression)
	} else if ('percentage' in readProgress && readProgress.percentage) {
		fraction = parseFloat(readProgress.percentage)
	}

	fraction ??= readProgress.page && totalPages ? readProgress.page / totalPages : undefined

	if (fraction == undefined) return

	return Math.max(0, Math.min(100, Math.round(fraction * 100)))
}
