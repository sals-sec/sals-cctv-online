import React, { useCallback, useEffect, useRef, useState } from 'react';
import { APP_VER, SK } from './constants';
import { AppSettings, CctvRequest, RequestStatus, TabType, UserAccount, UserRole } from './types';
import { hash, initUsers, isRoleAdmin, isRoleFull, isRoleLimited, roleName, verifyLogin } from './utils/auth';
import { exportCsv, exportJsonBackup } from './utils/csv';
import { nowT, today } from './utils/formatters';
import { downloadPdfFile } from './utils/pdf';
import { load, save, sess } from './utils/storage';

import { Header } from './components/Header';
import { ApprovalModal, RequestorModal } from './components/InfoModals';
import { LoginScreen } from './components/LoginScreen';
import { ManageUsersModal } from './components/ManageUsersModal';
import { RequestForm } from './components/RequestForm';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import {
  StatementPreviewContent,
  StatementPreviewModal,
} from './components/StatementPreviewModal';
import { StatusStepper } from './components/StatusStepper';
import { Toast } from './components/Toast';
import { TrackerRegister } from './components/TrackerRegister';
import { DeleteModal } from './components/DeleteModal';

function getNextNo(existingList: CctvRequest[]): string {
  const y = new Date().getFullYear();
  const p = `CCTV-${y}-`;
  let m = 0;
  existingList.forEach((r) => {
    if (r.no?.startsWith(p)) {
      const num = parseInt(r.no.slice(p.length), 10) || 0;
      m = Math.max(m, num);
    }
  });
  return p + String(m + 1).padStart(3, '0');
}

function makeBlankRequest(
  userAcc?: UserAccount | null,
  currentOfficer?: string,
  reqsList: CctvRequest[] = []
): CctvRequest {
  return {
    _new: true,
    id: 'r' + Date.now().toString(36),
    no: getNextNo(reqsList),
    status: 'Submitted',
    reqDate: today(),
    reqTime: nowT(),
    name: '',
    empId: '',
    dept: '',
    pos: '',
    contact: '',
    email: '',
    purposes: [],
    purposeOther: '',
    area: '',
    recDate: '',
    recFrom: '',
    recTo: '',
    footage: [],
    footageOther: '',
    media: [],
    mediaOther: '',
    ack: false,
    sigName: '',
    sigDate: '',
    recvBy: currentOfficer || '',
    recvDate: '',
    revBy: '',
    avail: '',
    quality: '',
    apprName: '',
    apprDate: '',
    remarks: '',
    by: userAcc?.u || '',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}

export const App: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [requests, setRequests] = useState<CctvRequest[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ dark: false, officer: '' });
  const [activeTab, setActiveTab] = useState<TabType>('form');
  const [currentRequest, setCurrentRequest] = useState<CctvRequest | null>(null);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Modals state
  const [previewRequest, setPreviewRequest] = useState<CctvRequest | null>(null);
  const [requestorModalRequest, setRequestorModalRequest] = useState<CctvRequest | null>(null);
  const [approvalModalRequest, setApprovalModalRequest] = useState<CctvRequest | null>(null);
  const [deleteModalRequest, setDeleteModalRequest] = useState<CctvRequest | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUsersOpen, setIsUsersOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Initialize storage, users, settings on mount
  useEffect(() => {
    const loadedSettings = load<AppSettings>(SK.set, { dark: false, officer: '' });
    setSettings(loadedSettings);
    document.documentElement.dataset.theme = loadedSettings.dark ? 'dark' : 'light';

    const db = load<{ rows: CctvRequest[] } | null>(SK.data, null);
    let rows: CctvRequest[] = [];
    if (db && Array.isArray(db.rows)) {
      rows = db.rows.filter((r) => r && r.id !== 'seed-oef25-001' && r.no !== 'CCTV-2026-001');
    }
    setRequests(rows);

    (async () => {
      const initializedUsers = await initUsers();
      setUsers(initializedUsers);

      const sessionUser = sess.get(SK.ses);
      if (sessionUser) {
        const found = initializedUsers.find((z) => z.u === sessionUser);
        if (found) {
          setCurrentUser(found);
          document.body.setAttribute('data-authenticated', 'true');
          const blank = makeBlankRequest(found, loadedSettings.officer, rows);
          setCurrentRequest(blank);
        }
      }
    })();
  }, []);

  // Sync settings theme to document
  useEffect(() => {
    document.documentElement.dataset.theme = settings.dark ? 'dark' : 'light';
  }, [settings.dark]);

  // Scrollspy for form sections
  const isNavClickingRef = useRef(false);
  const navClickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeTab !== 'form') return;

    const handleScroll = () => {
      if (isNavClickingRef.current) return;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollY < 120) {
        setActiveSection(1);
        return;
      }
      if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 50) {
        setActiveSection(7);
        return;
      }
      let activeId = 1;
      for (let i = 1; i <= 7; i++) {
        const el = document.getElementById(`section${i}`);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 140) {
            activeId = i;
          }
        }
      }
      setActiveSection(activeId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const handleSelectSection = (num: number) => {
    setActiveSection(num);
    isNavClickingRef.current = true;
    if (navClickTimerRef.current) window.clearTimeout(navClickTimerRef.current);
    navClickTimerRef.current = window.setTimeout(() => {
      isNavClickingRef.current = false;
    }, 800);

    const target = document.getElementById(`section${num}`);
    if (target) {
      const headerOffset = 70;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }
  };

  const handleLogin = async (username: string, pass: string) => {
    const account = await verifyLogin(users, username, pass);
    setCurrentUser(account);
    sess.set(SK.ses, account.u);
    document.body.setAttribute('data-authenticated', 'true');
    const blank = makeBlankRequest(account, settings.officer, requests);
    setCurrentRequest(blank);
    setActiveTab('form');
  };

  const handleLogout = () => {
    sess.del(SK.ses);
    setCurrentUser(null);
    document.body.removeAttribute('data-authenticated');
  };

  const handleToggleTheme = () => {
    const updated = { ...settings, dark: !settings.dark };
    setSettings(updated);
    save(SK.set, updated);
  };

  const handleSaveSettings = (officer: string) => {
    const updated = { ...settings, officer };
    setSettings(updated);
    save(SK.set, updated);
    setIsSettingsOpen(false);
    showToast('Settings saved');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === 'form') {
      if (!currentRequest || (currentUser && isRoleLimited(currentUser) && requests.some((x) => x.id === currentRequest.id))) {
        setCurrentRequest(makeBlankRequest(currentUser, settings.officer, requests));
      }
    }
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const handleNewRequest = () => {
    const fresh = makeBlankRequest(currentUser, settings.officer, requests);
    setCurrentRequest(fresh);
    setActiveTab('form');
    window.scrollTo(0, 0);
  };

  const handleEditRequest = (req: CctvRequest) => {
    if (currentUser && isRoleLimited(currentUser)) {
      showToast('User (Limited) is unable to edit requests. Showing preview.');
      setPreviewRequest(req);
      return;
    }
    setCurrentRequest({ ...req, _new: false });
    setActiveTab('form');
    window.scrollTo(0, 0);
  };

  const handleSaveForm = () => {
    if (!currentRequest) return;
    const isExisting = requests.some((x) => x.id === currentRequest.id);
    if (currentUser && isRoleLimited(currentUser) && isExisting) {
      showToast('User (Limited) is unable to edit existing requests.');
      return;
    }

    let finalReq = { ...currentRequest };
    if (requests.some((x) => x.no === finalReq.no && x.id !== finalReq.id)) {
      finalReq.no = getNextNo(requests);
    }
    finalReq.updated = new Date().toISOString();
    delete finalReq._new;

    const idx = requests.findIndex((x) => x.id === finalReq.id);
    const updatedRows = idx < 0 ? [...requests, finalReq] : requests.map((r, i) => (i === idx ? finalReq : r));

    setRequests(updatedRows);
    save(SK.data, { rows: updatedRows });
    setCurrentRequest(null);
    setActiveTab('reg');
    showToast(`Request ${finalReq.no} saved successfully`);
  };

  const handleCancelForm = () => {
    setCurrentRequest(null);
    setActiveTab('reg');
  };

  const handlePdfExport = async (req: CctvRequest) => {
    try {
      showToast('Preparing PDF…');
      await downloadPdfFile(
        { ...req, by: req.by || currentUser?.u || 'admin' },
        '/logo.png'
      );
      showToast('PDF exported successfully');
    } catch (err: any) {
      console.error('PDF export error:', err);
      showToast('PDF export failed: ' + (err?.message || 'Error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteRequest = (req: CctvRequest) => {
    if (currentUser && isRoleLimited(currentUser)) {
      showToast('User (Limited) cannot delete requests.');
      return;
    }
    setDeleteModalRequest(req);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalRequest) return;
    if (currentUser && isRoleLimited(currentUser)) {
      showToast('User (Limited) cannot delete requests');
      return;
    }
    const filtered = requests.filter((r) => r.id !== deleteModalRequest.id);
    setRequests(filtered);
    save(SK.data, { rows: filtered });
    setDeleteModalRequest(null);
    showToast('Request deleted');
  };

  const handleImportBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result as string);
        const incoming = Array.isArray(d) ? d : d.rows;
        if (!Array.isArray(incoming)) throw new Error('Invalid format');

        let updatedList = [...requests];
        let count = 0;
        incoming.forEach((r: any) => {
          if (!r || !r.id || !r.no) return;
          const merged: CctvRequest = {
            ...makeBlankRequest(currentUser, settings.officer, updatedList),
            ...r,
          };
          delete merged._new;
          const idx = updatedList.findIndex((x) => x.id === merged.id);
          if (idx < 0) {
            updatedList.push(merged);
          } else {
            updatedList[idx] = merged;
          }
          count++;
        });

        setRequests(updatedList);
        save(SK.data, { rows: updatedList });
        showToast(`${count} request(s) imported`);
      } catch {
        showToast('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const handleAddUser = async (u: string, p: string, r: UserRole) => {
    const salt = 's' + Date.now();
    const newUser: UserAccount = {
      u,
      salt,
      h: await hash(p, salt),
      role: r,
      by: currentUser?.u,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    save(SK.users, updated);
    showToast(`User created (${roleName(r)})`);
  };

  const handleDeleteUser = (username: string) => {
    if (username.toLowerCase() === 'admin' || (currentUser && username.toLowerCase() === currentUser.u.toLowerCase())) {
      showToast('Cannot delete this user');
      return;
    }
    if (!isRoleAdmin(currentUser) && !isRoleFull(currentUser)) {
      showToast('Permission denied');
      return;
    }
    const targetUser = users.find((z) => z.u.toLowerCase() === username.toLowerCase());
    if (isRoleFull(currentUser) && !isRoleLimited(targetUser)) {
      showToast('User (Full) can only delete User (Limited) accounts');
      return;
    }
    const updated = users.filter((z) => z.u.toLowerCase() !== username.toLowerCase());
    setUsers(updated);
    save(SK.users, updated);
    showToast(`User ${username} removed`);
  };

  const handleImportUsers = (incomingUsers: UserAccount[]) => {
    if (!currentUser || !isRoleAdmin(currentUser)) {
      showToast('Only admins can import users');
      return;
    }
    let count = 0;
    const merged = [...users];
    incomingUsers.forEach((u) => {
      if (!u || !u.u || !u.role || !u.h || !u.salt) return;
      const idx = merged.findIndex((x) => x.u.toLowerCase() === u.u.toLowerCase());
      if (idx >= 0) {
        if (merged[idx].u.toLowerCase() !== 'admin') {
          merged[idx] = { ...merged[idx], ...u };
          count++;
        }
      } else {
        merged.push(u);
        count++;
      }
    });
    setUsers(merged);
    save(SK.users, merged);
    showToast(`${count} user account(s) imported`);
  };

  const printableRequest = previewRequest || currentRequest;

  return (
    <>
      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} appVer={APP_VER} />
      ) : (
        <div id="app">
          <Header
            user={currentUser}
            requestCount={requests.length}
            isDark={settings.dark}
            onToggleTheme={handleToggleTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenUsers={() => setIsUsersOpen(true)}
            onLogout={handleLogout}
          />

          <Sidebar
            activeTab={activeTab}
            onSelectTab={handleTabChange}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            currentRequest={currentRequest}
          />

          <main className="no-print">
            {activeTab === 'form' && currentRequest && (
              <>
                <StatusStepper
                  currentStatus={currentRequest.status}
                  onChangeStatus={(s: RequestStatus) =>
                    setCurrentRequest((prev) => (prev ? { ...prev, status: s } : prev))
                  }
                  isLimited={isRoleLimited(currentUser)}
                  onToast={showToast}
                />
                <RequestForm
                  request={currentRequest}
                  onChange={setCurrentRequest}
                  onSave={handleSaveForm}
                  onCancel={handleCancelForm}
                  onPreview={() => setPreviewRequest(currentRequest)}
                  onExportPdf={() => handlePdfExport(currentRequest)}
                  onToast={showToast}
                />
              </>
            )}

            {activeTab === 'reg' && (
              <TrackerRegister
                requests={requests}
                user={currentUser}
                onNewRequest={handleNewRequest}
                onEditRequest={handleEditRequest}
                onPreviewRequest={(r) => setPreviewRequest(r)}
                onPdfRequest={handlePdfExport}
                onDeleteRequest={handleDeleteRequest}
                onRequestorClick={(r) => setRequestorModalRequest(r)}
                onApprovalClick={(r) => setApprovalModalRequest(r)}
                onExportCsv={() => exportCsv(requests)}
                onExportBackup={() => exportJsonBackup(requests, APP_VER)}
                onImportBackup={handleImportBackup}
              />
            )}
          </main>
        </div>
      )}

      {/* Printable Area for @media print */}
      <div id="printArea">
        {printableRequest && (
          <StatementPreviewContent
            request={printableRequest}
            preparedBy={printableRequest.by || currentUser?.u || 'admin'}
          />
        )}
      </div>

      {/* Modals */}
      <StatementPreviewModal
        request={previewRequest}
        currentUser={currentUser}
        onClose={() => setPreviewRequest(null)}
        onPrint={handlePrint}
        onExportPdf={handlePdfExport}
      />

      <RequestorModal
        request={requestorModalRequest}
        onClose={() => setRequestorModalRequest(null)}
      />

      <ApprovalModal
        request={approvalModalRequest}
        onClose={() => setApprovalModalRequest(null)}
      />

      <DeleteModal
        request={deleteModalRequest}
        onCancel={() => setDeleteModalRequest(null)}
        onConfirm={handleConfirmDelete}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ManageUsersModal
        isOpen={isUsersOpen}
        currentUser={currentUser || { u: '', salt: '', h: '', role: 'limited' }}
        users={users}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        onClose={() => setIsUsersOpen(false)}
        onToast={showToast}
        onImportUsers={handleImportUsers}
      />

      <Toast message={toastMessage} />
    </>
  );
};
