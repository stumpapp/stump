import { isAxiosError } from 'axios'
import { useRouter } from 'expo-router'
import { Linking, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ZodError } from 'zod'

import { isOPDSAuthError } from '~/lib/sdk/auth'

import Owl from '../Owl'
import { Button, Heading, Text } from '../ui'

type Props = {
	error?: unknown | null
	onRetry?: () => void
}
export default function MaybeErrorLegacyFeed({ error, onRetry }: Props) {
	const router = useRouter()

	if (!error) return null

	// Note: This is handled above in tree
	if (isOPDSAuthError(error)) return null

	const errorTitle = error instanceof ZodError ? 'Invalid Feed' : 'Error Loading Feed'
	const errorMessage =
		error instanceof ZodError
			? `This feed does not adhere to the OPDS v1.2 specification. It contains ${error.issues.length} issue${error.issues.length !== 1 ? 's' : ''} that need to be resolved`
			: error instanceof Error && error.message
				? error.message
				: 'There was an error fetching this feed.'

	return (
		<SafeAreaView className="flex-1 items-center justify-center bg-background p-4">
			<View className="w-full flex-1 items-center justify-between gap-8">
				<View className="flex-1 items-center justify-center gap-8">
					<Owl owl="error" />

					<View className="gap-2 px-4 tablet:max-w-lg">
						<Heading size="xl" className="text-center">
							{errorTitle}
						</Heading>

						<Text size="lg" className="text-center">
							{errorMessage}
						</Text>
					</View>
				</View>

				<View className="w-full gap-3">
					<Button
						className="rounded-full"
						size="lg"
						variant="brand"
						onPress={() => router.dismissAll()}
					>
						<Text>Return Home</Text>
					</Button>

					<Button
						className="rounded-full"
						size="lg"
						variant="secondary"
						onPress={() => {
							const issueUrl = getIssueUrl(error)
							Linking.openURL(issueUrl)
						}}
					>
						<Text>Report Issue</Text>
					</Button>

					{onRetry && (
						<Button className="rounded-full" size="lg" variant="ghost" onPress={onRetry}>
							<Text>Try Again</Text>
						</Button>
					)}
				</View>
			</View>
		</SafeAreaView>
	)
}

const getIssueUrl = (error: unknown): string => {
	const labels = ['bug', 'mobile-app']
	const errorTitle =
		error instanceof ZodError ? 'Failed to parse OPDS v1.2 feed' : 'Unknown OPDS v1.2 feed error'

	let errorDetails = '## Error Details\n\n'

	if (error instanceof ZodError) {
		errorDetails += `**Error Type:** ZodError\n\n`
		errorDetails += `**Issues Found:** ${error.issues.length}\n\n`
		errorDetails += '### Validation Issues:\n\n'
		error.issues.forEach((issue, index) => {
			errorDetails += `${index + 1}. **Path:** \`${issue.path.join('.') || 'root'}\`\n`
			errorDetails += `   - **Code:** ${issue.code}\n`
			if ('expected' in issue) {
				errorDetails += `   - **Expected:** ${issue.expected}\n`
			}
			if ('received' in issue) {
				errorDetails += `   - **Received:** ${issue.received}\n`
			}
			errorDetails += `   - **Message:** ${issue.message}\n\n`
		})
	} else if (isAxiosError(error)) {
		errorDetails += `**Error Type:** AxiosError\n\n`
		errorDetails += `**Message:** ${error.message}\n\n`
		if (error.response) {
			errorDetails += `**Status:** ${error.response.status}\n\n`
			errorDetails += `**Response Data:**\n\`\`\`json\n${JSON.stringify(error.response.data, null, 2)}\n\`\`\`\n\n`
		}
	} else if (error instanceof Error) {
		errorDetails += `**Error Type:** ${error.constructor.name}\n\n`
		errorDetails += `**Message:** ${error.message}\n\n`
		if (error.stack) {
			errorDetails += `**Stack:**\n\`\`\`\n${error.stack}\n\`\`\`\n\n`
		}
	} else {
		errorDetails += `**Error Type:** Unknown\n\n`
		errorDetails += `**Details:**\n\`\`\`json\n${JSON.stringify(error, null, 2)}\n\`\`\`\n\n`
	}

	const params = new URLSearchParams({
		title: errorTitle,
		labels: labels.join(','),
		body: errorDetails,
	})

	return `https://github.com/stumpapp/stump/issues/new?${params.toString()}`
}
