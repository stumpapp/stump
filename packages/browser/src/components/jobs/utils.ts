import { JobStatus } from '@stump/graphql'

export function readableKind(kind: string | null) {
	if (!kind) {
		return 'Unknown'
	}

	return kind
		.replace(/(Job|Jobs)$/, '')
		.replace(/([A-Z])/g, ' $1')
		.replace(/^./, (str) => str.toUpperCase())
}

export function formatJobStatus(status: JobStatus) {
	return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}
