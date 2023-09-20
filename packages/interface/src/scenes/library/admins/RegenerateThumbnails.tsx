import { Button, DropdownMenu } from '@stump/components'
import { AlertTriangle, ChevronDown, FolderSearch2, ImagePlus } from 'lucide-react'
import React from 'react'

type Props = {
	onRegenerate(force: boolean): void
}
export default function RegenerateThumbnails({ onRegenerate }: Props) {
	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<DropdownMenu
			trigger={
				<Button size="md" variant="outline">
					Create thumbnails
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
	)
}
