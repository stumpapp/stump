export function getDidValuesEffectivelyChange(currentValue: unknown, resolvedValue: unknown) {
	// We have to catch the scenario where resolved value is an empty array but current value is
	// nullish. It also goes both ways, meaning if currentValue is an empty array and resolvedValue is nullish, we should also consider them effectively the same.
	if (
		(Array.isArray(resolvedValue) && resolvedValue.length === 0 && currentValue == null) ||
		(Array.isArray(currentValue) && currentValue.length === 0 && resolvedValue == null)
	) {
		return false
	}

	// We also catch things like '' vs null vs undefined, all effectively being the same
	if (
		(currentValue === '' && resolvedValue == null) ||
		(resolvedValue === '' && currentValue == null)
	) {
		return false
	}

	return JSON.stringify(currentValue) !== JSON.stringify(resolvedValue)
}
