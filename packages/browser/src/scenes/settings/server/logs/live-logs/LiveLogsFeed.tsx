import { useGraphQLSubscriptionCache } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useEffect, useRef } from 'react'
import stripAnsi from 'strip-ansi'

const subscription = graphql(`
	subscription LiveLogsFeed {
		tailLogFile
	}
`)

/**
 * A component that displays a live feed of logs from the server
 */
export default function LiveLogsFeed() {
	const [data, , dispose] = useGraphQLSubscriptionCache(subscription)

	const scrollRef = useRef<HTMLDivElement>(null)
	const logContainerRef = useRef<HTMLDivElement>(null)

	useEffect(
		() => {
			return () => {
				dispose()
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	// whenever a new log is added to the buffer, we want to scroll to the bottom of the logs
	useEffect(() => {
		logContainerRef.current?.scrollTo({
			behavior: 'smooth',
			top: logContainerRef.current.scrollHeight,
		})
	}, [data])

	return (
		<div className="h-72 rounded-md bg-background-surface p-4">
			<div
				ref={logContainerRef}
				className="flex max-h-full flex-col gap-y-1.5 overflow-y-auto font-mono text-sm text-foreground-subtle"
			>
				{data?.map(({ tailLogFile: log }, index) => (
					<span key={`live-log-${index}`}>{stripAnsi(log)}</span>
				))}
				<div ref={scrollRef} />
			</div>
		</div>
	)
}
