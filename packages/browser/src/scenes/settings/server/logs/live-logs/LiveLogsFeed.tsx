import { useGraphQLSubscriptionCache } from '@stump/client'
import { graphql } from '@stump/graphql'
import Ansi from 'ansi-to-react'
import { useEffect, useRef } from 'react'

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

	useEffect(() => {
		return () => {
			dispose()
		}
	}, [dispose])

	// whenever a new log is added to the buffer, we want to scroll to the bottom of the logs
	useEffect(() => {
		logContainerRef.current?.scrollTo({
			behavior: 'smooth',
			top: logContainerRef.current.scrollHeight,
		})
	}, [data])

	return (
		<div className="h-72 rounded-md p-4 bg-background-surface">
			<div
				ref={logContainerRef}
				className="gap-y-1.5 font-mono text-sm flex max-h-full flex-col overflow-y-auto text-foreground-subtle"
			>
				{data?.map(({ tailLogFile: log }, index) => (
					<span key={`live-log-${index}`}>
						<Ansi>{log}</Ansi>
					</span>
				))}
				<div ref={scrollRef} />
			</div>
		</div>
	)
}
