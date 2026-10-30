import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string | number;
  title: string;
  subtitle?: string;
  isCompleted?: boolean;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className = '',
}: StepperProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Version Desktop / Tablette */}
      <nav aria-label="Progression du parcours" className="hidden sm:block">
        <ol className="flex items-center divide-x divide-enp-border border border-enp-border bg-white">
          {steps.map((step, idx) => {
            const isCompleted = step.isCompleted ?? idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isClickable = Boolean(onStepClick) && (isCompleted || isCurrent);

            return (
              <li
                key={step.id}
                onClick={isClickable && onStepClick ? () => onStepClick(idx) : undefined}
                className={`flex-1 p-3.5 transition-colors ${
                  isClickable ? 'cursor-pointer hover:bg-enp-blue-ice/50' : ''
                } ${isCurrent ? 'bg-enp-blue-ice border-b-2 border-b-enp-blue-primary' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 border flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCompleted
                        ? 'bg-enp-green-valid text-white border-enp-green-valid'
                        : isCurrent
                        ? 'bg-enp-blue-primary text-white border-enp-blue-primary'
                        : 'bg-white text-enp-gray-medium border-enp-border'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wider truncate ${
                        isCurrent
                          ? 'text-enp-blue-deep'
                          : isCompleted
                          ? 'text-enp-black'
                          : 'text-enp-gray-medium'
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.subtitle && (
                      <p className="text-[11px] text-enp-gray-medium truncate">{step.subtitle}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Version Mobile compacte */}
      <div className="sm:hidden bg-white border border-enp-border p-3 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-6 h-6 bg-enp-blue-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
            {currentStepIndex + 1}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-enp-blue-deep truncate">
            {steps[currentStepIndex]?.title}
          </span>
        </div>
        <span className="text-xs font-medium text-enp-gray-medium shrink-0">
          Étape {currentStepIndex + 1}/{steps.length}
        </span>
      </div>
    </div>
  );
}

