import { Avatar, Card, cn, Heading, Text } from '@stump/components'
import dayjs from 'dayjs'
import pluralize from 'pluralize'

import { useBookClubContext } from '@/components/bookClub'
import { usePreferences } from '@/hooks'

export default function BookClubHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()
	const {
		bookClub: { creator, name, description, roleSpec, membersCount, createdAt },
	} = useBookClubContext()

	const renderCreator = () => {
		if (!creator.displayName) {
			return null
		}

		const displayName = creator.displayName
		const avatarUrl = creator.avatarUrl ?? undefined

		return (
			<Card className="flex items-center justify-between gap-4 p-2.5">
				<Text size="sm" variant="muted">
					Created by
				</Text>

				<div className="flex items-center gap-2">
					<Avatar src={avatarUrl} fallback={displayName} className="h-8 w-8" />
					<Text size="sm">{displayName}</Text>
				</div>
			</Card>
		)
	}

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	return (
		<header
			className={cn(
				'flex w-full flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:gap-0',
				{
					'mx-auto': preferTopBar && !!layoutMaxWidthPx,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="md:max-w-xl">
				<Heading>{name}</Heading>
				{/* TODO: read more text for long descriptions... */}
				<Text size="md">{description}</Text>

				<div className="mt-2">
					<Text size="sm">
						<b>{membersCount}</b> {pluralize(roleSpec['MEMBER'], membersCount)} • Created{' '}
						<b>{dayjs(createdAt).format('MMMM YYYY')}</b>
					</Text>
				</div>
			</div>

			{renderCreator()}
		</header>
	)
}
