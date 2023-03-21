import { Button, ButtonOrLink, Heading, Text } from '@stump/components'
import { ExternalLink } from 'lucide-react'
import { FallbackProps } from 'react-error-boundary'
import toast from 'react-hot-toast'

import { copyTextToClipboard } from '../utils/misc'

// TODO: take in platform?
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	function copyErrorStack() {
		if (error.stack) {
			copyTextToClipboard(error.stack).then(() => {
				toast.success('Copied error details to your clipboard')
			})
		}
	}

	return (
		<div
			data-tauri-drag-region
			className="mx-auto flex flex-col items-center justify-center gap-2 pt-12 md:pt-16"
		>
			<Heading as="h4" size="sm">
				lol, oops
			</Heading>

			<Heading as="h2" size="lg">
				An error occurred:
			</Heading>

			<Text className="max-w-4xl text-center" size="lg">
				{error.message}
			</Text>

			<div className="mx-auto mt-4 flex flex-col gap-2">
				{error.stack && (
					<code className="rounded-md bg-gray-75 p-4 dark:bg-gray-800">
						<Text className="max-h-96 max-w-4xl overflow-auto">
							<code>{error.stack}</code>
						</Text>
					</code>
				)}

				<div className="flex w-full items-center justify-between pt-3">
					<div className="flex items-center gap-2">
						<ButtonOrLink
							title="Report this error as a potential bug on GitHub"
							href="https://github.com/aaronleopold/stump/issues/new/choose"
							target="_blank"
						>
							Report Bug <ExternalLink className="ml-2 h-4 w-4" />
						</ButtonOrLink>
						{error.stack && (
							<Button
								title="Copy the error details to your clipboard"
								onClick={copyErrorStack}
								variant="ghost"
							>
								Copy Error Details
							</Button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<ButtonOrLink
							variant="primary"
							onClick={resetErrorBoundary}
							title="Go back to the homepage"
							forceAnchor
							href="/"
						>
							Go Home
						</ButtonOrLink>
					</div>
				</div>
			</div>
		</div>
	)
}
