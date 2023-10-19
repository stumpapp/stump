import { useBookClubsQuery } from '@stump/client'
import { Heading } from '@stump/components'
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
			all: false,
		},
	})

	const renderBookClub = (bookClub: BookClub) => {
		return null
	}

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | Book Clubs</title>
			</Helmet>

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
		</SceneContainer>
	)
}
