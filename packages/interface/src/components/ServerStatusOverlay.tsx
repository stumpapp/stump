import { useStumpStore } from '@stump/client'
import { Link, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function ServerStatusOverlay() {
	const { connected } = useStumpStore(({ connected }) => ({ connected }))
	const [show, setShow] = useState(false)

	useEffect(() => {
		let timer: NodeJS.Timer
		// after 4 seconds, if still !connected, show the overlay
		if (!connected) {
			timer = setInterval(() => {
				if (!connected) {
					setShow(true)
				}
			}, 4000)
		} else if (connected) {
			setShow(false)
		}

		return () => {
			clearInterval(timer)
		}
	}, [connected])

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					className="fixed bottom-[1rem] right-[1rem] flex w-64 flex-col items-center justify-center rounded-md bg-white p-3 shadow dark:bg-gray-850"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<div className="flex w-full flex-col gap-1">
						<div className="flex w-full items-center justify-between">
							<Text size="sm">Server is not connected</Text>
							<div className="relative">
								<span className="flex h-2 w-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
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
