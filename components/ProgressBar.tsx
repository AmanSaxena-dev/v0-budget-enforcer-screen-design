import { View, StyleSheet } from "react-native"

interface ProgressBarProps {
  progress: number
  color?: string
  height?: number
}

export default function ProgressBar({ progress, color = "#22c55e", height = 8 }: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.progress,
          {
            width: `${clampedProgress}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
  },
})
