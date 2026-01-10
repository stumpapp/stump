import { useGraphQLMutation } from '@stump/client'
import { CreateBookClubInput, graphql } from '@stump/graphql'
import { BookClubMemberRoleSpec } from '@stump/sdk'
import { Suspense, useCallback, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useNavigate } from 'react-router'

import {
	CreateOrUpdateBookClubSchema,
	defaultMemberSpec,
} from '@/components/bookClub/createOrUpdateForm/schema'
import { SceneContainer } from '@/components/container'
import { SteppedFormContext } from '@/components/steppedForm'
import SteppedFormSceneHeader from '@/components/steppedForm/SteppedFormSceneHeader'
import paths from '@/paths'

import CreateBookClubForm from './CreateBookClubForm'

const mutation = graphql(`
	mutation CreateBookClubScene($input: CreateBookClubInput!) {
		createBookClub(input: $input) {
			id
			slug
		}
	}
`)

export default function CreateBookClubScene() {
	const [formStep, setFormStep] = useState(1)

	const navigate = useNavigate()

	const { mutate: createClub } = useGraphQLMutation(mutation, {
		onSuccess: ({ createBookClub: { slug } }) => {
			// TODO: prefetch
			navigate(paths.bookClub(slug))
		},
	})

	/**
	 * A callback to handle the form submission. This function will create a new book club
	 * and navigate to the newly created club.
	 */
	const handleSubmit = useCallback(
		(data: CreateOrUpdateBookClubSchema) => {
			let memberRoleSpec: BookClubMemberRoleSpec | null = null
			// If any field of the member role spec is set, we need to set the whole thing
			// with the default values
			const setRoles = Object.values(data.memberRoleSpec ?? {}).filter(Boolean)
			if (setRoles.length) {
				memberRoleSpec = {
					...defaultMemberSpec,
					...data.memberRoleSpec,
				}
			}

			const payload: CreateBookClubInput = {
				...data,
				creatorHideProgress: data.creatorHideProgress ?? false,
				memberRoleSpec,
			}
			createClub({ input: payload })
		},
		[createClub],
	)

	return (
		<div className="relative flex flex-1 flex-col">
			<Helmet>
				<title>Stump | Create a book club</title>
			</Helmet>

			<SteppedFormContext.Provider
				value={{
					currentStep: formStep,
					localeBase: 'createBookClubScene',
					setStep: setFormStep,
					stepsBeforeReview: 3,
				}}
			>
				<SteppedFormSceneHeader />

				<SceneContainer>
					<div className="flex flex-col gap-12">
						<Suspense>
							<CreateBookClubForm onSubmit={handleSubmit} />
						</Suspense>
					</div>
				</SceneContainer>
			</SteppedFormContext.Provider>
		</div>
	)

	return null
}
