import { Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { useCpuUsage, useFpsJs, useFpsUi, useMemoryUsage } from 'react-native-performance-toolkit'

export function PerformanceMonitor({ style }: { style: StyleProp<ViewStyle> }) {
	const uiFps = useFpsUi()
	const jsFps = useFpsJs()
	const memory = useMemoryUsage()
	const cpu = useCpuUsage()

	return (
		<View style={[styles.container, style]}>
			<View style={styles.statColumn}>
				<Text style={styles.label}>UI</Text>
				<Text style={styles.value}>{uiFps}</Text>
			</View>

			<View style={styles.statColumn}>
				<Text style={styles.label}>JS</Text>
				<Text style={styles.value}>{jsFps}</Text>
			</View>

			<View style={styles.statColumn}>
				<Text style={styles.label}>MB</Text>
				<Text style={styles.value}>{memory}</Text>
			</View>

			<View style={styles.statColumn}>
				<Text style={styles.label}>CPU</Text>
				<Text style={styles.value}>{cpu}%</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		position: 'absolute',
		alignSelf: 'center',
		zIndex: 9999,
		padding: 4,
		borderRadius: 10,
		overflow: 'hidden',
		borderCurve: 'continuous',
		pointerEvents: 'none',
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
	},
	statColumn: {
		alignItems: 'center',
		minWidth: 40,
		gap: 2,
	},
	label: {
		color: '#bbb',
		fontSize: 11,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontVariant: ['tabular-nums'],
	},
	value: {
		color: '#fff',
		fontSize: 14,
		fontWeight: 'bold',
		fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
		fontVariant: ['tabular-nums'],
	},
})
