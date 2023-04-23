import clsx from 'clsx'
import { useState } from 'react'

type Props = React.ComponentProps<'img'>

//  TODO: improve image loading here, looks doggy doody right now
export default function LazyImage({ src, className, ...props }: Props) {
	const [isLoaded, setIsLoaded] = useState(false)

	return (
		<>
			<img className={clsx({ hidden: isLoaded }, 'h-full bg-transparent', className)} {...props} />

			<img
				src={src}
				{...props}
				className={clsx({ hidden: !isLoaded }, className)}
				onLoad={() => setIsLoaded(true)}
			/>
		</>
	)
}
