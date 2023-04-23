import clsx from 'clsx'
import Link from 'next/link'

import { STUMP_REPO } from '../theme.config'

type Props = {
	className?: string
	filePath?: string
}
export default function HelpDocsCTA({ className, filePath }: Props) {
	const href = filePath ? `${STUMP_REPO}/tree/main/apps/docs/${filePath}` : undefined
	return (
		<Link
			href={href}
			className={clsx('flex items-center space-x-2', className)}
			target="_blank"
			rel="noopener noreferrer"
		>
			<p>Help improve this page</p>
			<svg
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
				className="h-4 w-4"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
				/>
			</svg>
		</Link>
	)
}
