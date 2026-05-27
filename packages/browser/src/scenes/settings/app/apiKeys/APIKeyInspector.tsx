import { Alert, AlertDescription, AlertTitle, Badge, NewCard, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { intlFormat, isValid, parseISO } from 'date-fns'
import { KeyRound, ShieldAlert } from 'lucide-react'

import { useAppContext } from '@/context'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'

import { APIKey } from './APIKeyTable'

type Props = {
	apiKey: APIKey | null
	onClose: () => void
}

export default function APIKeyInspector({ apiKey, onClose }: Props) {
	const { t } = useLocaleContext()
	const { user } = useAppContext()

	const displayedData = useCurrentOrPrevious(apiKey)

	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return null
		const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr)
		if (!isValid(date)) return null
		return intlFormat(date, {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		})
	}

	const expirationFormatted = formatDate(displayedData?.expiresAt)
	const lastUsedAtFormatted = formatDate(displayedData?.lastUsedAt)
	const createdAtFormatted = formatDate(displayedData?.createdAt)
	const isAllPermissions =
		user.isServerOwner && displayedData?.permissions.__typename === 'InheritPermissionStruct'

	const renderPermissions = () => {
		if (isAllPermissions) return null

		const permissions =
			displayedData?.permissions.__typename === 'InheritPermissionStruct'
				? user.permissions || []
				: displayedData?.permissions.value || []

		return (
			<div data-testid="permissions-meta">
				<Text variant="label" size="sm">
					Permissions
				</Text>
				<div className="gap-2 mt-1.5 flex flex-row flex-wrap">
					{permissions.map((perm) => (
						<Badge key={perm} variant="primary" data-testid="permission-badge">
							{perm}
						</Badge>
					))}
				</div>
			</div>
		)

		return <NewCard.Row label={t(getSharedKey('fields.permissions'))}></NewCard.Row>

		return (
			<div
				className="mx-4 my-2 space-y-1.5 p-0.75 flex flex-col rounded-lg bg-muted"
				data-testid="permissions-meta"
			>
				<div className="px-2.5 py-0.5 flex items-center text-foreground/80">
					<KeyRound className="mr-2 h-4 w-4" />
					<span className="font-medium">{t(getSharedKey('fields.permissions'))}</span>
				</div>
				<div className="p-2.5 rounded-lg bg-secondary">
					<div className="gap-2 flex flex-wrap">
						{permissions.map((perm) => (
							<Badge
								key={perm}
								variant="primary"
								size="sm"
								className="px-1"
								data-testid="permission-badge"
							>
								{perm}
							</Badge>
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<Sheet
			open={!!apiKey}
			onClose={onClose}
			title="API key"
			description="A detailed view of this key"
		>
			<div className="px-4 gap-4 flex flex-col">
				{isAllPermissions && (
					<Alert variant="warning" data-testid="unrestricted-meta">
						<ShieldAlert className="size-4" />
						<AlertTitle>{t(getKey('unrestrictedKey.heading'))}</AlertTitle>
						<AlertDescription>{t(getKey('unrestrictedKey.description'))}</AlertDescription>
					</Alert>
				)}

				<NewCard>
					<NewCard.Row label={t(getSharedKey('fields.name'))} data-testid="name-meta">
						<Text size="sm">{displayedData?.name}</Text>
					</NewCard.Row>

					<NewCard.Row label={t(getSharedKey('fields.expiration'))} data-testid="expire-meta">
						<Text size="sm">{expirationFormatted ?? t('common.never')}</Text>
					</NewCard.Row>

					<NewCard.Row label={t(getSharedKey('fields.last_used'))} data-testid="last_used-meta">
						<Text size="sm">{lastUsedAtFormatted ?? t('common.never')}</Text>
					</NewCard.Row>

					{createdAtFormatted && (
						<NewCard.Row label={t(getSharedKey('fields.created'))} data-testid="created-meta">
							<Text size="sm">{createdAtFormatted}</Text>
						</NewCard.Row>
					)}
				</NewCard>

				{renderPermissions()}
			</div>
		</Sheet>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.inspector'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getSharedKey = (key: string) => `settingsScene.app/apiKeys.shared.${key}`
