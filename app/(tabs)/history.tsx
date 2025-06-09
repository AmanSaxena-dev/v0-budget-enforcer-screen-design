import { View, StyleSheet } from "react-native"
import { TransactionHistory } from "../../components/transactionHistory"
import { ShuffleLimits } from "../../components/shuffleLimits"

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <TransactionHistory />
      <ShuffleLimits />
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
