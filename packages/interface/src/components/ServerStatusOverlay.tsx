import { useStumpStore } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

// FIXME: make this not as ugly lol
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
					className="fixed bottom-[1rem] right-[1rem] flex w-64 flex-col items-center justify-center rounded-md bg-white p-2 shadow dark:bg-gray-700"
					initial={{ opacity: 0, scale: 0.9, y: 100 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.9, y: 100 }}
				>
					<div className="flex w-full flex-col space-y-3">
						<div className="flex w-full items-center space-x-6">
							<div className="relative">
								<span className="flex h-3 w-3">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
								</span>
							</div>

							<Heading size="xs">Server isn&rsquo;t connected.</Heading>
						</div>

						<Text className="italic" size="sm" variant="muted">
							Please check your internet connection.{' '}
							<a className="hover:underline" href="/server-connection-error">
								Click here
							</a>{' '}
							to change your server URL.
						</Text>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
