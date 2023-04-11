import { motion } from 'framer-motion'

// TODO: optimize images
export default function AppPreview() {
	return (
		<div className="relative -mt-7 h-[432px] w-full sm:p-0 lg:h-[700px]">
			<div className="relative h-full">
				<motion.div
					initial={{ opacity: 0, scale: 0.75 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.5, duration: 1 }}
					className="z-40 flex h-full w-[650px] flex-1 self-center bg-[url('/demo-fallback--light.png')] bg-contain bg-[center_top] bg-no-repeat dark:bg-[url('/demo-fallback--dark.png')] sm:w-auto"
				/>
			</div>
		</div>
	)
}
