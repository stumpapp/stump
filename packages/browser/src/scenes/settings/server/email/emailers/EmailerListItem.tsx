import { useGraphQLMutation, useSDK } from '@stump/client'
import { Badge, Card, Text, ToolTip } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Sparkles } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

import { useEmailerSettingsContext } from '../context'
import EmailerActionMenu from './EmailerActionMenu'
import EmailerSendHistory, { usePrefetchEmailerSendHistory } from './EmailerSendHistory'
import { getCommonHost } from './utils'

const EmailerListItemFragment = graphql(`
	fragment EmailerListItem on Emailer {
		id
		name
		isPrimary
		smtpHost
		smtpPort
		lastUsedAt
		maxAttachmentSizeBytes
		senderDisplayName
		senderEmail
		tlsEnabled
		username
	}
`)

const deleteMutation = graphql(`
	mutation DeleteEmailer($emailerId: Int!) {
		deleteEmailer(id: $emailerId) {
			id
		}
	}
`)

type Props = {
	fragment: FragmentType<typeof EmailerListItemFragment>
}

export default function EmailerListItem({ fragment }: Props) {
	const navigate = useNavigate()
	const emailer = useFragment(EmailerListItemFragment, fragment)

	const { canEditEmailer, canDeleteEmailer } = useEmailerSettingsContext()

	const client = useQueryClient()
	const { sdk } = useSDK()

	const prefetchHistory = usePrefetchEmailerSendHistory({ emailerId: emailer.id })

	const { mutate: deleteEmailer } = useGraphQLMutation(deleteMutation, {
		onSuccess: () => client.refetchQueries({ queryKey: [sdk.cacheKey('emailers')], exact: true }),
	})

	const displayedHost = useMemo(
		() =>
			getCommonHost(emailer.smtpHost) ?? { name: emailer.smtpHost, smtp_host: emailer.smtpHost },
		[emailer.smtpHost],
	)

	const renderUsage = () => {
		if (!emailer.lastUsedAt) {
			return (
				<Text size="sm" variant="muted">
					Not used yet
				</Text>
			)
		} else {
			return <EmailerSendHistory emailerId={emailer.id} lastUsedAt={dayjs(emailer.lastUsedAt)} />
		}
	}

	const handleDeleteEmailer = useCallback(() => {
		if (canDeleteEmailer) {
			deleteEmailer({ emailerId: emailer.id })
		}
	}, [canDeleteEmailer, deleteEmailer, emailer.id])

	return (
		<Card className="flex flex-col space-y-2 p-4" onMouseEnter={() => prefetchHistory()}>
			<div className="flex items-center justify-between">
				<Text size="md" className="font-medium">
					{emailer.name}
				</Text>
				<div className="flex items-center space-x-2">
					{emailer.isPrimary && (
						<ToolTip content="Primary emailer" align="end" size="xs">
							<Sparkles className="text-primary h-4 w-4" strokeWidth={1} />
						</ToolTip>
					)}
					{canEditEmailer && (
						<EmailerActionMenu
							onEdit={() => navigate(paths.editEmailer(emailer.id))}
							onDelete={canEditEmailer ? handleDeleteEmailer : undefined}
						/>
					)}
				</div>
			</div>

			<div>
				<ToolTip content={`${emailer.smtpHost}:${emailer.smtpPort}`} align="start" size="xs">
					<Badge size="xs" variant="default" className="cursor-default">
						{displayedHost.name}
					</Badge>
				</ToolTip>
			</div>

			<div className="h-6" />

			{/* TODO: separate permission for viewing usage history? */}
			<div>
				<Suspense fallback={null}>{renderUsage()}</Suspense>
			</div>
		</Card>
	)
}
