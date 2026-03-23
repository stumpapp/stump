import { useGraphQLMutation } from '@stump/client'
import { Button, Input } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import type { CreateOrUpdateEmailerSchema } from './schema'

const testEmailerMutation = graphql(`
	mutation TestEmailer($config: EmailerClientConfig!, $recipient: String!) {
		testEmailer(config: $config, recipient: $recipient)
	}
`)

export default function TestEmailerButton() {
	const { t } = useLocaleContext()
	const { control } = useFormContext<CreateOrUpdateEmailerSchema>()

	const [recipient, setRecipient] = useState('')

	const [smtpHost, smtpPort, username, password, senderEmail, senderDisplayName, tlsEnabled] =
		useWatch({
			control,
			name: [
				'smtpHost',
				'smtpPort',
				'username',
				'password',
				'senderEmail',
				'senderDisplayName',
				'tlsEnabled',
			],
		})

	const config = useMemo(
		() => ({
			host: smtpHost,
			port: smtpPort,
			username,
			password: password!,
			senderEmail,
			senderDisplayName: senderDisplayName || '',
			tlsEnabled: tlsEnabled ?? false,
		}),
		[smtpHost, smtpPort, username, password, senderEmail, senderDisplayName, tlsEnabled],
	)

	const canTest =
		!!smtpHost && !!smtpPort && !!username && !!password && !!senderEmail && !!recipient

	const { mutate: sendTestEmail, isPending } = useGraphQLMutation(testEmailerMutation, {
		onSuccess: () => {
			toast.success(t(getKey('success')))
		},
		onError: () => {
			toast.error(t(getKey('error.title')), {
				description: t(getKey('error.description')),
			})
		},
	})

	const handleTest = () => {
		if (!canTest) return
		sendTestEmail({
			config,
			recipient,
		})
	}

	return (
		<div className="flex flex-row items-center gap-2">
			<Input
				id="testRecipient"
				label={t(getKey('recipientLabel'))}
				description={t(getKey('recipientDescription'))}
				variant="primary"
				value={recipient}
				onChange={(e) => setRecipient(e.target.value)}
				placeholder="you@example.com"
			/>
			<Button
				type="button"
				variant="secondary"
				disabled={!canTest || isPending}
				isLoading={isPending}
				onClick={handleTest}
				className="shrink-0"
			>
				{t(getKey('button'))}
			</Button>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.server/email.createOrUpdateForm.testEmailer'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
