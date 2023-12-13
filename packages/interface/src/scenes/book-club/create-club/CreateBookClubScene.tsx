import { Breadcrumbs, Divider, Heading, Text } from '@stump/components'
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

			<Breadcrumbs
				segments={[{ label: 'Book Clubs', to: '/book-clubs' }, { label: 'Create a club' }]}
			/>

			<div className="h-4" />
			<Heading>Create a new book club</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				You can create a private book club a select few, or make it public for anyone on the server
				to join
			</Text>
			<Divider variant="muted" className="mt-3.5" />

			<CreateBookClubForm />
		</SceneContainer>
	)
}
