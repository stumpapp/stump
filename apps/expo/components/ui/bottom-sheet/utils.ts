const isPercentage = (value: string | number) =>
	value && typeof value === 'string' && value.includes('%')

const toDecimal = (value: string) => Number(value.replace('%', '')) / 100

const convertSnapPoints = (snapPoints: string[]) =>
	snapPoints.map((point) => (isPercentage(point) ? toDecimal(point) : `${point}px`))

export { convertSnapPoints }
