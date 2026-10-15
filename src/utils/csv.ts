import { CctvRequest } from '../types';
import { dayOf, footageTxt, mediaTxt, purposeTxt, recTime, today } from './formatters';

export function exportCsv(rows: CctvRequest[]) {
  const H = [
    'Request No',
    'Status',
    'Request Date',
    'Request Time',
    'Requestor',
    'Employee ID',
    'Department',
    'Position',
    'Contact',
    'Email',
    'Purpose',
    'Location',
    'Recording Date',
    'Day',
    'Recording Time',
    'Footage Request',
    'Storage Media',
    'Declaration Acknowledged',
    'Signature',
    'Signature Date',
    'Received By',
    'Received Date',
    'Reviewed By',
    'Footage Available',
    'Recording Quality',
    'Approver',
    'Approval Date',
    'Remarks',
  ];

  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const L = [H.map(q).join(',')];

  rows.forEach((r) =>
    L.push(
      [
        r.no,
        r.status,
        r.reqDate,
        r.reqTime,
        r.name,
        r.empId,
        r.dept,
        r.pos,
        r.contact,
        r.email,
        purposeTxt(r),
        r.area,
        r.recDate,
        dayOf(r.recDate),
        recTime(r),
        footageTxt(r),
        mediaTxt(r),
        r.ack ? 'Yes' : 'No',
        r.sigName,
        r.sigDate,
        r.recvBy,
        r.recvDate,
        r.revBy,
        r.avail,
        r.quality,
        r.apprName,
        r.apprDate,
        r.remarks,
      ]
        .map(q)
        .join(',')
    )
  );

  const text = '\ufeff' + L.join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `OEF-25_CCTV_Requests_${today()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportJsonBackup(rows: CctvRequest[], appVer: string) {
  const payload = {
    app: 'OEF-25',
    ver: appVer,
    exported: new Date().toISOString(),
    rows,
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `OEF-25_Backup_${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
