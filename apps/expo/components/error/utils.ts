export function getIssueUrl(error: Error): string {
	const labels = ['bug', 'mobile-app']

	const errorTitle = '[BUG] Mobile App Error'

	let errorDetails = '## Error Details\n\n'
	errorDetails += `**Error Type:** ${error.constructor.name}\n\n`
	errorDetails += `**Message:** ${error.message}\n\n`

	if (error.stack) {
		errorDetails += `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n`
	}

	if (error.cause) {
		errorDetails += `**Cause:**\n\`\`\`\n${typeof error.cause === 'string' ? error.cause : JSON.stringify(error.cause, null, 2)}\n\`\`\`\n\n`
	}

	const params = new URLSearchParams({
		title: errorTitle,
		labels: labels.join(','),
		body: errorDetails,
	})

	return `https://github.com/stumpapp/stump/issues/new?${params.toString()}`
}
