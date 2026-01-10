import { useGraphQLMutation, useSDK } from '@stump/client'
import { Button, Dialog, Text, useCopyToClipboard } from '@stump/components'
import { ApikeyInput, graphql, InheritPermissionValue } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, CopyCheck, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import CreateOrUpdateAPIKeyForm, {
	CREATE_OR_UPDATE_API_KEY_FORM_ID,
	CreateOrUpdateAPIKeyFormValues,
} from './CreateOrUpdateAPIKeyForm'

const mutation = graphql(`
	mutation CreateAPIKeyModal($input: ApikeyInput!) {
		createApiKey(input: $input) {
			apiKey {
				id
			}
			secret
		}
	}
`)

export default function CreateAPIKeyModal() {
	const [isOpen, setIsOpen] = useState(false)

	const client = useQueryClient()

	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const { mutate: createKey, isPending } = useGraphQLMutation(mutation, {
		onSuccess: ({ createApiKey: { secret } }) => {
			setApiSecret(secret)
			client.refetchQueries({
				exact: false,
				predicate: ({ queryKey }) => queryKey.includes(sdk.cacheKeys.apiKeys),
			})
		},
	})

	const [apiSecret, setApiSecret] = useState<string | null>(null)

	const [hideSecret, setHideSecret] = useState(true)

	const [copy, didCopy] = useCopyToClipboard(apiSecret || '')

	const maskedSecret = useMemo(
		() => `stump_${apiSecret?.split('stump_').at(-1)?.replace(/./g, '*')}`,
		[apiSecret],
	)

	const handleCreate = useCallback(
		async ({ name, expiresAt, ...permissions }: CreateOrUpdateAPIKeyFormValues) => {
			const payload: ApikeyInput = {
				name,
				expiresAt: expiresAt?.toISOString(),
				permissions: permissions.inherit
					? {
							inherit: InheritPermissionValue.Inherit,
						}
					: {
							custom: permissions.explicitPermissions,
						},
			}
			createKey({ input: payload })
		},
		[createKey],
	)

	useEffect(() => {
		if (!isOpen) {
			const timeout = setTimeout(() => {
				setApiSecret(null)
				setHideSecret(true)
			})
			return () => clearTimeout(timeout)
		}
	}, [isOpen])

	const VisibilityIcon = hideSecret ? Eye : EyeOff
	const CopyIcon = didCopy ? CopyCheck : Copy

	const [formFocused, setFormFocused] = useState(false)

	const onEscapeKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!formFocused) return

			if (e.key === 'Escape') {
				e.preventDefault()
				e.stopPropagation()
			}
		},
		[formFocused],
	)

	return (
		<Dialog open={isOpen} onOpenChange={isPending ? undefined : setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="sm" variant="secondary">
					{t(getKey('trigger'))}
				</Button>
			</Dialog.Trigger>

			<Dialog.Content size="md" onEscapeKeyDown={onEscapeKeyDown}>
				<Dialog.Header>
					<Dialog.Title>{t(getKey(`heading.${apiSecret ? 'created' : 'creating'}`))}</Dialog.Title>
					<Dialog.Description>
						{t(getKey(`description.${apiSecret ? 'created' : 'creating'}`))}
					</Dialog.Description>
				</Dialog.Header>

				{apiSecret && (
					<div className="divide divide-y divide-edge rounded-lg border border-edge bg-background-surface p-0.5">
						<div className="mb-1 flex h-8 items-center justify-between pl-3 pr-2">
							<div className="flex items-center space-x-2">
								<KeyRound className="h-4 w-4 text-foreground-muted" />
								<Text size="sm" className="text-foreground-subtle">
									{t(getKey('createdKey'))}
								</Text>
							</div>

							<div className="flex items-center gap-1">
								<Button size="icon" onClick={() => setHideSecret((prev) => !prev)}>
									<VisibilityIcon className="h-4 w-4 text-foreground-muted" />
								</Button>
								<Button size="icon" onClick={() => copy()}>
									<CopyIcon className="h-4 w-4 text-foreground-muted" />
								</Button>
							</div>
						</div>

						<div className="rounded-lg bg-background-surface-secondary p-3 text-sm text-foreground-subtle">
							<span>
								<code>{hideSecret ? maskedSecret : apiSecret}</code>
							</span>
						</div>
					</div>
				)}
				{!apiSecret && (
					<CreateOrUpdateAPIKeyForm
						onSubmit={handleCreate}
						onFormFocusStateChanged={setFormFocused}
					/>
				)}

				<Dialog.Footer>
					{!apiSecret && (
						<Button disabled={isPending} onClick={() => setIsOpen(false)} size="sm">
							{t('common.cancel')}
						</Button>
					)}

					<Button
						disabled={isPending}
						variant="primary"
						size="sm"
						type={apiSecret ? 'button' : 'submit'}
						form={apiSecret ? undefined : CREATE_OR_UPDATE_API_KEY_FORM_ID}
						onClick={apiSecret ? () => setIsOpen(false) : undefined}
					>
						{t(getKey(apiSecret ? 'savedConfirm' : 'submit'))}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = 'settingsScene.app/apiKeys.sections.createKey.modal'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
