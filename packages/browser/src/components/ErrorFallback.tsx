import { Button, ButtonOrLink, useBodyLock } from '@stump/components'
import { ExternalLink } from 'lucide-react'
import { FallbackProps } from 'react-error-boundary'
import toast from 'react-hot-toast'

import { copyTextToClipboard } from '../utils/misc'

// TODO: take in platform?
export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	useBodyLock()

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
			className="flex h-full w-full flex-col items-center justify-center overflow-hidden"
		>
			<img
				src="/assets/svg/bomb.svg"
				alt="Construction illustration"
				className="mx-auto hidden max-h-64 w-1/2 shrink-0 object-scale-down sm:inline-block"
			/>
			<div className="max-w-sm sm:max-w-md md:max-w-xl">
				<div className="text-left">
					<h1 className="text-4xl font-semibold text-foreground">A critical error occurred</h1>
					<p className="mt-1.5 text-lg text-foreground-subtle">
						{error.message || 'The error message was empty.'}
					</p>
				</div>
				<div className="flex w-full items-center gap-3 pt-3">
					<ButtonOrLink
						variant="primary"
						onClick={resetErrorBoundary}
						title="Go back to the homepage"
						forceAnchor
						href="/"
					>
						Go Home
					</ButtonOrLink>
					<ButtonOrLink
						title="Report this error as a potential bug on GitHub"
						href="https://github.com/stumpapp/stump/issues/new/choose"
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
			</div>
		</div>
	)
}
