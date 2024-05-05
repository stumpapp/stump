import { Button, DropdownMenu, Label, Text } from '@stump/components'
import { AlertTriangle, ChevronDown, ImagePlus } from 'lucide-react'
import React from 'react'

type Props = {
	onRegenerate(force: boolean): void
}
export default function RegenerateThumbnails({ onRegenerate }: Props) {
	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<div className="flex flex-col gap-4">
			<div>
				<Label>Regenerate thumbnails</Label>
				<Text size="sm" variant="muted">
					Either generate missing thumbnails or force the recreation of all thumbnails
				</Text>
			</div>

			<div>
				<DropdownMenu
					trigger={
						<Button size="md" variant="outline">
							Generate thumbnails
							<ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					}
					groups={[
						{
							items: [
								{
									label: 'Create missing only',
									leftIcon: <ImagePlus className={iconStyle} />,
									onClick: () => onRegenerate(false),
								},
								{
									label: 'Force recreate all',
									leftIcon: <AlertTriangle className={iconStyle} />,
									onClick: () => onRegenerate(true),
								},
							],
						},
					]}
					align="start"
				/>
			</div>
		</div>
	)
}
