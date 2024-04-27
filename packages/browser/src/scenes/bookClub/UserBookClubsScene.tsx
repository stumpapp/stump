import { useBookClubsQuery } from '@stump/client'
import { ButtonOrLink, Card, cx, Heading, Text } from '@stump/components'
import { BookClub } from '@stump/types'
import dayjs from 'dayjs'
import pluralize from 'pluralize'
import React from 'react'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

import paths from '../../paths'

/**
 * A scene that displays all the book clubs the user is a member of
 */
export default function UserBookClubsScene() {
	const { bookClubs } = useBookClubsQuery({
		params: {
			// Only fetch book clubs that the user is a member of
			all: false,
		},
	})

	// TODO: redesign this, absolute yucky poopy
	const renderBookClub = (bookClub: BookClub) => {
		const currentlyReading = bookClub.schedule?.books?.find(
			(book) => dayjs(book.start_at).isBefore(dayjs()) && dayjs(book.end_at).isAfter(dayjs()),
		)
		const isActive = !!currentlyReading
		const membersCount = bookClub.members?.length ?? 0

		return (
			<>
				<div className="min-w-0">
					<div className="flex items-start gap-x-3">
						<Text size="sm" className="font-semibold leading-6">
							{bookClub.name}
						</Text>
						<p
							className={cx(
								{ 'bg-yellow-50 text-yellow-800 ring-yellow-600/20': !isActive },
								'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
							)}
						>
							{isActive ? 'Active' : 'Inactive'}
						</p>
					</div>
					<div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
						<Text className="whitespace-nowrap">{bookClub.description}</Text>
						<svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current">
							<circle cx={1} cy={1} r={1} />
						</svg>
						<p className="truncate">{pluralize('member', membersCount, true)}</p>
					</div>
				</div>
				<div className="flex flex-none items-center gap-x-4">
					<ButtonOrLink href={paths.bookClub(bookClub.id)} variant="secondary">
						Go to club
					</ButtonOrLink>
				</div>
			</>
		)
	}

	const renderContent = () => {
		if (!bookClubs?.length) {
			return (
				<Card className="flex items-center justify-center border-dashed p-6">
					<div className="flex flex-col items-center gap-3">
						{!bookClubs?.length && (
							<Heading size="xs">You are not a member of any book clubs</Heading>
						)}
						<ButtonOrLink href="explore" variant="secondary">
							Explore public book clubs
						</ButtonOrLink>
					</div>
				</Card>
			)
		}

		return (
			<>
				<Heading>Your clubs</Heading>
				<ul role="list" className="divide-y divide-gray-100">
					{bookClubs?.map((club) => (
						<li
							key={club.id}
							className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6 lg:px-8 dark:hover:bg-gray-900"
						>
							{renderBookClub(club)}
						</li>
					))}
				</ul>
			</>
		)
	}

	return (
		<SceneContainer
			className={cx({ 'flex h-full items-center justify-center': !bookClubs?.length })}
		>
			<Helmet>
				<title>Stump | Book Clubs</title>
			</Helmet>

			{renderContent()}
		</SceneContainer>
	)
}
