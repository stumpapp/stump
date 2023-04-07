export function FullScreenLoader() {
	return (
		<div className="min-w-screen flex min-h-screen items-center justify-center p-5">
			<div className="flex animate-pulse space-x-2">
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
			</div>
		</div>
	)
}
