import { Button, Dialog, Text, useCopyToClipboard } from '@stump/components'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CreateOrUpdateAPIKeyForm, {
	CreateOrUpdateAPIKeyFormValues,
} from './CreateOrUpdateAPIKeyForm'
import { CreateOrUpdateAPIKey } from '@stump/sdk'
import { useMutation, useSDK } from '@stump/client'
import { Copy, CopyCheck, Eye, EyeOff, KeyRound } from 'lucide-react'

// TODO(koreader): localize
export default function CreateAPIKeyModal() {
	const [isOpen, setIsOpen] = useState(false)

	const { sdk } = useSDK()
	const { mutateAsync: createKey, isLoading: isCreating } = useMutation(
		[sdk.apiKey.keys.create],
		(payload: CreateOrUpdateAPIKey) => sdk.apiKey.create(payload),
	)
	const [apiSecret, setApiSecret] = useState<string | null>(null)
	const [hideSecret, setHideSecret] = useState(true)

	const [copy, didCopy] = useCopyToClipboard(apiSecret || '')

	const maskedSecret = useMemo(
		() => `stump_${apiSecret?.split('stump_').at(-1)?.replace(/./g, '*')}`,
		[apiSecret],
	)

	const handleCreate = useCallback(
		async ({ name, expires_at, ...permissions }: CreateOrUpdateAPIKeyFormValues) => {
			const payload: CreateOrUpdateAPIKey = {
				name,
				expires_at: expires_at?.toISOString(),
				permissions: permissions.inherit ? 'inherit' : permissions.explicit_permissions,
			}
			const { api_key } = await createKey(payload)
			setApiSecret(api_key)
		},
		[],
	)

	useEffect(() => {
		if (!isOpen) {
			setApiSecret(null)
			setHideSecret(true)
		}
	}, [isOpen])

	const VisibilityIcon = hideSecret ? Eye : EyeOff
	const CopyIcon = didCopy ? CopyCheck : Copy

	return (
		<Dialog open={isOpen} onOpenChange={isCreating ? undefined : setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm" variant="secondary">
					Create API key
				</Button>
			</Dialog.Trigger>

			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>{apiSecret ? 'Created key' : 'Create API key'}</Dialog.Title>
					<Dialog.Description>
						{apiSecret
							? 'Your new API key has been created. Save the secret somewhere safe, as it will not be shown again'
							: 'API keys are long-lived credentials that can be used to authenticate with the API'}
					</Dialog.Description>
				</Dialog.Header>

				{apiSecret && (
					<div className="divide divide-y divide-edge rounded-lg border border-edge bg-background-surface">
						<div className="flex h-8 items-center justify-between pl-3 pr-2">
							<div className="flex items-center space-x-2">
								<KeyRound className="h-4 w-4 text-foreground-muted" />
								<Text size="sm" className="text-foreground-subtle">
									Created key
								</Text>
							</div>

							<div className="divide flex items-center divide-x divide-edge">
								<span className="pr-1">
									<Button size="icon" onClick={() => setHideSecret((prev) => !prev)}>
										<VisibilityIcon className="h-4 w-4 text-foreground-muted" />
									</Button>
								</span>

								<span className="pl-1">
									<Button size="icon" onClick={() => copy()}>
										<CopyIcon className="h-4 w-4 text-foreground-muted" />
									</Button>
								</span>
							</div>
						</div>

						<div className="p-3 text-sm text-foreground-subtle">
							<code>{hideSecret ? maskedSecret : apiSecret}</code>
						</div>
					</div>
				)}
				{!apiSecret && <CreateOrUpdateAPIKeyForm onSubmit={handleCreate} />}

				<Dialog.Footer>
					{!apiSecret && (
						<Button disabled={isCreating} onClick={() => setIsOpen(false)} size="sm">
							Cancel
						</Button>
					)}

					<Button
						disabled={isCreating}
						variant="primary"
						size="sm"
						type={apiSecret ? 'button' : 'submit'}
						onClick={apiSecret ? () => setIsOpen(false) : undefined}
					>
						{apiSecret ? 'I saved my key' : 'Create key'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}
