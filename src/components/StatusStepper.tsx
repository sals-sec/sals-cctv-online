import React from 'react';
import { STATUS, STEPS } from '../constants';
import { RequestStatus } from '../types';

interface StatusStepperProps {
  currentStatus: RequestStatus;
  onChangeStatus: (status: RequestStatus) => void;
  isLimited: boolean;
  onToast: (msg: string) => void;
}

export const StatusStepper: React.FC<StatusStepperProps> = ({
  currentStatus,
  onChangeStatus,
  isLimited,
  onToast,
}) => {
  const handleClick = (s: RequestStatus) => {
    if (isLimited && s !== 'Submitted') {
      onToast('User (Limited) is unable to choose Under Review, Approved or Rejected.');
      return;
    }
    onChangeStatus(s);
  };

  return (
    <div className="status-stepper no-print" id="stp" role="region" aria-label="Request Status Progress">
      {STATUS.map((s, i) => {
        const isAct = currentStatus === s;
        const isRej = s === 'Rejected';
        const isLocked = isLimited && s !== 'Submitted';
        return (
          <React.Fragment key={s}>
            <div
              className={`status-step ${isAct ? 'active' : ''} ${
                isRej && isAct ? 'status-rejected' : ''
              }`}
              data-st={s}
              role={isLocked ? 'presentation' : 'button'}
              tabIndex={isLocked ? -1 : 0}
              aria-disabled={isLocked}
              title={isLocked ? 'User (Limited) cannot select this status' : undefined}
              style={
                isLocked
                  ? {
                      opacity: 0.38,
                      cursor: 'not-allowed',
                      pointerEvents: 'auto',
                    }
                  : undefined
              }
              onClick={() => handleClick(s)}
              onKeyDown={(e) => {
                if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleClick(s);
                }
              }}
            >
              <span className="step-num">{isRej ? '✕' : i + 1}</span>
              <div className="step-meta">
                <span className="step-title">{s}</span>
                <span className="step-sub">{STEPS[s]}</span>
              </div>
            </div>
            {i < STATUS.length - 1 && (
              <div
                className="status-arrow"
                aria-hidden="true"
                style={isLimited && i > 0 ? { opacity: 0.3 } : undefined}
              >
                →
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
