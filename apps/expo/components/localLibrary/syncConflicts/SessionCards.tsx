import { parseGraphQLDateTime, parseGraphQLPercentageDecimal } from '@stump/client'
import { intlFormat } from 'date-fns'
import { Fragment } from 'react'
import { ScrollView, View } from 'react-native'
import { match } from 'ts-pattern'

import { epubProgress, type ImageMeta, readProgress } from '~/db'
import { useColors } from '~/lib/constants'
import { useDisplay, useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../../image'
import { Card, Text } from '../../ui'
import { AncestorSession, RemoteSession } from './types'

type LastCommonSessionCardProps = {
	session: AncestorSession | null
	bookName: string
	thumbnailPath?: string
	thumbnailData?: ImageMeta
}

export function LastCommonSessionCard({
	session,
	bookName,
	thumbnailPath,
	thumbnailData,
}: LastCommonSessionCardProps) {
	const { t } = useTranslate()
	const { isTablet } = useDisplay()

	const updatedAt = parseGraphQLDateTime(session?.updatedAt)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
	const thumbnailWidth = isTablet ? 72 : 64 // arbitrary by eye
	const thumbnailHeight = thumbnailWidth / thumbnailRatio

	return (
		<Card>
			<Card.Row>
				<ThumbnailImage
					// @ts-expect-error: shows placeholder when undefined
					source={{ uri: thumbnailPath }}
					size={{ width: thumbnailWidth, height: thumbnailHeight }}
					placeholderData={thumbnailData}
				/>
				<View className="gap-1 flex-1 justify-center">
					<Text className="font-semibold leading-tight" numberOfLines={2}>
						{bookName}
					</Text>

					{!session && (
						<Text size="xs" className="text-foreground-muted">
							{t('syncConflicts.noCommonSession')}
						</Text>
					)}

					{session && (
						<>
							<Text size="sm" className="text-foreground-muted">
								{t('syncConflicts.lastCommonSession')}
							</Text>

							{session && (
								<Text size="sm" className="text-foreground-muted">
									{formatNormalizedProgression(t, {
										page: session.endPage,
										chapter: session.endLocator?.chapterTitle,
										percentage: parseGraphQLPercentageDecimal(session.endPercentage),
									})}
								</Text>
							)}

							{updatedAt && (
								<Text size="sm" className="text-foreground-muted">
									{intlFormat(updatedAt, {
										month: 'short',
										day: 'numeric',
										hour: 'numeric',
										minute: 'numeric',
									})}
								</Text>
							)}
						</>
					)}
				</View>
			</Card.Row>
		</Card>
	)
}

type SourceSessionCardProps = {
	session: typeof readProgress.$inferSelect | RemoteSession
}

export function SourceSessionCard({ session }: SourceSessionCardProps) {
	const { t } = useTranslate()

	const normalizedProgression = match(session)
		.with({ __typename: 'ReadingSession' }, (remoteSession) => ({
			label: t('syncConflicts.remoteSessionWithId', { sessionId: remoteSession.id }),
			page: remoteSession.endPage,
			chapter: remoteSession.endLocator?.chapterTitle,
			percentage: parseGraphQLPercentageDecimal(remoteSession.endPercentage),
			updatedAt: parseGraphQLDateTime(remoteSession.updatedAt),
		}))
		.otherwise((localRecord) => ({
			label: t('syncConflicts.localSession'),
			page: localRecord.page,
			chapter: epubProgress.safeParse(localRecord.epubProgress).data?.chapterTitle,
			percentage: parseGraphQLPercentageDecimal(localRecord.percentage),
			updatedAt: localRecord.lastModified,
		}))

	return (
		<Card>
			<Card.Row>
				<View>
					<Text className="font-semibold text-foreground-muted mb-1">
						{normalizedProgression.label}
					</Text>

					<Text size="sm" className="text-foreground-muted">
						{formatNormalizedProgression(t, normalizedProgression)}
					</Text>

					{normalizedProgression.updatedAt && (
						<Text size="sm" className="text-foreground-muted mt-0.5">
							{intlFormat(normalizedProgression.updatedAt, {
								month: 'short',
								day: 'numeric',
								hour: 'numeric',
								minute: 'numeric',
							})}
						</Text>
					)}
				</View>
			</Card.Row>
		</Card>
	)
}

type RemoteSessionListProps = {
	sessions: RemoteSession[]
}

export function RemoteSessionList({ sessions }: RemoteSessionListProps) {
	const { t } = useTranslate()

	const colors = useColors()

	if (!sessions.length) {
		return (
			<View className="flex-1 items-center justify-center">
				<Text size="xs" className="text-foreground-muted opacity-50">
					{t('syncConflicts.noRemoteSessions')}
				</Text>
			</View>
		)
	}

	// TODO: not sure i love this (scroll), but fine for now since i don't expect many to be present but also
	// making the entire section above scroll felt wrong too
	return (
		<ScrollView showsVerticalScrollIndicator={false} className="flex-1">
			<View className="">
				{sessions.map((session, i) => (
					<Fragment key={session.id}>
						<SourceSessionCard session={session} />
						{i < sessions.length - 1 && (
							<View
								// im sure i fucked up math somewhere but it is slightly off center from
								// BranchSplitSvg, so neg margin
								className="h-4 -ml-0.5 w-[1.5] self-center"
								style={{ backgroundColor: colors.dots.inactive }}
							/>
						)}
					</Fragment>
				))}
			</View>
		</ScrollView>
	)
}

type NormalizedProgression = {
	page: number | null
	chapter: string | null
	percentage: number | null
}

function formatNormalizedProgression(
	t: (key: string, options?: Record<string, unknown>) => string,
	{ page, chapter, percentage }: Partial<NormalizedProgression>,
) {
	if (!page && !chapter && percentage == null) return null
	const progressParts = []
	if (chapter) progressParts.push(chapter)
	if (page) progressParts.push(t('common.pageX', { current: page }))

	const percentageSuffix = percentage != null ? ` (${Math.round(percentage)}%)` : ''

	return progressParts.join(', ') + percentageSuffix
}
