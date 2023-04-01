export function EntityCoverCard() {
	return (
		<div className="max-w-[16rem] rounded-md bg-gray-50 shadow dark:bg-gray-950">
			<div className="px-1.5">
				<img
					className="min-h-96 w-full object-cover [aspect-ratio:663/1024]"
					// src={getSeriesThumbnail(series.id)}
				/>
			</div>
		</div>
	)
}
