import { Badge, Card, Text, ToolTip } from '@stump/components'
import { FragmentType, graphql, useFragment, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { intlFormat } from 'date-fns'
import { BadgeAlert, BadgeCheck, BadgeX } from 'lucide-react'

import { useAppContext } from '@/context'

import { PROVIDER_LABELS } from './constants'
import { EditProviderDialog } from './EditProviderDialog'
import { ProviderLogo } from './ProviderLogo'

const fragment = graphql(`
	fragment ExistingProviderCard on MetadataProviderConfigModel {
		id
		providerType
		enabled
		apiTokenExpiresAt
		autoApplyConfig
		createdAt
		updatedAt
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export function ExistingProviderCard({ data }: Props) {
	const provider = useFragment(fragment, data)

	const { t } = useLocaleContext()
	const { checkPermission } = useAppContext()

	const canEdit = checkPermission(UserPermission.MetadataProviderManage)
	const expiresSoon = provider.apiTokenExpiresAt
		? getDoesExpireSoon(new Date(provider.apiTokenExpiresAt))
		: false

	return (
		<Card key={provider.id} className="gap-4 p-4 flex flex-col">
			<div className="gap-1 flex items-center justify-between">
				<div className="gap-4 flex items-center">
					<ProviderLogo provider={provider.providerType} className="h-8 w-8" />
					<Text className="font-medium">
						{PROVIDER_LABELS[provider.providerType] ?? provider.providerType}
					</Text>
				</div>

				<div className="gap-2 flex items-center">
					{canEdit && <EditProviderDialog provider={provider} />}

					{expiresSoon && (
						<ToolTip content={t(getKey('providerTokenExpiresSoon'))} align="end" size="xs">
							<div className="h-7 w-7 flex items-center justify-center rounded-full border border-fill-danger/10 bg-fill-danger-secondary">
								<BadgeAlert className="text-primary h-4 w-4" strokeWidth={1} />
							</div>
						</ToolTip>
					)}

					{provider.enabled && (
						<ToolTip content={t(getKey('providerEnabled'))} align="end" size="xs">
							<div className="h-7 w-7 flex items-center justify-center rounded-full border border-fill-success/10 bg-fill-success-secondary">
								<BadgeCheck className="text-primary h-4 w-4" strokeWidth={1} />
							</div>
						</ToolTip>
					)}

					{!provider.enabled && (
						<ToolTip content={t(getKey('providerDisabled'))} align="end" size="xs">
							<div className="h-7 w-7 flex items-center justify-center rounded-full border border-fill-info/10 bg-fill-info-secondary">
								<BadgeX className="text-primary h-4 w-4" strokeWidth={1} />
							</div>
						</ToolTip>
					)}
				</div>
			</div>

			<div className="gap-1 flex items-center justify-between">
				<Text size="xs" variant="muted">
					Added {intlFormat(new Date(provider.createdAt))}
				</Text>

				<Badge size="xs">
					{t(provider.autoApplyConfig?.enabled ? getKey('autoApplyOn') : getKey('autoApplyOff'))}
				</Badge>
			</div>
		</Card>
	)
}

const LOCALE_KEY = 'settingsScene.server/metadataIntegrations'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

const getDoesExpireSoon = (expiresAt: Date) => {
	return new Date(expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
}
