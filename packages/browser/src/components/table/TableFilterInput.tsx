import { useDebounce } from 'rooks'

type Props = {
	onChange: (value: string) => void
}
export default function TableSearchInput({ onChange }: Props) {
	const handleChange = useDebounce(onChange, 750)

	return (
		<input
			type="text"
			placeholder="Filter data"
			className="block w-full border-b border-edge bg-transparent py-1.5 pl-2 pr-20 text-sm leading-6 text-foreground outline-none placeholder:text-foreground-muted"
			onChange={(e) => handleChange(e.target.value)}
		/>
	)
}

{
	/* <div className="relative rounded-md shadow-sm">
							<input />
							<DebouncedInput
								placeholder="Filter"
								fullWidth
								className="pr-12"
								onInputStop={(value) => handleFilter(value)}
								size="sm"
								rounded="md"
							/> 
							<div className="absolute inset-y-0 right-0 flex items-center">
								<select
									ref={filterColRef}
									id="currency"
									name="currency"
									className="h-full appearance-none rounded-md border-transparent bg-transparent py-0 px-4 text-center text-sm focus:outline-brand"
								>
									{headers.map((column) => (
										<option key={column.id} value={column.id}>
											{column.header}
										</option>
									))}
								</select>
							</div>
						</div> */
}
