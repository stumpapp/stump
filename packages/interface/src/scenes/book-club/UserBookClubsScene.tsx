import { useBookClubsQuery } from '@stump/client'
import { ButtonOrLink, Card, cx, Heading, Text } from '@stump/components'
import { BookClub } from '@stump/types'
import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '../../components/SceneContainer'

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

	const renderBookClub = (bookClub: BookClub) => {
		return null
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
							className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6 lg:px-8"
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
