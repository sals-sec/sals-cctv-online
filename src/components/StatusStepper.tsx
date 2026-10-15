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
    if (isLimited) {
      onToast('Limited Role requests are submitted with status: Submitted');
      return;
    }
    onChangeStatus(s);
  };

  return (
    <div className="status-stepper no-print" id="stp" role="region" aria-label="Request Status Progress">
      {STATUS.map((s, i) => {
        const isAct = currentStatus === s;
        const isRej = s === 'Rejected';
        return (
          <React.Fragment key={s}>
            <div
              className={`status-step ${isAct ? 'active' : ''} ${
                isRej && isAct ? 'status-rejected' : ''
              }`}
              data-st={s}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(s)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
              <div className="status-arrow" aria-hidden="true">
                →
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
