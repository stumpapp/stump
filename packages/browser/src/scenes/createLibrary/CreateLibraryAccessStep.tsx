import { useOidcConfig, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { AlertCircle } from 'lucide-react'
import { Suspense } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { OidcGroupsTable, UserAccessTable } from '@/components/library/accessControl'
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
	const { enabled: oidcEnabled } = useOidcConfig()

	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const oidcGroups = useWatch({ control: form.control, name: 'oidcGroups' }) ?? []
	const canReadUsers = checkPermission(UserPermission.ReadUsers)

	return (
		<div className="gap-8 flex flex-col">
			{!canReadUsers && <LacksReadUsersPermissionNotice />}
			{canReadUsers && (
				<Suspense>
					<UserAccess />
				</Suspense>
			)}

			{oidcEnabled && (
				<OidcGroupsTable
					groups={oidcGroups}
					onChange={(groups) => form.setValue('oidcGroups', groups)}
					alertId="create-library-oidc-groups-info"
				/>
			)}
		</div>
	)
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
			showHeader={false}
		/>
	)
}

function LacksReadUsersPermissionNotice() {
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
