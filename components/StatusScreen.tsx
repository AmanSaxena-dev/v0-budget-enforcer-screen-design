import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface StatusScreenProps {
  icon: React.ReactNode
  text: string
  color: string
  borderColor: string
  textColor: string
  topText?: string
  subtext?: string
  actionText?: string
  isDivided?: boolean
  dayInfo?: string
  currentSpend?: string
  topBgColor?: string
  topIcon?: React.ReactNode
  tooltipText?: string
  showActionButtons?: boolean
  onYesClick?: () => void
  onNoClick?: () => void
  showDivider?: boolean
  statusText?: string
  leftStatusText?: string
  status?: string
}

export function StatusScreen({
  icon,
  text,
  color,
  borderColor,
  textColor,
  topText,
  subtext,
  actionText,
  isDivided = false,
  dayInfo,
  currentSpend,
  topBgColor = "#15803d",
  topIcon,
  tooltipText,
  showActionButtons = false,
  onYesClick = () => {},
  onNoClick = () => {},
  showDivider = false,
  statusText = "Current State",
  leftStatusText,
  status,
}: StatusScreenProps) {
  if (isDivided) {
    return (
      <ScrollView style={styles.container}>
        {/* Super header for the entire screen */}
        {dayInfo && (
          <View style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{dayInfo}</Text>
          </View>
        )}

        <View style={styles.dividedContainer}>
          {/* Before section - Left side (or top on mobile) */}
          <View style={[styles.currentStateSection, { backgroundColor: topBgColor }]}>
            <Text style={styles.currentStateTitle}>{statusText}</Text>
            <View style={[styles.currentStateIconContainer, { backgroundColor: topBgColor }]}>{topIcon}</View>

            {leftStatusText && <Text style={styles.currentStateText}>{leftStatusText}</Text>}

            <View style={styles.currentSpendContainer}>
              <Text style={styles.currentSpendText}>{currentSpend}</Text>
              <TouchableOpacity style={styles.helpButton}>
                <Ionicons name="help-circle-outline" size={12} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Vertical divider between sections */}
          {showDivider && <View style={styles.divider} />}

          {/* After section - Right side (or bottom on mobile) */}
          <View style={[styles.resultSection, { backgroundColor: color }]}>
            {topText && <Text style={[styles.topText, { color: textColor }]}>{topText}</Text>}
            <View style={[styles.iconContainer, { backgroundColor: color, borderColor }]}>{icon}</View>
            <Text style={[styles.resultText, { color: textColor }]}>{text}</Text>
            {subtext && <Text style={[styles.subtext, { color: textColor }]}>{subtext}</Text>}
            {actionText && <Text style={[styles.actionText, { color: textColor }]}>{actionText}</Text>}

            {showActionButtons && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.yesButton} onPress={onYesClick}>
                  <Text style={styles.yesButtonText}>
                    {status === "budget-breaker" || status === "envelope-empty"
                      ? "Yes, Shuffle Funds"
                      : "Confirm Purchase"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noButton} onPress={onNoClick}>
                  <Text style={styles.noButtonText}>
                    {status === "budget-breaker" || status === "envelope-empty" ? "No, Cancel" : "Cancel"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    )
  }

  // Original non-divided layout
  return (
    <ScrollView style={styles.container}>
      {/* Super header for the entire screen */}
      {dayInfo && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>{dayInfo}</Text>
        </View>
      )}

      <View style={[styles.singleSection, { backgroundColor: color }]}>
        {topText && <Text style={[styles.topText, { color: textColor }]}>{topText}</Text>}
        <View style={[styles.iconContainer, { backgroundColor: color, borderColor }]}>{icon}</View>
        <Text style={[styles.resultText, { color: textColor }]}>{text}</Text>
        {subtext && <Text style={[styles.subtext, { color: textColor }]}>{subtext}</Text>}
        {actionText && <Text style={[styles.actionText, { color: textColor }]}>{actionText}</Text>}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayHeader: {
    backgroundColor: "#374151",
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  dayHeaderText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  dividedContainer: {
    flex: 1,
    flexDirection: "column",
  },
  currentStateSection: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    minHeight: 150,
    justifyContent: "center",
  },
  currentStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  currentStateIconContainer: {
    padding: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "white",
    marginBottom: 8,
  },
  currentStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    marginBottom: 8,
  },
  currentSpendContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentSpendText: {
    fontSize: 14,
    color: "white",
  },
  helpButton: {
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "white",
  },
  resultSection: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
  },
  singleSection: {
    flex: 1,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
  },
  topText: {
    fontSize: 20,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 24,
  },
  iconContainer: {
    padding: 24,
    borderRadius: 48,
    borderWidth: 4,
    marginBottom: 24,
  },
  resultText: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 20,
  },
  actionText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 24,
  },
  yesButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  yesButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  noButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
})
