import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const StatusScreen = ({
  icon,
  text,
  color,
  textColor,
  topText,
  subtext,
  actionText,
  isDivided = false,
  dayInfo,
  currentSpend,
  topBgColor = "#16a34a",
  topIcon,
  tooltipText,
  showActionButtons = false,
  onYesClick = () => {},
  onNoClick = () => {},
  showDivider = false,
  statusText = "Current State",
  leftStatusText,
  status,
}) => {
  if (isDivided) {
    return (
      <View style={styles.container}>
        {dayInfo && (
          <View style={styles.superHeader}>
            <Text style={styles.superHeaderText}>{dayInfo}</Text>
          </View>
        )}

        <View style={styles.dividedContainer}>
          {/* Before section - Left side */}
          <View style={[styles.leftSection, { backgroundColor: topBgColor }]}>
            <Text style={styles.statusTitle}>{statusText}</Text>
            <View style={[styles.iconContainer, { backgroundColor: topBgColor }]}>{topIcon}</View>
            {leftStatusText && <Text style={styles.leftStatusText}>{leftStatusText}</Text>}
            <View style={styles.currentSpendContainer}>
              <Text style={styles.currentSpendText}>{currentSpend}</Text>
              <Ionicons name="help-circle-outline" size={12} color="white" style={styles.helpIcon} />
            </View>
          </View>

          {/* Vertical divider */}
          {showDivider && <View style={styles.verticalDivider} />}

          {/* After section - Right side */}
          <View style={[styles.rightSection, { backgroundColor: color }]}>
            {topText && <Text style={[styles.topText, { color: textColor }]}>{topText}</Text>}
            <View style={styles.mainIconContainer}>{icon}</View>
            <Text style={[styles.mainText, { color: textColor }]}>{text}</Text>
            {subtext && <Text style={[styles.subtext, { color: textColor }]}>{subtext}</Text>}
            {actionText && <Text style={[styles.actionText, { color: textColor }]}>{actionText}</Text>}

            {showActionButtons && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={onYesClick}>
                  <Text style={styles.confirmButtonText}>
                    {status === "budget-breaker" || status === "envelope-empty"
                      ? "Yes, Shuffle Funds"
                      : "Confirm Purchase"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={onNoClick}>
                  <Text style={styles.cancelButtonText}>
                    {status === "budget-breaker" || status === "envelope-empty" ? "No, Cancel" : "Cancel"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  // Original non-divided layout
  return (
    <View style={styles.container}>
      {dayInfo && (
        <View style={styles.superHeader}>
          <Text style={styles.superHeaderText}>{dayInfo}</Text>
        </View>
      )}

      <View style={[styles.singleContainer, { backgroundColor: color }]}>
        {topText && <Text style={[styles.topText, { color: textColor }]}>{topText}</Text>}
        <View style={styles.mainIconContainer}>{icon}</View>
        <Text style={[styles.mainText, { color: textColor }]}>{text}</Text>
        {subtext && <Text style={[styles.subtext, { color: textColor }]}>{subtext}</Text>}
        {actionText && <Text style={[styles.actionText, { color: textColor }]}>{actionText}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
  },
  superHeader: {
    backgroundColor: "#1f2937",
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  superHeaderText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  dividedContainer: {
    flexDirection: "row",
    height: 500,
    position: "relative",
  },
  leftSection: {
    width: "40%",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 125,
  },
  rightSection: {
    width: "60%",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  verticalDivider: {
    position: "absolute",
    left: "40%",
    top: 0,
    width: 1,
    height: "100%",
    backgroundColor: "white",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "white",
    marginBottom: 8,
  },
  leftStatusText: {
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
  helpIcon: {
    marginLeft: 4,
  },
  topText: {
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 24,
    textAlign: "center",
  },
  mainIconContainer: {
    padding: 24,
    borderRadius: 50,
    borderWidth: 4,
    marginBottom: 24,
  },
  mainText: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  subtext: {
    fontSize: 14,
    marginTop: 32,
    textAlign: "center",
  },
  actionText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 24,
    gap: 16,
  },
  confirmButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "500",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: "#ef4444",
    fontWeight: "500",
  },
  singleContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    minHeight: 400,
  },
})

export default StatusScreen
