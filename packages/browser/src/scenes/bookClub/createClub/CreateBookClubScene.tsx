import { useCreateBookClub } from '@stump/client'
import { Alert } from '@stump/components'
import { BookClubMemberRoleSpec, CreateBookClub } from '@stump/sdk'
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

export default function CreateBookClubScene() {
	const [formStep, setFormStep] = useState(1)

	// TODO(graphql): Fix me

	// const { create, error } = useCreateBookClub({
	// 	onSuccess: (club) => navigate(paths.bookClub(club.id)),
	// })
	// // TODO: APIError helper once merged
	// const createError = error?.message

	// const navigate = useNavigate()
	// /**
	//  * A callback to handle the form submission. This function will create a new book club
	//  * and navigate to the newly created club.
	//  */
	// const handleSubmit = useCallback(
	// 	(data: CreateOrUpdateBookClubSchema) => {
	// 		let member_role_spec: BookClubMemberRoleSpec | null = null
	// 		// if any field of the member role spec is set, we need to set the whole thing
	// 		// with the default values
	// 		const setRoles = Object.values(data.member_role_spec ?? {}).filter(Boolean)
	// 		if (setRoles.length) {
	// 			member_role_spec = {
	// 				...defaultMemberSpec,
	// 				...data.member_role_spec,
	// 			}
	// 		}

	// 		const payload: CreateBookClub = {
	// 			...data,
	// 			member_role_spec,
	// 		}
	// 		create(payload)
	// 	},
	// 	[create],
	// )

	// return (
	// 	<div className="relative flex flex-1 flex-col">
	// 		<Helmet>
	// 			<title>Stump | Create a book club</title>
	// 		</Helmet>

	// 		<SteppedFormContext.Provider
	// 			value={{
	// 				currentStep: formStep,
	// 				localeBase: 'createBookClubScene',
	// 				setStep: setFormStep,
	// 				stepsBeforeReview: 3,
	// 			}}
	// 		>
	// 			<SteppedFormSceneHeader />

	// 			<SceneContainer>
	// 				<div className="flex flex-col gap-12">
	// 					{createError && <Alert level="error">{createError}</Alert>}

	// 					<Suspense>
	// 						<CreateBookClubForm onSubmit={handleSubmit} />
	// 					</Suspense>
	// 				</div>
	// 			</SceneContainer>
	// 		</SteppedFormContext.Provider>
	// 	</div>
	// )
}
