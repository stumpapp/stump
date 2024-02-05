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

	useEffect(() => {
		if (!source) {
			const newSource = new EventSource('/api/logs/live')
			newSource.onmessage = (event) => {
				const newLog = event.data
				setLogsBuffer((prevLogs) => {
					const newLogs = [...prevLogs, newLog]
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
		scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [logsBuffer])

	return (
		<div style={{ fontFamily: 'monospace', maxHeight: '100%', overflowY: 'auto', padding: '1rem' }}>
			{logsBuffer.map((log, index) => (
				<div key={index}>{log}</div>
			))}
			<div ref={scrollRef} />
		</div>
	)
}
