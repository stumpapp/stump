import { useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { AlertCircle } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'

import { UserAccessTable } from '@/components/library/accessControl/UserAccessTable'
import { CreateOrUpdateLibrarySchema } from '@/components/library/createOrUpdate/schema'
import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

const usersQuery = graphql(`
	query CreateLibraryAccessUsersQuery {
		users(pagination: { none: { unpaginated: true } }) {
			nodes {
				id
				username
				avatarUrl
			}
		}
	}
`)

export default function CreateLibraryAccessStep() {
	const { checkPermission } = useAppContext()
	return checkPermission(UserPermission.ReadUsers) ? <UserAccess /> : <ReadUsersNotice />
}

function UserAccess() {
	const { user } = useAppContext()
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const allowedUserIds = useWatch({ control: form.control, name: 'allowedUserIds' }) ?? []
	const {
		data: {
			users: { nodes: allUsers },
		},
	} = useSuspenseGraphQL(usersQuery, ['users'])

	return (
		<UserAccessTable
			allUsers={allUsers}
			grantedIds={new Set([user.id, ...allowedUserIds])}
			onGrant={(ids) => form.setValue('allowedUserIds', [...new Set([...allowedUserIds, ...ids])])}
			onRevoke={(ids) =>
				form.setValue(
					'allowedUserIds',
					allowedUserIds.filter((id) => !ids.includes(id)),
				)
			}
		/>
	)
}

// TODO: realizing i might need to rephrase this alert since a user without readusers can still
// set oidc groups if enabled and all that, will revisit later today/tomorrow
function ReadUsersNotice() {
	const { t } = useTranslate()

	return (
		<Alert variant="info">
			<AlertCircle />
			<AlertTitle>{t('createLibraryScene.form.access.noPermission.title')}</AlertTitle>
			<AlertDescription>
				{t('createLibraryScene.form.access.noPermission.description')}
			</AlertDescription>
		</Alert>
	)
}
