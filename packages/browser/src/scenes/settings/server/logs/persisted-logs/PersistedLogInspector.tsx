import { Label, Sheet, Text } from '@stump/components'
import { Log } from '@stump/types'
import dayjs from 'dayjs'
import upperFirst from 'lodash/upperFirst'

import { useCurrentOrPrevious } from '@/hooks/useCurrentOrPrevious'

type Props = {
	persistedLog: Log | null
	onClose: () => void
}

export default function PersistedLogInspector({ persistedLog, onClose }: Props) {
	const displayedLog = useCurrentOrPrevious(persistedLog)

	return (
		<Sheet open={!!persistedLog} onClose={onClose} title="Log details">
			<div className="flex flex-col">
				<div className="bg-background-surface px-6 py-2">
					<Label className="text-foreground-muted">Level</Label>
					<Text size="sm">{upperFirst(displayedLog?.level.toLowerCase()) || 'Unknown'}</Text>
				</div>

				<div className="px-6 py-2">
					<Label className="text-foreground-muted">Message</Label>
					<Text size="sm">{displayedLog?.message}</Text>
				</div>

				<div className="bg-background-surface px-6 py-2">
					<Label className="text-foreground-muted">Additional Context</Label>
					<Text size="sm">{displayedLog?.context}</Text>
				</div>

				<div className="px-6 py-2">
					<Label className="text-foreground-muted">Timestamp</Label>
					<Text size="sm">{dayjs(displayedLog?.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Text>
				</div>
			</div>
		</Sheet>
	)
}
