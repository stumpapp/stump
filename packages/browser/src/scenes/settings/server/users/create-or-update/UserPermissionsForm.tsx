import { CheckBox, Heading, Label, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { UserPermission } from '@stump/types'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import z from 'zod'

import paths from '@/paths'

import { Schema } from './CreateOrUpdateUserForm'

export const allPermissions = [
	'bookclub:read',
	'bookclub:create',
	'email:arbitrary_send',
	'email:send',
	'emailer:create',
	'emailer:manage',
	'emailer:read',
	'file:explorer',
	'file:upload',
	'file:download',
	'library:create',
	'library:edit',
	'library:scan',
	'library:manage',
	'library:delete',
	'user:read',
	'user:manage',
	'server:manage',
	'smartlist:read',
	'notifier:read',
	'notifier:create',
	'notifier:delete',
	'notifier:manage',
] as const
export const userPermissionSchema = z.enum(allPermissions)

const associatedPermissions: Record<UserPermission, UserPermission[]> = {
	'bookclub:create': ['bookclub:read'],
	'bookclub:read': [],
	'email:arbitrary_send': ['email:send'],
	'email:send': ['emailer:read'],
	'emailer:create': ['emailer:read', 'emailer:manage', 'email:send'],
	'emailer:manage': ['emailer:read'],
	'emailer:read': [],
	'file:download': [],
	'file:explorer': [],
	'file:upload': [],
	'library:create': ['library:edit'],
	'library:delete': ['library:edit', 'library:scan', 'library:manage'],
	'library:edit': [],
	'library:manage': ['library:edit', 'library:scan'],
	'library:scan': [],
	'notifier:create': ['notifier:read'],
	'notifier:delete': ['notifier:read'],
	'notifier:manage': ['notifier:read', 'notifier:create', 'notifier:delete'],
	'notifier:read': [],
	'server:manage': ['file:explorer', 'user:manage', 'library:edit', 'library:scan'],
	'smartlist:read': [],
	'user:manage': ['user:read'],
	'user:read': [],
}

const prefixes = ['bookclub', 'file', 'library', 'user', 'server', 'smartlist'] as const

const LOCAL_BASE = 'settingsScene.server/users.createOrUpdateForm.permissions'
const getLocaleKey = (path: string) => `${LOCAL_BASE}.${path}`
const splitPermission = (permission: UserPermission): [string, string] =>
	permission.split(':') as [string, string]
const getPermissionLabel = (permission: UserPermission) => {
	const split = splitPermission(permission)
	return getLocaleKey(`${split[0]}.${split[1]}.label`)
}
const getPermissionDescription = (permission: UserPermission) => {
	const split = splitPermission(permission)
	return getLocaleKey(`${split[0]}.${split[1]}.description`)
}
const getPrefixLabel = (prefix: string) => getLocaleKey(`${prefix}.label`)

export default function UserPermissionsForm() {
	const { t } = useLocaleContext()
	const form = useFormContext<Schema>()

	const selectedPermissions = form.watch('permissions') ?? []

	useEffect(
		() => {
			const selectionsWithAssociations = selectedPermissions.reduce<UserPermission[]>(
				(acc, permission) => [...acc, permission, ...associatedPermissions[permission]],
				[],
			)
			const uniqueSelections = [...new Set(selectionsWithAssociations)]
			form.setValue('permissions', uniqueSelections)
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedPermissions],
	)

	const handlePermissionClick = (permission: UserPermission) => {
		const selected = form.getValues('permissions') ?? []
		if (selected.includes(permission)) {
			form.setValue(
				'permissions',
				selected.filter((p) => p !== permission),
			)
		} else {
			form.setValue('permissions', [...selected, permission])
		}
	}

	const renderSection = (permissions: UserPermission[]) => {
		return permissions.map((permission) => {
			const label = t(getPermissionLabel(permission))
			const [description, disclaimer] = t(getPermissionDescription(permission))
				.split('\n')
				.filter(Boolean)

			return (
				<div className="leading-6 md:max-w-2xl" key={permission}>
					<CheckBox
						id={permission}
						variant="primary"
						label={label}
						checked={selectedPermissions.includes(permission)}
						onClick={() => handlePermissionClick(permission)}
						value={permission}
					/>
					<Text variant="muted" className="ml-6" size="sm">
						{description}{' '}
						{disclaimer && <span className="font-medium text-foreground-subtle">{disclaimer}</span>}
					</Text>
				</div>
			)
		})
	}

	const renderDescription = () => {
		const description = t(getLocaleKey('subtitle.0'))
		const documentation = t(getLocaleKey('subtitle.1'))

		return (
			<>
				{description}{' '}
				<Link
					href={paths.docs('access-control', 'user-permissions')}
					target="_blank"
					rel="noopener noreferrer"
				>
					{documentation}
				</Link>
			</>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Heading size="sm">{t(getLocaleKey('heading'))}</Heading>
				<Text size="sm" variant="muted" className="mt-1">
					{renderDescription()}
				</Text>
			</div>

			<div className="flex flex-col gap-8">
				{prefixes.map((prefix) => {
					const label = t(getPrefixLabel(prefix))
					return (
						<div key={prefix} className="flex flex-col gap-3">
							<Label>{label}</Label>
							{renderSection(allPermissions.filter((permission) => permission.startsWith(prefix)))}
						</div>
					)
				})}
			</div>
		</div>
	)
}
