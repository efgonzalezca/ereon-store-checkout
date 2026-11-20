import { CheckoutSection, DataSection } from '../state/checkout.types';

const STEPS: ReadonlyArray<{ section: CheckoutSection; label: string }> = [
  { section: 1, label: 'Personal info' },
  { section: 2, label: 'Shipping info' },
  { section: 3, label: 'Card info' },
  { section: 4, label: 'Summary' },
];

interface CheckoutStepperProps {
  current: CheckoutSection;
  completed: Record<DataSection, boolean>;
  canOpenSummary: boolean;
  onGo: (section: CheckoutSection) => void;
}

export function CheckoutStepper({
  current,
  completed,
  canOpenSummary,
  onGo,
}: CheckoutStepperProps) {
  return (
    <ol className="stepper" aria-label="Checkout progress">
      {STEPS.map(({ section, label }) => {
        const isCurrent = section === current;
        const isDone = !isCurrent && section !== 4 && completed[section];
        const state = isCurrent ? 'current' : isDone ? 'done' : 'todo';
        const content = (
          <>
            <span className="stepper__marker" aria-hidden="true">
              {isDone ? '✓' : section}
            </span>
            <span className="stepper__label">{label}</span>
          </>
        );
        return (
          <li
            key={section}
            className={`stepper__item stepper__item--${state}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {isCurrent ? (
              <span className="stepper__button">{content}</span>
            ) : (
              <button
                type="button"
                className="stepper__button"
                disabled={section === 4 && !canOpenSummary}
                onClick={() => onGo(section)}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
