import React from 'react';
import { CctvRequest, TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeSection: number;
  onSelectSection: (sectionNum: number) => void;
  currentRequest: CctvRequest | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  activeSection,
  onSelectSection,
  currentRequest,
}) => {
  const r = currentRequest;

  const sectionChecks = [
    Boolean(r?.reqDate?.trim() && r?.name?.trim() && r?.empId?.trim()),
    Boolean(r?.purposes && r.purposes.length > 0),
    Boolean(r?.area?.trim() && r?.recDate?.trim()),
    Boolean((r?.footage && r.footage.length > 0) || (r?.media && r.media.length > 0)),
    Boolean(r?.ack || r?.sigName?.trim()),
    Boolean(r?.recvBy?.trim() || r?.revBy?.trim() || r?.avail),
    Boolean(r?.apprName?.trim() || r?.remarks?.trim()),
  ];

  const sections = [
    { num: 1, label: 'Information' },
    { num: 2, label: 'Purpose' },
    { num: 3, label: 'Recording Details' },
    { num: 4, label: 'Footage Request' },
    { num: 5, label: 'Declaration' },
    { num: 6, label: 'Security Review' },
    { num: 7, label: 'Approval' },
  ];

  return (
    <aside className="sidebar no-print">
      <div className="workspace-label">Workspace</div>
      <nav aria-label="Workspace">
        <button
          type="button"
          id="tabF"
          className={activeTab === 'form' ? 'active' : ''}
          onClick={() => onSelectTab('form')}
        >
          <span className="nav-icon">▤</span> Request
        </button>
        <button
          type="button"
          id="tabR"
          className={activeTab === 'reg' ? 'active' : ''}
          onClick={() => onSelectTab('reg')}
        >
          <span className="nav-icon">☷</span> Tracker
        </button>
      </nav>

      {activeTab === 'form' && (
        <div className="section-nav" id="sectionNav">
          <div className="workspace-label">In This Request</div>
          {sections.map((s, idx) => {
            const isDone = sectionChecks[idx];
            const isActive = activeSection === s.num;
            return (
              <a
                key={s.num}
                href={`#section${s.num}`}
                id={`navSec${s.num}`}
                className={isActive ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSection(s.num);
                }}
              >
                <span className="sec-name">
                  <span>{String(s.num).padStart(2, '0')}</span>
                  {s.label}
                </span>
                <span className={`sec-badge ${isDone ? 'complete' : ''}`}>
                  {isDone ? '✓' : ''}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </aside>
  );
};
