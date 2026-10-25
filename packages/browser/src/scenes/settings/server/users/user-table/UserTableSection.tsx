import { ButtonOrLink, Heading, Text } from '@stump/components'
import { UserPermission } from '@stump/graphql'
import { Suspense } from 'react'

import { useAppContext } from '@/context'
import { useTranslate } from '@/hooks/useTranslate'

import UserTable from './UserTable'

export default function UserTableSection() {
	const { checkPermission } = useAppContext()
	const { t } = useTranslate()

	return (
		<div className="gap-y-4 flex flex-col">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">
						{t('settingsScene.server/users.userTable.existingAccounts.heading')}
					</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/users.userTable.existingAccounts.description')}
					</Text>
				</div>
				{checkPermission(UserPermission.ManageUsers) && (
					<div className="gap-2 flex items-end">
						<ButtonOrLink href="create" variant="secondary">
							{t('settingsScene.server/users.createUser.title')}
						</ButtonOrLink>
					</div>
				)}
			</div>

			<Suspense>
				<UserTable />
			</Suspense>
		</div>
	)
}
