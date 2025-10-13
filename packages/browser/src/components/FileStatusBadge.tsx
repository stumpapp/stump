import { Badge, BadgeProps, PickSelect } from '@stump/components'
import { FileStatus } from '@stump/graphql'
import { useMemo } from 'react'

export default function FileStatusBadge({ status }: { status: FileStatus }) {
	const variant: PickSelect<BadgeProps, 'variant'> = useMemo(() => {
		if (status === 'READY') {
			return 'success'
		} else if (status === 'MISSING') {
			return 'warning'
		} else if (status === 'ERROR') {
			return 'error'
		}
		return 'default'
	}, [status])

	return <Badge variant={variant}>{status}</Badge>
}
