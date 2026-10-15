import React from 'react';
import { FOOTAGE, MEDIA, PURPOSES } from '../constants';
import { CctvRequest, UserAccount } from '../types';
import { dayOf, fmt12, fmtD, recTime } from '../utils/formatters';

interface StatementPreviewModalProps {
  request: CctvRequest | null;
  currentUser: UserAccount | null;
  onClose: () => void;
  onPrint: () => void;
  onExportPdf: (r: CctvRequest) => void;
}

export const StatementPreviewContent: React.FC<{ request: CctvRequest; preparedBy: string }> = ({
  request: r,
  preparedBy,
}) => {
  const b = (list: readonly string[], sel: string[], oth?: string) =>
    list.map((o) => {
      const on = (sel || []).includes(o);
      const isOther = o.startsWith('Other') && on && oth;
      return (
        <span key={o} style={{ marginRight: 10, display: 'inline-block' }}>
          {on ? '☑' : '☐'} {isOther ? `${o}: ${oth}` : o}
        </span>
      );
    });

  return (
    <div className="pf-wrap">
      <div className="pf-watermark">
        <span>CONFIDENTIAL</span>
      </div>
      <div className="pf-doc-header">
        <div className="pf-header-top">
          <img src="/logo.png" alt="SALS" className="pf-logo" />
          <span className="pf-form-code">OEF-25 Rev 02</span>
        </div>
        <div className="pf-header-sub">
          <div className="pf-doc-title">CCTV Footage Request Form</div>
        </div>
      </div>
      <table className="pf">
        <tbody>
          <tr>
            <th colSpan={4}>SECTION A – INFORMATION</th>
          </tr>
          <tr>
            <td className="k">Request Date</td>
            <td>{fmtD(r.reqDate)}</td>
            <td className="k">Request Time</td>
            <td>{fmt12(r.reqTime)}</td>
          </tr>
          <tr>
            <td className="k">Requestor Name</td>
            <td>{r.name}</td>
            <td className="k">Employee ID</td>
            <td>{r.empId}</td>
          </tr>
          <tr>
            <td className="k">Department</td>
            <td>{r.dept}</td>
            <td className="k">Position</td>
            <td>{r.pos}</td>
          </tr>
          <tr>
            <td className="k">Contact Number</td>
            <td>{r.contact}</td>
            <td className="k">Email Address</td>
            <td>{r.email}</td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION B – PURPOSE</th>
          </tr>
          <tr>
            <td colSpan={4} style={{ lineHeight: 1.9 }}>
              {b(PURPOSES, r.purposes, r.purposeOther)}
            </td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION C – RECORDING DETAILS</th>
          </tr>
          <tr>
            <td className="k">Area / Location</td>
            <td>{r.area}</td>
            <td className="k">Day</td>
            <td>{dayOf(r.recDate)}</td>
          </tr>
          <tr>
            <td className="k">Date</td>
            <td>{fmtD(r.recDate)}</td>
            <td className="k">Time</td>
            <td>{recTime(r)}</td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION D – FOOTAGE REQUEST</th>
          </tr>
          <tr>
            <td colSpan={4} style={{ lineHeight: 1.9 }}>
              {b(FOOTAGE, r.footage, r.footageOther)}
            </td>
          </tr>

          <tr>
            <th colSpan={4}>STORAGE MEDIA REQUESTED</th>
          </tr>
          <tr>
            <td colSpan={4}>{b(MEDIA, r.media, r.mediaOther)}</td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION E – DECLARATION</th>
          </tr>
          <tr>
            <td colSpan={4}>
              I acknowledge that CCTV footage contains confidential and sensitive information. I
              agree that the footage will only be used for the approved investigation purpose and
              will not be copied, distributed, disclosed, or used for unauthorized purposes. I
              understand that any misuse may result in disciplinary or legal action.
            </td>
          </tr>
          <tr>
            <td className="k">Requestor Signature</td>
            <td>{r.ack ? r.sigName : ''}</td>
            <td className="k">Date</td>
            <td>{fmtD(r.sigDate)}</td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION F – SECURITY REVIEW</th>
          </tr>
          <tr>
            <td className="k">Received By</td>
            <td>{r.recvBy}</td>
            <td className="k">Received Date</td>
            <td>{fmtD(r.recvDate)}</td>
          </tr>
          <tr>
            <td className="k">Reviewed By</td>
            <td colSpan={3}>{r.revBy}</td>
          </tr>
          <tr>
            <td className="k">Footage Available?</td>
            <td colSpan={3}>
              {['Yes', 'No'].map((x) => (
                <span key={x} style={{ marginRight: 16 }}>
                  {r.avail === x ? '☑ ' : '☐ '}
                  {x}
                </span>
              ))}
            </td>
          </tr>
          <tr>
            <td className="k">Recording Quality</td>
            <td colSpan={3}>
              {['Good', 'Fair', 'Poor'].map((x) => (
                <span key={x} style={{ marginRight: 16 }}>
                  {r.quality === x ? '☑ ' : '☐ '}
                  {x}
                </span>
              ))}
            </td>
          </tr>

          <tr>
            <th colSpan={4}>SECTION G – APPROVAL</th>
          </tr>
          <tr>
            <td className="k" style={{ height: 46 }}>
              Approver Signature
            </td>
            <td>{r.apprName}</td>
            <td className="k">Date</td>
            <td>{fmtD(r.apprDate)}</td>
          </tr>
        </tbody>
      </table>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 10,
          fontSize: 8,
          color: '#616b78',
          fontFamily: 'Helvetica, Arial, sans-serif',
          padding: '0 2px',
        }}
      >
        <span>Request {r.no}</span>
        <span>Prepared By: {preparedBy}</span>
        <span>1 / 1</span>
      </div>
    </div>
  );
};

export const StatementPreviewModal: React.FC<StatementPreviewModalProps> = ({
  request,
  currentUser,
  onClose,
  onPrint,
  onExportPdf,
}) => {
  if (!request) return null;
  const preparedBy = request.by || currentUser?.u || 'admin';

  return (
    <div className="modal-overlay show" id="mPrev" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="preview-modal-box">
        <div className="preview-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>OEF-25 Statement Preview</h3>
            <span className="page-tag">Form OEF-25</span>
          </div>
          <button type="button" className="preview-close-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <div id="pv" style={{ background: '#fff', padding: 8, borderRadius: 2 }}>
          <StatementPreviewContent request={request} preparedBy={preparedBy} />
        </div>
        <div
          className="actions"
          style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-outline" onClick={onPrint}>
            Print
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onExportPdf(request)}
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};
