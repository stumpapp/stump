import { motion } from 'framer-motion'

// TODO: optimize images
export default function AppPreview() {
	return (
		<div className="w-full relative h-[432px] lg:h-[700px] sm:p-0 -mt-7">
			<div className="relative h-full">
				<motion.div
					initial={{ opacity: 0, scale: 0.75 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.5, duration: 1 }}
					className="z-40 h-full flex self-center flex-1 w-[650px] sm:w-auto bg-contain bg-no-repeat bg-[center_top] bg-[url('/demo-fallback--light.png')] dark:bg-[url('/demo-fallback--dark.png')]"
				/>
			</div>
		</div>
	)
}
