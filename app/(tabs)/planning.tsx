import { View, StyleSheet } from "react-native"
import { PeriodPlannerV2 } from "../../components/periodPlanner"

export default function PlanningScreen() {
  return (
    <View style={styles.container}>
      <PeriodPlannerV2 />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
})
