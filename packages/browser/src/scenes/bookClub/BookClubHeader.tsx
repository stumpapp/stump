import { Avatar, Card, cn, Heading, Text } from '@stump/components'
import { intlFormat } from 'date-fns'
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
			<Card className="gap-4 p-2.5 flex items-center justify-between">
				<Text size="sm" variant="muted">
					Created by
				</Text>

				<div className="gap-2 flex items-center">
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
				'gap-4 p-4 md:flex-row md:items-start md:justify-between md:gap-0 flex w-full flex-col',
				{
					'mx-auto': preferTopBar && !!layoutMaxWidthPx,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="gap-1 md:max-w-xl flex flex-col">
				<Heading>{name}</Heading>
				{/* TODO: read more text for long descriptions... */}
				<Text size="md" variant="muted">
					{description}
				</Text>

				<div className="mt-2">
					<Text size="sm">
						<b>{membersCount}</b> {pluralize(roleSpec['MEMBER'], membersCount)} • Created{' '}
						<b>{intlFormat(new Date(createdAt), { month: 'long', year: 'numeric' })}</b>
					</Text>
				</div>
			</div>

			{renderCreator()}
		</header>
	)
}
