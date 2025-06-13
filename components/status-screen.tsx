"use client"

import type { ReactNode } from "react"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

interface StatusScreenProps {
  icon: ReactNode
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
  topIcon?: ReactNode
  tooltipText?: string
  showActionButtons?: boolean
  onYesClick?: () => void
  onNoClick?: () => void
  showDivider?: boolean
  statusText?: string
  leftStatusText?: string
  status?: string
}

export default function StatusScreen({
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
  topBgColor = "bg-green-700",
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
      <div className="flex flex-col rounded-lg overflow-hidden">
        {/* Super header for the entire screen */}
        {dayInfo && (
          <div className="w-full bg-gray-800 text-white py-3 px-6 text-center">
            <h1 className="text-xl font-bold">{dayInfo}</h1>
          </div>
        )}

        <div className="flex flex-col md:flex-row h-[500px] relative">
          {/* Before section - Left side (or top on mobile) */}
          <div
            className={`${topBgColor} text-white p-6 flex flex-col items-center justify-center 
                          w-full md:w-[40%] min-h-[125px] md:min-h-0`}
          >
            <h2 className="text-xl font-bold mb-4">{statusText}</h2>
            <div className={`p-2 rounded-full ${topBgColor} border-2 border-white mb-2`}>{topIcon}</div>

            {leftStatusText && <p className="text-sm font-medium mb-2">{leftStatusText}</p>}

            <div className="flex items-center">
              <p className="text-sm">{currentSpend}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 cursor-help">
                      <HelpCircle className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[250px] p-3">
                    <p>{tooltipText || "Additional information"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Vertical divider between sections (only visible on md and up) */}
          {showDivider && <div className="hidden md:block absolute left-[40%] top-0 w-[1px] h-full bg-white"></div>}

          {/* Horizontal divider for mobile */}
          {showDivider && <div className="md:hidden absolute left-0 top-[125px] w-full h-[1px] bg-white"></div>}

          {/* After section - Right side (or bottom on mobile) */}
          <div className={`${color} p-6 flex flex-col items-center justify-center w-full md:w-[60%]`}>
            {topText && <p className={`text-xl font-medium ${textColor} mb-6 text-center`}>{topText}</p>}
            <div className={`p-6 rounded-full ${color} border-4 ${borderColor} mb-6`}>{icon}</div>
            <h1 className={`text-3xl font-bold ${textColor} mb-4`}>{text}</h1>
            {subtext && <p className={`text-sm ${textColor} mt-4 text-center`}>{subtext}</p>}
            {actionText && <p className={`text-sm ${textColor} mt-2 text-center font-medium`}>{actionText}</p>}

            {showActionButtons && (
              <div className="flex space-x-4 mt-6">
                <Button onClick={onYesClick} className="bg-green-600 hover:bg-green-700">
                  {status === "budget-breaker" || status === "envelope-empty"
                    ? "Yes, Shuffle Funds"
                    : "Confirm Purchase"}
                </Button>
                <Button onClick={onNoClick} variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                  {status === "budget-breaker" || status === "envelope-empty" ? "No, Cancel" : "Cancel"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Original non-divided layout
  return (
    <div className="flex flex-col rounded-lg overflow-hidden">
      {/* Super header for the entire screen */}
      {dayInfo && (
        <div className="w-full bg-gray-800 text-white py-3 px-6 text-center">
          <h1 className="text-xl font-bold">{dayInfo}</h1>
        </div>
      )}

      <div className={`flex flex-col items-center justify-center p-8 ${color} min-h-[400px] relative`}>
        {topText && <p className={`text-sm ${textColor} mb-6 text-center`}>{topText}</p>}
        <div className={`p-6 rounded-full ${color} border-4 ${borderColor} mb-6`}>{icon}</div>
        <h1 className={`text-3xl font-bold ${textColor} mb-4`}>{text}</h1>
        {subtext && <p className={`text-sm ${textColor} mt-8 text-center`}>{subtext}</p>}
        {actionText && <p className={`text-sm ${textColor} mt-2 text-center font-medium`}>{actionText}</p>}
      </div>
    </div>
  )
}
