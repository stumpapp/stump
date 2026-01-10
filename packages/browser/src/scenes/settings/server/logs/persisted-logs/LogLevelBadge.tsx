import { Badge, BadgeProps, PickSelect } from '@stump/components'
import { LogLevel } from '@stump/graphql'
import { useMemo } from 'react'

type Props = {
	level: LogLevel
}
export default function LogLevelBadge({ level }: Props) {
	const variant: PickSelect<BadgeProps, 'variant'> = useMemo(() => {
		if (level === 'WARN') {
			return 'warning'
		} else if (level === 'ERROR') {
			return 'error'
		} else {
			return 'default'
		}
	}, [level])

	return (
		<Badge size="xs" variant={variant}>
			{level}
		</Badge>
	)
}
