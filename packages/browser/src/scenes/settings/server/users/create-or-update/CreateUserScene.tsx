import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useMemo } from 'react'
import { Helmet } from 'react-helmet'

import { SceneContainer } from '@/components/container'

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
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: {
			users: { nodes: users },
		},
	} = useSuspenseGraphQL(query, sdk.cacheKey('users', ['createUser']))

	const existingUsernames = useMemo(() => users.map((user) => user.username), [users])

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.createUser.helmet')}</title>
			</Helmet>

			<CreateOrUpdateUserForm existingUsernames={existingUsernames} />
		</SceneContainer>
	)
}
