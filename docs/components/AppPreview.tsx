import { motion } from 'framer-motion'
import { useTheme } from 'nextra-theme-docs'
import { useEffect } from 'react'

export default function AppPreview() {
	const { resolvedTheme } = useTheme()

	//* This is a workaround to preload the other image in the background so if a user
	//* switches themes, the image will already be loaded and there won't be a stutter.
	// ! NOTE: There is a chance that 'system' will pop up first, only then resolving to
	// ! either 'dark' or 'light'. I don't see this as much of an issue, TBH.
	useEffect(() => {
		let imageUrl = 'demo-light.png'
		if (resolvedTheme !== 'dark') {
			imageUrl = 'demo-dark.png'
		}

		const image = new Image()
		image.src = `/${imageUrl}`
	}, [resolvedTheme])

	return (
		<div className="relative -mt-7 h-[432px] w-full sm:p-0 lg:h-[700px]">
			<div className="relative h-full">
				<motion.div
					initial={{ opacity: 0, scale: 0.75 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.5, duration: 1 }}
					className="z-40 flex h-full w-[650px] flex-1 self-center bg-[url('/demo-light.png')] bg-contain bg-[center_top] bg-no-repeat sm:w-auto dark:bg-[url('/demo-dark.png')]"
				/>
			</div>
		</div>
	)
}
