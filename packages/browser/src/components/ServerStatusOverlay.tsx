import { Link, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { useAppStore } from '@/stores'

export default function ServerStatusOverlay() {
	const [show, setShow] = useState(false)

	const isConnected = useAppStore((store) => store.isConnectedWithServer)

	useEffect(() => {
		let timer: NodeJS.Timeout
		// after 4 seconds, if still !connected, show the overlay
		if (!isConnected) {
			timer = setInterval(() => {
				if (!isConnected) {
					setShow(true)
				}
			}, 4000)
		} else if (isConnected) {
			setShow(false)
		}

		return () => {
			clearInterval(timer)
		}
	}, [isConnected])

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					// @ts-expect-error: It is there I promise
					className="bottom-4 right-4 w-64 rounded-md p-3 shadow fixed flex flex-col items-center justify-center bg-background-surface"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<div className="gap-1 flex w-full flex-col">
						<div className="flex w-full items-center justify-between">
							<Text size="sm">Server is not connected</Text>
							<div className="relative">
								<span className="h-2 w-2 flex">
									<span className="animate-ping bg-red-400 absolute inline-flex h-full w-full rounded-full opacity-75"></span>
									<span className="h-2 w-2 bg-red-500 relative inline-flex rounded-full"></span>
								</span>
							</div>
						</div>

						<Text size="xs" variant="muted">
							Please check your internet connection.{' '}
							<Link to="/server-connection-error" className="underline">
								Click here
							</Link>{' '}
							to change your server URL.
						</Text>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
