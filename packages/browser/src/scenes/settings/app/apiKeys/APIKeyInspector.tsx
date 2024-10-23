import { useAppContext } from '@/context'
import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'
import { Badge, cn, Label, Sheet, Text } from '@stump/components'
import { APIKey } from '@stump/sdk'
import dayjs from 'dayjs'
import { KeyRound, Sparkles } from 'lucide-react'

type Props = {
	apiKey: APIKey | null
	onClose: () => void
}

export default function APIKeyInspector({ apiKey, onClose }: Props) {
	const { user } = useAppContext()
	const displayedData = useCurrentOrPrevious(apiKey)

	const expiration = dayjs(displayedData?.expires_at)
	const lastUsedAt = dayjs(displayedData?.last_used_at)
	const createdAt = dayjs(displayedData?.created_at)
	const isAllPermissions = user.is_server_owner && displayedData?.permissions === 'inherit'

	const renderPermissions = () => {
		if (isAllPermissions) {
			return (
				<div className="mx-4 my-2 flex flex-col space-y-1.5 rounded-lg bg-fill-warning-secondary p-3">
					<div className="flex items-center border-fill-warning-secondary border-opacity-75 text-fill-warning">
						<Sparkles className="mr-2 h-4 w-4" />
						<span className="font-medium">Unrestricted key </span>
					</div>

					<Text size="sm" className="text-fill-warning">
						Since you are the server owner, this key as unrestricted access when configured to
						inherit permissions. Please be careful.
					</Text>
				</div>
			)
		}

		const permissions =
			displayedData?.permissions === 'inherit' ? user.permissions : displayedData?.permissions || []

		return (
			<div className="mx-4 my-2 flex flex-col space-y-3 rounded-lg bg-background-surface p-3">
				<div className="flex items-center border-fill-warning-secondary border-opacity-75 text-foreground-subtle/80">
					<KeyRound className="mr-2 h-4 w-4" />
					<span className="font-medium">Permissions</span>
				</div>

				<div className="flex flex-wrap gap-2">
					{permissions.map((perm) => (
						<Badge key={perm} variant="primary" size="sm" className="px-1">
							{perm}
						</Badge>
					))}
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
				<div className="px-4 py-2">
					<Label className="text-foreground-muted">Name</Label>
					<Text size="sm">{displayedData?.name}</Text>
				</div>

				{renderPermissions()}

				<div className="px-4 py-2">
					<Label className="text-foreground-muted">Expiration</Label>
					<Text size="sm">{expiration.isValid() ? expiration.format('LLL') : 'Never'}</Text>
				</div>

				<div className="my-2 bg-background-surface px-4 py-2">
					<Label className="text-foreground-muted">Last used</Label>
					<Text size="sm">{lastUsedAt.isValid() ? lastUsedAt.format('LLL') : 'Never'}</Text>
				</div>

				{createdAt.isValid() && (
					<div className="px-4 py-2">
						<Label className="text-foreground-muted">Created</Label>
						<Text size="sm">{createdAt.format('LLL')}</Text>
					</div>
				)}
			</div>
		</Sheet>
	)
}
