import { Breadcrumbs, Heading, Text } from '@stump/components'
import React from 'react'
import { Helmet } from 'react-helmet'

import SceneContainer from '@/components/SceneContainer'

import CreateBookClubForm from './CreateBookClubForm'

export default function CreateBookClubScene() {
	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | Create a book club</title>
			</Helmet>

			<header className="flex flex-col gap-y-1.5">
				<Breadcrumbs segments={[{ label: 'Book Clubs', to: '/book-clubs' }]} trailingSlash />
				<Heading size="lg" className="font-bold">
					Create
				</Heading>
				<Text size="sm" variant="muted">
					Start a new book club with your friends
				</Text>
			</header>

			<CreateBookClubForm />
		</SceneContainer>
	)
}
