export function FullScreenLoader() {
	return (
		<div className="p-5 flex min-h-screen min-w-screen items-center justify-center">
			<div className="animate-pulse space-x-2 flex">
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
				<div className="h-3 w-3 rounded-full bg-gray-500 dark:bg-gray-400"></div>
			</div>
		</div>
	)
}
