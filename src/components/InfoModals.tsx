import React from 'react';
import { CctvRequest } from '../types';
import { fmtD } from '../utils/formatters';

interface RequestorModalProps {
  request: CctvRequest | null;
  onClose: () => void;
}

export const RequestorModal: React.FC<RequestorModalProps> = ({ request, onClose }) => {
  if (!request) return null;

  const lines = [
    `Requestor Name: ${request.name || '—'}`,
    `Employee ID: ${request.empId || '—'}`,
    `Department: ${request.dept || '—'}`,
    `Position: ${request.pos || '—'}`,
    `Contact Number: ${request.contact || '—'}`,
    `Email Address: ${request.email || '—'}`,
  ];

  return (
    <div className="modal-overlay show" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="incident-type-dialog">
        <div className="eyebrow">Request {request.no}</div>
        <h3>Requestor Information</h3>
        <div className="incident-type-text">{lines.join('\n')}</div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface ApprovalModalProps {
  request: CctvRequest | null;
  onClose: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ request, onClose }) => {
  if (!request) return null;

  const lines = [
    `Approval Status: ${request.status || 'Pending'}`,
    `Approver: ${request.apprName || '—'}`,
    `Approval Date: ${fmtD(request.apprDate) || '—'}`,
    '',
    'Security Review:',
    `  • Received By: ${request.recvBy || '—'}${
      request.recvDate ? ` (${fmtD(request.recvDate)})` : ''
    }`,
    `  • Reviewed By: ${request.revBy || '—'}`,
    `  • Footage Available: ${request.avail || '—'}`,
    `  • Recording Quality: ${request.quality || '—'}`,
    '',
    `Remarks: ${request.remarks || '—'}`,
  ];

  return (
    <div className="modal-overlay show" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="incident-type-dialog">
        <div className="eyebrow">Request {request.no}</div>
        <h3>Approval & Security Review</h3>
        <div className="incident-type-text">{lines.join('\n')}</div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
