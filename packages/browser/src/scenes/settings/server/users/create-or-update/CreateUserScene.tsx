import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useMemo } from 'react'

import { SceneContainer } from '@/components/container'
import { useTranslate } from '@/hooks/useTranslate'
import { AppTitle } from '@/AppTitle'

import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

const query = graphql(`
	query CreateUserScene {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				username
			}
		}
	}
`)

export default function CreateUserScene() {
	const { t } = useTranslate()
	const { sdk } = useSDK()
	const {
		data: {
			users: { nodes: users },
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('users', ['createUser']))

	const existingUsernames = useMemo(() => users.map((user) => user.username), [users])

	return (
		<SceneContainer>
			<AppTitle title={t('settingsScene.server/users.createUser.helmet')} />

			<CreateOrUpdateUserForm existingUsernames={existingUsernames} />
		</SceneContainer>
	)
}
