import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';
import { CctvRequest, UserAccount } from '../types.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. CCTV Requests
export async function getFirestoreRequests(): Promise<CctvRequest[]> {
  const path = 'cctv_requests';
  try {
    const snap = await getDocs(collection(db, path));
    const items: CctvRequest[] = [];
    snap.forEach((d) => {
      const data = d.data() as CctvRequest;
      if (data && data.id && data.no) {
        items.push(data);
      }
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreRequest(req: CctvRequest): Promise<void> {
  const path = `cctv_requests/${req.id}`;
  try {
    await setDoc(doc(db, 'cctv_requests', req.id), req, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreRequest(id: string): Promise<void> {
  const path = `cctv_requests/${id}`;
  try {
    await deleteDoc(doc(db, 'cctv_requests', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchSaveFirestoreRequests(requests: CctvRequest[]): Promise<void> {
  const path = 'cctv_requests';
  try {
    const batch = writeBatch(db);
    requests.forEach((r) => {
      if (r && r.id) {
        batch.set(doc(db, 'cctv_requests', r.id), r, { merge: true });
      }
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeFirestoreRequests(
  onUpdate: (requests: CctvRequest[]) => void
): Unsubscribe {
  const path = 'cctv_requests';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const items: CctvRequest[] = [];
      snap.forEach((d) => {
        const data = d.data() as CctvRequest;
        if (data && data.id && data.no) {
          items.push(data);
        }
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// 2. User accounts
export async function getFirestoreUsers(): Promise<UserAccount[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    const items: UserAccount[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserAccount;
      if (data && data.u) {
        items.push(data);
      }
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveFirestoreUser(user: UserAccount): Promise<void> {
  const path = `users/${user.u.toLowerCase()}`;
  try {
    await setDoc(doc(db, 'users', user.u.toLowerCase()), user, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFirestoreUser(username: string): Promise<void> {
  const path = `users/${username.toLowerCase()}`;
  try {
    await deleteDoc(doc(db, 'users', username.toLowerCase()));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. Settings
export async function getFirestoreSettings(): Promise<any> {
  const path = 'settings/app_settings';
  try {
    const snap = await getDoc(doc(db, 'settings', 'app_settings'));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveFirestoreSettings(settings: any): Promise<void> {
  const path = 'settings/app_settings';
  try {
    await setDoc(doc(db, 'settings', 'app_settings'), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
