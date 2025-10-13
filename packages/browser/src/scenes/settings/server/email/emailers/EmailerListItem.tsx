import { Badge, Card, Text, ToolTip } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { noop } from 'lodash'
import { Sparkles } from 'lucide-react'
import { Suspense, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import paths from '@/paths'

import { useEmailerSettingsContext } from '../context'
import EmailerActionMenu from './EmailerActionMenu'
import EmailerSendHistory from './EmailerSendHistory'
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

type Props = {
	fragment: FragmentType<typeof EmailerListItemFragment>
}

export default function EmailerListItem({ fragment }: Props) {
	const navigate = useNavigate()
	const emailer = useFragment(EmailerListItemFragment, fragment)

	const { canEditEmailer } = useEmailerSettingsContext()

	// const { prefetch } = usePrefetchEmailerSendHistory({ emailerId: emailer.id })

	// const { deleteEmailer } = useDeleteEmailer()
	// TODO(graphql): Fix
	const deleteEmailer = noop

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

	// TODO(graphql): Fix
	const handleDeleteEmailer = useCallback(() => {
		// if (canEditEmailer) {
		// 	deleteEmailer(emailer.id)
		// }
	}, [canEditEmailer, deleteEmailer, emailer.id])

	return (
		<Card
			className="flex flex-col space-y-2 p-4"
			// onMouseEnter={() => prefetch({ include_sent_by: true })}
		>
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
