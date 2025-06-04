"use client"

import { useContext, useEffect } from "react"
import { View, StyleSheet, ScrollView } from "react-native"
import { BudgetContext, useBudget } from "../../context/budget-context"
import { useNavigation } from "@react-navigation/native"
import PeriodInfo from "../../components/PeriodInfo"
import EnvelopeList from "../../components/EnvelopeList"
import PurchaseSimulator from "../../components/PurchaseSimulator"
import { SafeAreaView } from "react-native-safe-area-context"

export default function HomeScreen() {
  const { envelopes, setCurrentEnvelope, currentEnvelope, currentPurchase, statusResult } = useBudget()
  const navigation = useNavigation()

  // Set the first envelope as current when component mounts if none is selected
  useEffect(() => {
    if (envelopes.length > 0 && !currentEnvelope) {
      setCurrentEnvelope(envelopes[0])
    }
  }, [envelopes])

  // Navigate to status screen when a purchase is simulated
  useEffect(() => {
    console.log(currentPurchase, statusResult);
    
    if (currentPurchase && statusResult) {
      navigation.navigate("Status" as never)
    }
  }, [currentPurchase, statusResult])

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <PeriodInfo />

          <View style={styles.section}>
            <EnvelopeList />
          </View>

          <View style={styles.section}>
            <PurchaseSimulator />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  section: {
    marginBottom: 16,
  },
})
