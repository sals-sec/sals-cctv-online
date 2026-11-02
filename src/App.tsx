import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getFirestoreRequests,
  saveFirestoreRequest,
  deleteFirestoreRequest,
  batchSaveFirestoreRequests,
  subscribeFirestoreRequests,
  getFirestoreUsers,
  saveFirestoreUser,
  deleteFirestoreUser,
  getFirestoreSettings,
  saveFirestoreSettings,
} from './api/firestoreClient.ts';
import { APP_VER, SK } from './constants.ts';
import { AppSettings, CctvRequest, RequestStatus, TabType, UserAccount, UserRole } from './types.ts';
import { hash, initUsers, isRoleAdmin, isRoleFull, isRoleLimited, roleName, verifyLogin } from './utils/auth.ts';
import { downloadPdfFile } from './utils/pdf.ts';
import { exportCsv, exportJsonBackup } from './utils/csv.ts';
import { getNextNo, today } from './utils/formatters.ts';
import { load, save, sess } from './utils/storage.ts';

// Components
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { StatusStepper } from './components/StatusStepper.tsx';
import { RequestForm } from './components/RequestForm.tsx';
import { TrackerRegister } from './components/TrackerRegister.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { Toast } from './components/Toast.tsx';
import { StatementPreviewModal, StatementPreviewContent } from './components/StatementPreviewModal.tsx';
import { RequestorModal, ApprovalModal } from './components/InfoModals.tsx';
import { DeleteModal } from './components/DeleteModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { ManageUsersModal } from './components/ManageUsersModal.tsx';

function makeBlankRequest(user: UserAccount | null, defaultOfficer: string, existingRows: CctvRequest[]): CctvRequest {
  const reqNo = getNextNo(existingRows);
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 5);
  const dateStr = today();

  return {
    id: 'req-' + Date.now(),
    no: reqNo,
    status: 'Submitted',
    reqDate: dateStr,
    reqTime: timeStr,
    name: user?.u || '',
    empId: '',
    dept: '',
    pos: '',
    contact: '',
    email: user?.email || '',
    purposes: [],
    purposeOther: '',
    area: '',
    recDate: dateStr,
    recFrom: '09:00',
    recTo: '10:00',
    footage: [],
    footageOther: '',
    media: ['E-mail'],
    mediaOther: '',
    ack: false,
    sigName: user?.u || '',
    sigDate: dateStr,
    recvBy: defaultOfficer || '',
    recvDate: '',
    revBy: '',
    avail: '',
    quality: '',
    apprName: '',
    apprDate: '',
    remarks: '',
    by: user?.u || 'unknown',
    created: now.toISOString(),
    updated: now.toISOString(),
    _new: true,
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

  // Load Firebase Firestore data when user is authenticated
  const loadDatabaseData = useCallback(async (_user?: UserAccount) => {
    try {
      // 1. Fetch requests from Firestore
      const loadedReqs = await getFirestoreRequests().catch(() => []);
      if (loadedReqs && loadedReqs.length > 0) {
        setRequests(loadedReqs);
        save(SK.data, { rows: loadedReqs });
      } else {
        // Migrate existing local requests to Firestore
        const dbLocal = load<{ rows: CctvRequest[] } | null>(SK.data, null);
        if (dbLocal && Array.isArray(dbLocal.rows) && dbLocal.rows.length > 0) {
          const valid = dbLocal.rows.filter((r) => r && r.id !== 'seed-oef25-001' && r.no !== 'CCTV-2026-001');
          if (valid.length > 0) {
            await batchSaveFirestoreRequests(valid).catch(console.error);
            setRequests(valid);
          }
        }
      }

      // 2. Fetch users from Firestore
      const loadedUsers = await getFirestoreUsers().catch(() => []);
      if (loadedUsers && Array.isArray(loadedUsers) && loadedUsers.length > 0) {
        setUsers(loadedUsers);
        save(SK.users, loadedUsers);
      } else {
        // Seed default users to Firestore
        const initList = await initUsers();
        for (const u of initList) {
          await saveFirestoreUser(u).catch(console.error);
        }
        setUsers(initList);
        save(SK.users, initList);
      }

      // 3. Fetch settings from Firestore
      const loadedSettings = await getFirestoreSettings().catch(() => null);
      if (loadedSettings && typeof loadedSettings === 'object') {
        setSettings(loadedSettings);
        save(SK.set, loadedSettings);
        document.documentElement.dataset.theme = loadedSettings.dark ? 'dark' : 'light';
      }
    } catch (err) {
      console.error('Failed to load Firestore data:', err);
    }
  }, []);

  // Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeFirestoreRequests((items) => {
      if (items && items.length > 0) {
        setRequests(items);
        save(SK.data, { rows: items });
      }
    });
    return () => unsub();
  }, [currentUser]);

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
        let found = initializedUsers.find((z) => z.u.toLowerCase() === sessionUser.toLowerCase());
        const remoteUsers = await getFirestoreUsers().catch(() => []);
        if (remoteUsers.length > 0) {
          const rFound = remoteUsers.find((z) => z.u.toLowerCase() === sessionUser.toLowerCase());
          if (rFound) found = rFound;
        }
        if (found) {
          setCurrentUser(found);
          document.body.setAttribute('data-authenticated', 'true');
          const blank = makeBlankRequest(found, loadedSettings.officer, rows);
          setCurrentRequest(blank);
          await loadDatabaseData(found);
        }
      }
    })();
  }, [loadDatabaseData]);

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

      const sectionCount = 7;
      let activeId = 1;
      for (let i = 1; i <= sectionCount; i++) {
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

  // Handle Escape key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewRequest) setPreviewRequest(null);
        else if (requestorModalRequest) setRequestorModalRequest(null);
        else if (approvalModalRequest) setApprovalModalRequest(null);
        else if (deleteModalRequest) setDeleteModalRequest(null);
        else if (isUsersOpen) setIsUsersOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    previewRequest,
    requestorModalRequest,
    approvalModalRequest,
    deleteModalRequest,
    isUsersOpen,
    isSettingsOpen,
  ]);

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
    let currentUsersList = users;
    if (currentUsersList.length === 0) {
      const remoteUsers = await getFirestoreUsers().catch(() => []);
      if (remoteUsers.length > 0) {
        currentUsersList = remoteUsers;
        setUsers(remoteUsers);
      } else {
        currentUsersList = await initUsers();
        setUsers(currentUsersList);
      }
    }
    const account = await verifyLogin(currentUsersList, username, pass);
    setCurrentUser(account);
    sess.set(SK.ses, account.u);
    document.body.setAttribute('data-authenticated', 'true');
    const blank = makeBlankRequest(account, settings.officer, requests);
    setCurrentRequest(blank);
    setActiveTab('form');
    await loadDatabaseData(account);
  };

  const handleLogout = async () => {
    sess.del(SK.ses);
    setCurrentUser(null);
    document.body.removeAttribute('data-authenticated');
    showToast('Signed out');
  };

  const handleToggleTheme = () => {
    const updated = { ...settings, dark: !settings.dark };
    setSettings(updated);
    save(SK.set, updated);
    saveFirestoreSettings(updated).catch(console.error);
  };

  const handleSaveSettings = (officer: string) => {
    const updated = { ...settings, officer };
    setSettings(updated);
    save(SK.set, updated);
    saveFirestoreSettings(updated).catch(console.error);
    setIsSettingsOpen(false);
    showToast('Settings saved to Firebase');
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

  const handleSaveForm = async () => {
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

    // Save directly to Firebase Firestore
    try {
      await saveFirestoreRequest(finalReq);
    } catch (err) {
      console.warn('Firebase save notice:', err);
    }

    setCurrentRequest(null);
    setActiveTab('reg');
    showToast(`Request ${finalReq.no} saved to Firebase`);
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

  const handleConfirmDelete = async () => {
    if (!deleteModalRequest) return;
    if (currentUser && isRoleLimited(currentUser)) {
      showToast('User (Limited) cannot delete requests');
      return;
    }
    const idToDelete = deleteModalRequest.id;
    const filtered = requests.filter((r) => r.id !== idToDelete);
    setRequests(filtered);
    save(SK.data, { rows: filtered });
    setDeleteModalRequest(null);

    // Delete from Firebase Firestore
    try {
      await deleteFirestoreRequest(idToDelete);
    } catch (err) {
      console.warn('Firebase delete notice:', err);
    }

    showToast('Request deleted from Firebase');
  };

  const handleImportBackup = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
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

        // Save imported requests directly to Firebase Firestore
        await batchSaveFirestoreRequests(updatedList).catch(console.error);

        showToast(`${count} request(s) imported & synced to Firebase`);
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

    // Save to Firebase Firestore
    await saveFirestoreUser(newUser).catch(console.error);
    showToast(`User created (${roleName(r)}) in Firebase`);
  };

  const handleDeleteUser = async (username: string) => {
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

    await deleteFirestoreUser(username).catch(console.error);
    showToast(`User ${username} removed`);
  };

  const handleImportUsers = async (incomingUsers: UserAccount[]) => {
    if (!currentUser || !isRoleAdmin(currentUser)) {
      showToast('Only admins can import users');
      return;
    }
    let count = 0;
    const merged = [...users];
    for (const u of incomingUsers) {
      if (!u || !u.u || !u.role) continue;
      const idx = merged.findIndex((x) => x.u.toLowerCase() === u.u.toLowerCase());
      if (idx >= 0) {
        if (merged[idx].u.toLowerCase() !== 'admin') {
          merged[idx] = { ...merged[idx], ...u };
          await saveFirestoreUser(merged[idx]).catch(console.error);
          count++;
        }
      } else {
        merged.push(u);
        await saveFirestoreUser(u).catch(console.error);
        count++;
      }
    }
    setUsers(merged);
    save(SK.users, merged);
    showToast(`${count} user account(s) imported into Firebase`);
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
                  isLimited={isRoleLimited(currentUser)}
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
            preparedBy={currentUser?.u || 'admin'}
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
        currentUser={currentUser || { u: '', role: 'limited' }}
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
