import { Button, DropdownMenu } from '@stump/components'
import { AlertTriangle, FolderSearch2 } from 'lucide-react'
import React from 'react'

type Props = {
	onRegenerate(force: boolean): void
}
export default function RegenerateThumbnails({ onRegenerate }: Props) {
	const iconStyle = 'mr-2 h-4 w-4'

	return (
		<DropdownMenu
			trigger={<Button>Regenerate Thumbnails</Button>}
			groups={[
				{
					items: [
						{
							label: 'Generate missing',
							leftIcon: <FolderSearch2 className={iconStyle} />,
							onClick: () => onRegenerate(false),
						},
						{
							label: 'Regenerate all',
							leftIcon: <AlertTriangle className={iconStyle} />,
							onClick: () => onRegenerate(true),
						},
					],
				},
			]}
		/>
	)
}
