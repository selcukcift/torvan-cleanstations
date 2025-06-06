"use client"

import { useState } from "react"
import { useOrderCreateStore } from "@/stores/orderCreateStore"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage
} from "@/components/ui/breadcrumb"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Import step components
import { CustomerInfoStep } from "./CustomerInfoStep"
import { SinkSelectionStep } from "./SinkSelectionStep"
import ConfigurationStep from "./ConfigurationStep"
import { AccessoriesStep } from "./AccessoriesStep"
import { ReviewStep } from "./ReviewStep"

const steps = [
  { number: 1, title: "Customer Info", description: "Order details and customer information" },
  { number: 2, title: "Sink Selection", description: "Choose sink model and quantities" },
  { number: 3, title: "Configuration", description: "Configure each sink specification" },
  { number: 4, title: "Accessories", description: "Select optional accessories" },
  { number: 5, title: "Review", description: "Review and submit order" }
]

interface OrderWizardProps {
  isEditMode?: boolean
  orderId?: string
}

export function OrderWizard({ isEditMode = false, orderId }: OrderWizardProps) {
  const { currentStep, setCurrentStep, isStepValid, sinkSelection } = useOrderCreateStore()

  const handleNext = () => {
    if (currentStep < 5 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepNumber: number) => {
    // Allow navigating to previous steps or next step if current is valid
    if (stepNumber < currentStep || (stepNumber === currentStep + 1 && isStepValid(currentStep))) {
      setCurrentStep(stepNumber)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CustomerInfoStep />
      case 2:
        return <SinkSelectionStep />
      case 3:
        return <ConfigurationStep buildNumbers={sinkSelection.buildNumbers} onComplete={() => setCurrentStep(4)} />
      case 4:
        return <AccessoriesStep />
      case 5:
        return <ReviewStep isEditMode={isEditMode} orderId={orderId} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <Card className="shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <Breadcrumb>
            <BreadcrumbList>
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <BreadcrumbItem>
                    {step.number === currentStep ? (
                      <BreadcrumbPage className="font-semibold text-blue-600">
                        {step.title}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className={`cursor-pointer transition-colors ${
                          step.number < currentStep
                            ? "text-green-600 hover:text-green-700"
                            : step.number === currentStep + 1 && isStepValid(currentStep)
                            ? "text-blue-500 hover:text-blue-600"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => handleStepClick(step.number)}
                      >
                        {step.title}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < steps.length - 1 && <BreadcrumbSeparator />}
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Step Progress Indicators */}
          <div className="mt-6 flex items-center space-x-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.number === currentStep
                      ? "bg-blue-600 text-white"
                      : step.number < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step.number}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {step.number < steps.length && (
                  <div className="hidden sm:block w-8 h-px bg-gray-200 mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card className="shadow-lg border-0 bg-white">
        <CardContent className="p-8">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center space-x-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>

        {currentStep !== 3 && (
          <Button
            onClick={handleNext}
            disabled={currentStep === 5 || !isStepValid(currentStep)}
            className="flex items-center space-x-2"
          >
            <span>{currentStep === 5 ? "Submit Order" : "Next"}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {currentStep === 3 && (
          <div className="text-sm text-slate-600 italic">
            Use the "Next Section" buttons within the configuration to proceed
          </div>
        )}
      </div>
    </div>
  )
}
