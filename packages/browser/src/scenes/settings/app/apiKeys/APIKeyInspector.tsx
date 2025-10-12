import { Badge, Label, Sheet, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import dayjs from 'dayjs'
import { KeyRound, Sparkles } from 'lucide-react'

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

	const expiration = dayjs(displayedData?.expiresAt)
	const lastUsedAt = dayjs(displayedData?.lastUsedAt)
	const createdAt = dayjs(displayedData?.createdAt)
	const isAllPermissions =
		user.isServerOwner && displayedData?.permissions.__typename === 'InheritPermissionStruct'

	const renderPermissions = () => {
		if (isAllPermissions) {
			return (
				<div
					className="mx-4 my-2 flex flex-col space-y-1.5 rounded-lg bg-fill-warning-secondary p-[3px]"
					data-testid="unrestricted-meta"
				>
					<div className="flex items-center px-2.5 py-0.5 text-fill-warning">
						<Sparkles className="mr-2 h-4 w-4" />
						<span className="font-medium">{t(getKey('unrestrictedKey.heading'))}</span>
					</div>
					<div className="rounded-lg bg-fill-warning-secondary p-2.5">
						<Text size="sm" className="text-fill-warning">
							{t(getKey('unrestrictedKey.description'))}
						</Text>
					</div>
				</div>
			)
		}

		const permissions =
			displayedData?.permissions.__typename === 'InheritPermissionStruct'
				? user.permissions || []
				: displayedData?.permissions.value || []

		return (
			<div
				className="mx-4 my-2 flex flex-col space-y-1.5 rounded-lg bg-background-surface p-[3px]"
				data-testid="permissions-meta"
			>
				<div className="flex items-center px-2.5 py-0.5 text-foreground-subtle/80">
					<KeyRound className="mr-2 h-4 w-4" />
					<span className="font-medium">{t(getSharedKey('fields.permissions'))}</span>
				</div>
				<div className="rounded-lg bg-background-surface-secondary p-2.5">
					<div className="flex flex-wrap gap-2">
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
			<div className="flex flex-col">
				<div className="px-4 py-2" data-testid="name-meta">
					<Label className="text-foreground-muted">{t(getSharedKey('fields.name'))}</Label>
					<Text size="sm">{displayedData?.name}</Text>
				</div>

				{renderPermissions()}

				<div className="px-4 py-2" data-testid="expire-meta">
					<Label className="text-foreground-muted">{t(getSharedKey('fields.expiration'))}</Label>
					<Text size="sm">
						{expiration.isValid() ? expiration.format('LLL') : t('common.never')}
					</Text>
				</div>

				<div className="my-2 bg-background-surface px-4 py-2" data-testid="last_used-meta">
					<Label className="text-foreground-muted">{t(getSharedKey('fields.last_used'))}</Label>
					<Text size="sm">
						{lastUsedAt.isValid() ? lastUsedAt.format('LLL') : t('common.never')}
					</Text>
				</div>

				{createdAt.isValid() && (
					<div className="px-4 py-2" data-testid="created-meta">
						<Label className="text-foreground-muted">{t(getSharedKey('fields.created'))}</Label>
						<Text size="sm">{createdAt.format('LLL')}</Text>
					</div>
				)}
			</div>
		</Sheet>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.inspector'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getSharedKey = (key: string) => `settingsScene.app/apiKeys.shared.${key}`
