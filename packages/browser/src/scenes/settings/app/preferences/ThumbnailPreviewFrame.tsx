import { cn } from '@stump/components'
import { ThumbnailPlaceholderStyle } from '@stump/graphql'
import type { ReactNode } from 'react'

type ThumbnailPreviewFrameProps = {
	style: ThumbnailPlaceholderStyle
	ratio?: number
	children?: ReactNode
	className?: string
}

// Note that these are really just rough approximations of the actual placeholder styles
export default function ThumbnailPreviewFrame({
	style,
	ratio,
	children,
	className,
}: ThumbnailPreviewFrameProps) {
	const hasCustomRatio = ratio != null

	return (
		<div className="flex h-full w-full items-center justify-center">
			<div
				className={cn(
					'rounded-md border border-border',
					hasCustomRatio ? 'h-full max-h-full' : 'aspect-2/3 h-full',
					{
						'from-zinc-500 to-zinc-700 bg-linear-to-br':
							style === ThumbnailPlaceholderStyle.Grayscale,
					},
					{
						'from-slate-500 to-slate-700 bg-linear-to-br':
							style === ThumbnailPlaceholderStyle.AverageColor,
					},
					{
						'from-orange-500 via-pink-500 to-cyan-500 bg-linear-to-br':
							style === ThumbnailPlaceholderStyle.Colorful,
					},
					{
						'bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65)_0%,transparent_35%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.65)_0%,transparent_45%),radial-gradient(circle_at_50%_80%,rgba(244,114,182,0.65)_0%,transparent_45%),linear-gradient(135deg,rgba(51,65,85,1),rgba(15,23,42,1))]':
							style === ThumbnailPlaceholderStyle.Thumbhash,
					},
					className,
				)}
				style={hasCustomRatio ? { aspectRatio: ratio } : undefined}
			>
				{children}
			</div>
		</div>
	)
}
