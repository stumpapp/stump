import { API } from '@stump/api'
import React, { useEffect, useRef, useState } from 'react'

const MAX_BUFFER_SIZE = 1000

/**
 * A component that displays a live feed of logs from the server. The feed is served by
 * a SSE (Server-Sent Events) endpoint on the server.
 */
export default function LiveLogsFeed() {
	const [source, setSource] = useState<EventSource | null>(null)

	/**
	 * The buffer of logs that have been received from the server. There is a limit to the
	 * number of logs that can be displayed at once, so this buffer will be cleared when
	 * it reaches a certain size.
	 */
	const [logsBuffer, setLogsBuffer] = useState<string[]>([])

	const scrollRef = useRef<HTMLDivElement>(null)
	const logContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!source) {
			const URI = API?.getUri()

			const newSource = new EventSource(`${URI}/logs/file/tail`, {
				withCredentials: true,
			})
			newSource.onmessage = (event) => {
				const newLog = event.data as string
				// remove the " at the first and last character of the string
				const formattedLog = newLog.slice(1, newLog.length - 1)
				setLogsBuffer((prevLogs) => {
					const newLogs = [...prevLogs, formattedLog]
					if (newLogs.length > MAX_BUFFER_SIZE) {
						return newLogs.slice(newLogs.length - MAX_BUFFER_SIZE)
					}
					return newLogs
				})
			}

			newSource.onerror = () => {
				// If the connection is lost, we will attempt to reconnect after a short delay.
				setTimeout(() => {
					setSource(null)
				}, 1000)
			}

			setSource(newSource)
		}
		return () => {
			source?.close()
		}
	}, [source])

	// whenever a new log is added to the buffer, we want to scroll to the bottom of the logs
	useEffect(() => {
		logContainerRef.current?.scrollTo({
			behavior: 'smooth',
			top: logContainerRef.current.scrollHeight,
		})
	}, [logsBuffer])

	// TODO: Syntax highlighting for logs
	return (
		<div className="h-72 bg-background-surface p-4">
			<div
				ref={logContainerRef}
				className="flex max-h-full flex-col gap-y-1.5 overflow-y-auto font-mono text-sm text-foreground-subtle"
			>
				{logsBuffer.map((log, index) => (
					<span key={index}>{log}</span>
				))}
				<div ref={scrollRef} />
			</div>
		</div>
	)
}
