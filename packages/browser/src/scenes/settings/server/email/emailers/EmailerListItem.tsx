import { Badge, Card, Text, ToolTip } from '@stump/components'
import { SMTPEmailer } from '@stump/types'
import { Sparkles } from 'lucide-react'
import React, { useMemo } from 'react'

import { getCommonHost } from './utils'

type Props = {
	emailer: SMTPEmailer
}
export default function EmailerListItem({ emailer }: Props) {
	const {
		name,
		is_primary,
		config: { smtp_host, smtp_port },
	} = emailer

	const displayedHost = useMemo(
		() => getCommonHost(smtp_host) ?? { name: smtp_host, smtp_host: smtp_host },
		[smtp_host],
	)

	return (
		<Card className="flex flex-col space-y-2 p-4">
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
					<Badge size="xs" variant="default">
						{displayedHost.name}
					</Badge>
				</ToolTip>
			</div>
		</Card>
	)
}
