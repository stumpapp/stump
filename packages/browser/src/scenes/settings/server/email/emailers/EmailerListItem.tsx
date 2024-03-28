import { prefetchEmailerSendHistory } from '@stump/client'
import { Badge, Card, Text, ToolTip } from '@stump/components'
import { SMTPEmailer } from '@stump/types'
import dayjs from 'dayjs'
import { Sparkles } from 'lucide-react'
import React, { Suspense, useMemo } from 'react'

import EmailerSendHistory from './EmailerSendHistory'
import { getCommonHost } from './utils'

type Props = {
	emailer: SMTPEmailer
}
export default function EmailerListItem({ emailer }: Props) {
	const {
		name,
		is_primary,
		config: { smtp_host, smtp_port },
		last_used_at,
	} = emailer

	const displayedHost = useMemo(
		() => getCommonHost(smtp_host) ?? { name: smtp_host, smtp_host: smtp_host },
		[smtp_host],
	)

	const renderUsage = () => {
		return <EmailerSendHistory emailerId={emailer.id} lastUsedAt={dayjs()} />
		if (!last_used_at) {
			return (
				<Text size="sm" variant="muted">
					Not used yet
				</Text>
			)
		} else {
			return <EmailerSendHistory emailerId={emailer.id} lastUsedAt={dayjs(last_used_at)} />
		}
	}

	return (
		<Card
			className="flex flex-col space-y-2 p-4"
			onMouseEnter={() => prefetchEmailerSendHistory(emailer.id)}
		>
			<div className="flex items-center justify-between">
				<Text size="md" className="font-medium">
					{name}
				</Text>
				{is_primary && (
					<ToolTip content="Primary emailer" align="end" size="xs">
						<Sparkles className="text-primary h-4 w-4" strokeWidth={1} />
					</ToolTip>
				)}
			</div>

			<div>
				<ToolTip content={`${smtp_host}:${smtp_port}`} align="start" size="xs">
					<Badge size="xs" variant="default" className="cursor-default">
						{displayedHost.name}
					</Badge>
				</ToolTip>
			</div>

			<div className="h-6" />

			<div>
				<Suspense fallback={null}>{renderUsage()}</Suspense>
			</div>
		</Card>
	)
}
