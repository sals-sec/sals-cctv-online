import React, { useState } from 'react';
import { DECLARATION_TEXT, FOOTAGE, MEDIA, PURPOSES } from '../constants';
import { CctvRequest } from '../types';
import { dayOf } from '../utils/formatters';

interface RequestFormProps {
  request: CctvRequest;
  onChange: (updated: CctvRequest) => void;
  onSave: () => void;
  onCancel: () => void;
  onPreview: () => void;
  onExportPdf: () => void;
  onToast: (msg: string) => void;
}

export const RequestForm: React.FC<RequestFormProps> = ({
  request,
  onChange,
  onSave,
  onCancel,
  onPreview,
  onExportPdf,
  onToast,
}) => {
  const [badFields, setBadFields] = useState<Record<string, boolean>>({});

  const setField = <K extends keyof CctvRequest>(key: K, value: CctvRequest[K]) => {
    setBadFields((prev) => ({ ...prev, [key as string]: false }));
    const updated = { ...request, [key]: value };
    onChange(updated);
  };

  const toggleArrayItem = (key: 'purposes' | 'footage' | 'media', item: string) => {
    const list = request[key] || [];
    const nextList = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onChange({ ...request, [key]: nextList });
  };

  const hasOtherPurpose = request.purposes?.some((p) => p.startsWith('Other'));
  const hasOtherFootage = request.footage?.some((f) => f.startsWith('Other'));
  const hasOtherMedia = request.media?.some((m) => m.startsWith('Other'));

  const handleSaveClick = () => {
    const bad: Record<string, boolean> = {};
    let ok = true;
    const requiredKeys: (keyof CctvRequest)[] = ['reqDate', 'name', 'empId', 'area', 'recDate'];

    requiredKeys.forEach((k) => {
      if (!request[k] || !(request[k] as string).trim()) {
        bad[k] = true;
        ok = false;
      }
    });

    if (!request.purposes || request.purposes.length === 0) {
      onToast('Please select at least one Purpose (Section 02)');
      ok = false;
    } else if (!request.footage || request.footage.length === 0) {
      onToast('Please select at least one Footage Request type (Section 04)');
      ok = false;
    } else if (!request.ack) {
      onToast('Please acknowledge the declaration checkbox (Section 05)');
      ok = false;
    } else if (!ok) {
      onToast('Please fill all highlighted required fields');
    }

    setBadFields(bad);
    if (ok) {
      onSave();
    }
  };

  const saveHint = request._new
    ? 'Fill details and click “Save Request” to submit.'
    : `Last updated ${request.updated ? new Date(request.updated).toLocaleString() : ''}`;

  return (
    <section id="vForm">
      <div className="page-heading">
        <div className="page-heading-left">
          <div>
            <h2 id="ft">Request</h2>
            <p id="pageIntro">Complete sections 1 - 5 of the request form.</p>
          </div>
        </div>
        <span className="page-tag">Form OEF-25 Rev 02</span>
      </div>

      <form id="fh" onSubmit={(e) => e.preventDefault()}>
        {/* Section 01: Information */}
        <div className="card" id="section1">
          <h3 className="section-title">
            <span className="section-number">01</span>Information
          </h3>
          <div className="grid">
            <div className={`field ${badFields.reqDate ? 'bad' : ''}`}>
              <label>Request Date</label>
              <input
                type="date"
                value={request.reqDate || ''}
                onChange={(e) => setField('reqDate', e.target.value)}
              />
              <em>Required</em>
            </div>
            <div className="field">
              <label>Request Time</label>
              <input
                type="time"
                value={request.reqTime || ''}
                onChange={(e) => setField('reqTime', e.target.value)}
              />
            </div>
            <div className={`field ${badFields.name ? 'bad' : ''}`}>
              <label>Requestor Name</label>
              <input
                type="text"
                value={request.name || ''}
                onChange={(e) => setField('name', e.target.value)}
              />
              <em>Required</em>
            </div>
            <div className={`field ${badFields.empId ? 'bad' : ''}`}>
              <label>Employee ID</label>
              <input
                type="text"
                value={request.empId || ''}
                onChange={(e) => setField('empId', e.target.value)}
              />
              <em>Required</em>
            </div>
            <div className="field">
              <label>Department</label>
              <input
                type="text"
                value={request.dept || ''}
                onChange={(e) => setField('dept', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Position</label>
              <input
                type="text"
                value={request.pos || ''}
                onChange={(e) => setField('pos', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Contact Number</label>
              <input
                type="tel"
                value={request.contact || ''}
                onChange={(e) => setField('contact', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                value={request.email || ''}
                onChange={(e) => setField('email', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 02: Purpose */}
        <div className="card" id="section2">
          <h3 className="section-title">
            <span className="section-number">02</span>Purpose
          </h3>
          <div className="checks" data-g="purposes">
            {PURPOSES.map((o) => (
              <label key={o}>
                <input
                  type="checkbox"
                  checked={(request.purposes || []).includes(o)}
                  onChange={() => toggleArrayItem('purposes', o)}
                />{' '}
                {o}
              </label>
            ))}
          </div>
          {hasOtherPurpose && (
            <div className="field" style={{ marginTop: 10 }} id="oth">
              <label>Other – please specify</label>
              <input
                type="text"
                value={request.purposeOther || ''}
                onChange={(e) => setField('purposeOther', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Section 03: Recording Details */}
        <div className="card" id="section3">
          <h3 className="section-title">
            <span className="section-number">03</span>Recording Details
          </h3>
          <div className="grid">
            <div className={`field ${badFields.area ? 'bad' : ''}`}>
              <label>Area / Location</label>
              <input
                type="text"
                value={request.area || ''}
                onChange={(e) => setField('area', e.target.value)}
              />
              <em>Required</em>
            </div>
            <div className={`field ${badFields.recDate ? 'bad' : ''}`}>
              <label>Date</label>
              <input
                type="date"
                value={request.recDate || ''}
                onChange={(e) => setField('recDate', e.target.value)}
              />
              <em>Required</em>
            </div>
            <div className="field">
              <label>Day</label>
              <input type="text" id="day" readOnly value={dayOf(request.recDate)} />
            </div>
            <div className="field">
              <label>Time From</label>
              <input
                type="time"
                value={request.recFrom || ''}
                onChange={(e) => setField('recFrom', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Time To</label>
              <input
                type="time"
                value={request.recTo || ''}
                onChange={(e) => setField('recTo', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 04: Footage Request */}
        <div className="card" id="section4">
          <h3 className="section-title">
            <span className="section-number">04</span>Footage Request
          </h3>
          <div className="checks" data-g="footage">
            {FOOTAGE.map((o) => (
              <label key={o}>
                <input
                  type="checkbox"
                  checked={(request.footage || []).includes(o)}
                  onChange={() => toggleArrayItem('footage', o)}
                />{' '}
                {o}
              </label>
            ))}
          </div>
          {hasOtherFootage && (
            <div className="field" style={{ marginTop: 10 }} id="fo">
              <label>Other footage – please specify</label>
              <input
                type="text"
                value={request.footageOther || ''}
                onChange={(e) => setField('footageOther', e.target.value)}
              />
            </div>
          )}

          <div className="lbl" style={{ margin: '12px 0 6px', fontWeight: 600, fontSize: 12 }}>
            Storage media requested
          </div>
          <div className="checks" data-g="media">
            {MEDIA.map((o) => (
              <label key={o}>
                <input
                  type="checkbox"
                  checked={(request.media || []).includes(o)}
                  onChange={() => toggleArrayItem('media', o)}
                />{' '}
                {o}
              </label>
            ))}
          </div>
          {hasOtherMedia && (
            <div className="field" style={{ marginTop: 10 }} id="mo">
              <label>Other media – specify</label>
              <input
                type="text"
                value={request.mediaOther || ''}
                onChange={(e) => setField('mediaOther', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Section 05: Declaration */}
        <div className="card" id="section5">
          <h3 className="section-title">
            <span className="section-number">05</span>Declaration
          </h3>
          <div style={{ marginBottom: 16, marginTop: 4 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                cursor: 'pointer',
                lineHeight: 1.6,
                fontSize: 12.5,
              }}
            >
              <input
                type="checkbox"
                style={{
                  marginTop: 3,
                  flexShrink: 0,
                  width: 16,
                  height: 16,
                  accentColor: 'var(--accent)',
                  cursor: 'pointer',
                }}
                checked={!!request.ack}
                onChange={(e) => setField('ack', e.target.checked)}
              />
              <span style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {DECLARATION_TEXT}
              </span>
            </label>
          </div>
          <div className="grid">
            <div className="field">
              <label>Requestor Signature (typed name)</label>
              <input
                type="text"
                value={request.sigName || ''}
                onChange={(e) => setField('sigName', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={request.sigDate || ''}
                onChange={(e) => setField('sigDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 06: Security Review */}
        <div className="card" id="section6">
          <h3 className="section-title">
            <span className="section-number">06</span>Security Review
          </h3>
          <div className="grid">
            <div className="field">
              <label>Received By</label>
              <input
                type="text"
                value={request.recvBy || ''}
                onChange={(e) => setField('recvBy', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Received Date</label>
              <input
                type="date"
                value={request.recvDate || ''}
                onChange={(e) => setField('recvDate', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Reviewed By</label>
              <input
                type="text"
                value={request.revBy || ''}
                onChange={(e) => setField('revBy', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Footage Available?</label>
              <select
                value={request.avail || ''}
                onChange={(e) => setField('avail', e.target.value as any)}
              >
                <option value=""></option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="field">
              <label>Recording Quality</label>
              <select
                value={request.quality || ''}
                onChange={(e) => setField('quality', e.target.value as any)}
              >
                <option value=""></option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 07: Approval */}
        <div className="card" id="section7">
          <h3 className="section-title">
            <span className="section-number">07</span>Approval
          </h3>
          <div className="grid">
            <div className="field">
              <label>Approver Signature (typed name)</label>
              <input
                type="text"
                value={request.apprName || ''}
                onChange={(e) => setField('apprName', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={request.apprDate || ''}
                onChange={(e) => setField('apprDate', e.target.value)}
              />
            </div>
            <div className="field full">
              <label>Remarks (tracker note)</label>
              <textarea
                rows={2}
                value={request.remarks || ''}
                onChange={(e) => setField('remarks', e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>

      <div className="actions-bar no-print">
        <span className="save-hint grow" id="fmeta">
          {saveHint}
        </span>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-outline" onClick={onPreview}>
          Preview / Print
        </button>
        <button type="button" className="btn btn-outline" onClick={onExportPdf}>
          Export PDF
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSaveClick}>
          Save Request
        </button>
      </div>
    </section>
  );
};
