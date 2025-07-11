import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useNavigate, useParams } from 'react-router'

import { ContentContainer } from '@/components/container'
import { SceneContainer } from '@/components/container'
import { useAppContext } from '@/context'
import paths from '@/paths'

import CreateOrUpdateUserForm from './CreateOrUpdateUserForm'

const query = graphql(`
	query UpdateUserScene($id: ID!, $skip: Boolean!) {
		me {
			id
		}
		userById(id: $id) @skip(if: $skip) {
			id
			avatarUrl
			username
			ageRestriction {
				age
				restrictOnUnset
			}
			permissions
			maxSessionsAllowed
			isServerOwner
		}
		users(pagination: { none: { unpaginated: true } }) @skip(if: $skip) {
			nodes {
				username
			}
		}
	}
`)

export default function UpdateUserScene() {
	const navigate = useNavigate()

	const { id } = useParams<{ id: string }>()
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { checkPermission } = useAppContext()

	if (!id) {
		throw new Error('ID is required')
	}

	const {
		data: { userById: user, me, users: existingUsers },
	} = useSuspenseGraphQL(query, sdk.cacheKey('user', [id]), {
		id,
		skip: !checkPermission(UserPermission.ManageUsers),
	})

	const existingUsernames = useMemo(
		() => existingUsers?.nodes.map((user) => user.username) || [],
		[existingUsers],
	)

	useEffect(() => {
		if (!user) {
			console.warn('You lack permissions to edit this user, if one exists')
			navigate('..', { replace: true })
		} else if (user.id === me.id) {
			console.warn('Attempted to update self, redirecting to settings page. This is not allowed.')
			navigate(paths.settings(), { replace: true })
		}
	}, [user, me, navigate])

	if (user?.id === me.id) {
		return null
	}

	return (
		<SceneContainer className="-mt-4">
			<Helmet>
				<title>Stump | {t('settingsScene.server/users.updateUser.helmet')}</title>
			</Helmet>

			<ContentContainer>
				{user && <CreateOrUpdateUserForm user={user} existingUsernames={existingUsernames} />}
			</ContentContainer>
		</SceneContainer>
	)
}
