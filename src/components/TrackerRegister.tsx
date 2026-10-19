import React, { useMemo, useRef, useState } from 'react';
import { STATUS } from '../constants';
import { CctvRequest, DateFilterType, RequestStatus, UserAccount } from '../types';
import { isRoleAdmin, isRoleFull, isRoleLimited } from '../utils/auth';
import {
  fmtD,
  footageTxt,
  mediaTxt,
  purposeTxt,
  recTime,
  statusPillClass,
  today,
} from '../utils/formatters';

interface TrackerRegisterProps {
  requests: CctvRequest[];
  user: UserAccount;
  onNewRequest: () => void;
  onEditRequest: (req: CctvRequest) => void;
  onPreviewRequest: (req: CctvRequest) => void;
  onPdfRequest: (req: CctvRequest) => void;
  onDeleteRequest: (req: CctvRequest) => void;
  onRequestorClick: (req: CctvRequest) => void;
  onApprovalClick: (req: CctvRequest) => void;
  onExportCsv: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
}

export const TrackerRegister: React.FC<TrackerRegisterProps> = ({
  requests,
  user,
  onNewRequest,
  onEditRequest,
  onPreviewRequest,
  onPdfRequest,
  onDeleteRequest,
  onRequestorClick,
  onApprovalClick,
  onExportCsv,
  onExportBackup,
  onImportBackup,
}) => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isRoleAdmin(user) || isRoleFull(user);
  const canImport = !isRoleLimited(user);

  const departments = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.dept?.trim()) set.add(r.dept.trim());
    });
    return Array.from(set).sort();
  }, [requests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const c = (s: RequestStatus) => requests.filter((r) => r.status === s).length;
    const done = requests.filter(
      (r) => r.apprDate && r.reqDate && r.status === 'Approved'
    );
    const avg = done.length
      ? (
          done.reduce(
            (acc, r) => acc + (new Date(r.apprDate).getTime() - new Date(r.reqDate).getTime()) / 864e5,
            0
          ) / done.length
        ).toFixed(1)
      : '–';

    return [
      { label: 'Total', value: total },
      { label: 'Submitted', value: c('Submitted') },
      { label: 'Under Review', value: c('Under Review') },
      { label: 'Approved', value: c('Approved') },
      { label: 'Rejected', value: c('Rejected') },
      { label: 'Avg Days to Approve', value: avg },
    ];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    const nowStr = today();

    return requests
      .filter((r) => {
        if (statusFilter && r.status !== statusFilter) return false;
        if (deptFilter && r.dept !== deptFilter) return false;
        if (
          q &&
          ![
            r.no,
            r.name,
            r.empId,
            r.dept,
            r.area,
            purposeTxt(r),
            footageTxt(r),
            mediaTxt(r),
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        ) {
          return false;
        }

        if (dateFilter === 'today') return r.reqDate === nowStr;
        if (dateFilter === 'week') {
          if (!r.reqDate) return false;
          const diff = (now.getTime() - new Date(r.reqDate).getTime()) / 864e5;
          return diff >= 0 && diff <= 7;
        }
        if (dateFilter === 'month') {
          if (!r.reqDate) return false;
          return r.reqDate.slice(0, 7) === nowStr.slice(0, 7);
        }
        return true;
      })
      .sort((a, b) => (b.no || '').localeCompare(a.no || ''));
  }, [requests, query, statusFilter, deptFilter, dateFilter]);

  const countStr = `${requests.length} request${requests.length === 1 ? '' : 's'}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackup(file);
    }
    e.target.value = '';
  };

  return (
    <section id="vReg">
      <div className="page-heading">
        <div className="page-heading-left">
          <div>
            <h2>Tracker</h2>
            <p>Register of CCTV footage requests and their review status.</p>
          </div>
        </div>
        <span className="page-tag">Form OEF-25</span>
      </div>

      <div className="stats" id="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            id="q"
            placeholder="Search request no., name, ID, department, location…"
            aria-label="Search requests"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="date-filter-chips no-print" role="group" aria-label="Filter by date">
            {(['all', 'today', 'week', 'month'] as DateFilterType[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${dateFilter === d ? 'active' : ''}`}
                onClick={() => setDateFilter(d)}
              >
                {d === 'all'
                  ? 'All Time'
                  : d === 'today'
                  ? 'Today'
                  : d === 'week'
                  ? 'This Week'
                  : 'This Month'}
              </button>
            ))}
          </div>
          <select
            id="fs"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            id="fd"
            aria-label="Filter by department"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="register-tools">
          <span className="small-muted hc" id="cnt" role="status">
            {countStr}
          </span>
          <div className="register-tool-buttons">
            <button type="button" className="btn btn-primary btn-sm" onClick={onNewRequest}>
              ＋ New Request
            </button>
            {canImport && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  hidden
                  onChange={handleFileChange}
                />
              </>
            )}
            <button type="button" className="btn btn-secondary btn-sm" onClick={onExportCsv}>
              Export
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onExportBackup}>
              Backup
            </button>
          </div>
        </div>

        <div className="tw register-scroll" tabIndex={0}>
          <table id="registerTable" className="compact-table">
            <thead>
              <tr>
                <th>Req. Date</th>
                <th>Location</th>
                <th>Recording</th>
                <th>Requestor</th>
                <th>Approval</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody id="tb">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((r) => {
                  const reqName = r.name || '—';
                  const apprLabel =
                    r.apprName ||
                    (r.status === 'Approved'
                      ? 'Approved'
                      : r.status === 'Rejected'
                      ? 'Rejected'
                      : r.status === 'Under Review'
                      ? 'Under Review'
                      : r.recvBy
                      ? 'Received'
                      : 'Pending');

                  return (
                    <tr key={r.id}>
                      <td>{fmtD(r.reqDate)}</td>
                      <td>
                        <div className="compact-text" title={r.area || ''}>
                          {r.area || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="compact-text">{fmtD(r.recDate) || '—'}</div>
                        <div className="small-muted">{recTime(r) || ''}</div>
                      </td>
                      <td>
                        {r.name ? (
                          <button
                            type="button"
                            className="compact-cell-btn"
                            onClick={() => onRequestorClick(r)}
                            title={`${r.name}${r.empId ? ` (${r.empId})` : ''}`}
                          >
                            <span className="cell-btn-text">{reqName}</span>
                            <span className="cell-btn-icon" aria-hidden="true">
                              ↗
                            </span>
                          </button>
                        ) : (
                          <span className="cell-empty">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="compact-cell-btn"
                          onClick={() => onApprovalClick(r)}
                          title={apprLabel}
                        >
                          <span className="cell-btn-text">{apprLabel}</span>
                          <span className="cell-btn-icon" aria-hidden="true">
                            ↗
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className={statusPillClass(r.status)}>{r.status}</span>
                      </td>
                      <td>
                        <div className="report-actions" role="group" aria-label="Request actions">
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => onEditRequest(r)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onPreviewRequest(r)}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onPdfRequest(r)}
                              >
                                Export
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => onDeleteRequest(r)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onPreviewRequest(r)}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onPdfRequest(r)}
                              >
                                Export
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: 24,
                      color: 'var(--text-muted)',
                      fontSize: 11,
                    }}
                  >
                    No requests match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
