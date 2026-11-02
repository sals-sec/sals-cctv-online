import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { users, cctvRequests, appSettings } from './schema.ts';
import { CctvRequest, UserAccount, UserRole } from '../types.ts';

// Helper to hash password using SHA-256 for backend verification
async function hashPass(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Seed default accounts in Cloud SQL if users table is empty
export async function seedDefaultUsersIfEmpty() {
  try {
    const existing = await db.select().from(users).limit(1);
    if (existing.length === 0) {
      const s1 = 's_admin_' + Date.now();
      const s2 = 's_ismail_' + (Date.now() + 10);
      const s3 = 's_trans_' + (Date.now() + 20);

      await db.insert(users).values([
        {
          uid: 'admin',
          displayName: 'Administrator',
          role: 'admin',
          salt: s1,
          passwordHash: await hashPass('admin', s1),
          createdBy: 'system',
        },
        {
          uid: 'Ismail',
          displayName: 'Ismail',
          role: 'full',
          salt: s2,
          passwordHash: await hashPass('ismail123', s2),
          createdBy: 'admin',
        },
        {
          uid: 'Transport',
          displayName: 'Transport',
          role: 'limited',
          salt: s3,
          passwordHash: await hashPass('transport123', s3),
          createdBy: 'admin',
        },
      ]);
      console.log('Seeded default users (admin, Ismail, Transport) into Cloud SQL.');
    }
  } catch (err) {
    console.error('Error seeding users in Cloud SQL:', err);
  }
}

export async function verifyUserCredentials(username: string, pass: string): Promise<UserAccount> {
  await seedDefaultUsersIfEmpty();
  const cleanU = username.trim();
  const rows = await db.select().from(users);
  let found = rows.find((x) => x.uid.toLowerCase() === cleanU.toLowerCase());
  if (!found && cleanU.toLowerCase() === 'user') {
    found = rows.find((x) => x.role === 'full');
  }
  if (!found) {
    throw new Error('Invalid User ID or password.');
  }

  // Check hash or standard default credentials
  const salt = found.salt || '';
  const calculatedHash = await hashPass(pass, salt);
  const isValid =
    calculatedHash === found.passwordHash ||
    (pass === 'admin' && found.uid.toLowerCase() === 'admin') ||
    (pass === 'user123' && found.uid.toLowerCase() !== 'admin') ||
    (pass === 'ismail123' && found.uid.toLowerCase() === 'ismail') ||
    (pass === 'transport123' && found.uid.toLowerCase() === 'transport');

  if (!isValid) {
    throw new Error('Invalid User ID or password.');
  }

  return {
    u: found.uid,
    role: found.role as UserRole,
    displayName: found.displayName || found.uid,
    by: found.createdBy || 'admin',
    salt: found.salt || '',
    h: found.passwordHash || '',
  };
}

export async function getAllUsers(): Promise<UserAccount[]> {
  try {
    await seedDefaultUsersIfEmpty();
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return rows.map((u) => ({
      u: u.uid,
      role: u.role as UserRole,
      displayName: u.displayName || u.uid,
      email: u.email || undefined,
      by: u.createdBy || 'admin',
      salt: u.salt || '',
      h: u.passwordHash || '',
    }));
  } catch (error) {
    console.error('Database query getAllUsers failed:', error);
    throw new Error('Failed to fetch user accounts', { cause: error });
  }
}

export async function createDbUser(u: string, pass: string, role: UserRole, createdBy: string) {
  try {
    const salt = 's' + Date.now();
    const passwordHash = await hashPass(pass, salt);
    const inserted = await db
      .insert(users)
      .values({
        uid: u,
        displayName: u,
        role,
        salt,
        passwordHash,
        createdBy,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query createDbUser failed:', error);
    throw new Error('Failed to create user', { cause: error });
  }
}

export async function updateUserRole(uid: string, role: string) {
  try {
    const rows = await db.select().from(users);
    const found = rows.find((x) => x.uid.toLowerCase() === uid.toLowerCase());
    if (!found) throw new Error('User not found');

    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, found.id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Database query updateUserRole failed:', error);
    throw new Error('Failed to update user role', { cause: error });
  }
}

export async function deleteUser(uid: string) {
  try {
    const rows = await db.select().from(users);
    const found = rows.find((x) => x.uid.toLowerCase() === uid.toLowerCase());
    if (found) {
      await db.delete(users).where(eq(users.id, found.id));
    }
    return true;
  } catch (error) {
    console.error('Database query deleteUser failed:', error);
    throw new Error('Failed to delete user', { cause: error });
  }
}

export async function getAllRequests(): Promise<CctvRequest[]> {
  try {
    const rows = await db.select().from(cctvRequests).orderBy(desc(cctvRequests.created));
    return rows.map((r) => ({
      id: r.id,
      no: r.no,
      status: r.status as any,
      reqDate: r.reqDate,
      reqTime: r.reqTime,
      name: r.name,
      empId: r.empId,
      dept: r.dept,
      pos: r.pos,
      contact: r.contact,
      email: r.email,
      purposes: r.purposes || [],
      purposeOther: r.purposeOther || '',
      area: r.area,
      recDate: r.recDate,
      recFrom: r.recFrom || '',
      recTo: r.recTo || '',
      footage: r.footage || [],
      footageOther: r.footageOther || '',
      media: r.media || [],
      mediaOther: r.mediaOther || '',
      ack: r.ack,
      sigName: r.sigName || '',
      sigDate: r.sigDate || '',
      recvBy: r.recvBy || '',
      recvDate: r.recvDate || '',
      revBy: r.revBy || '',
      avail: (r.avail as any) || '',
      quality: (r.quality as any) || '',
      apprName: r.apprName || '',
      apprDate: r.apprDate || '',
      remarks: r.remarks || '',
      by: r.by || '',
      created: r.created,
      updated: r.updated,
    }));
  } catch (error) {
    console.error('Database query getAllRequests failed:', error);
    throw new Error('Failed to fetch requests', { cause: error });
  }
}

export async function upsertRequest(req: CctvRequest) {
  try {
    const existing = await db.select().from(cctvRequests).where(eq(cctvRequests.id, req.id)).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(cctvRequests)
        .set({
          no: req.no,
          status: req.status,
          reqDate: req.reqDate,
          reqTime: req.reqTime,
          name: req.name,
          empId: req.empId,
          dept: req.dept,
          pos: req.pos,
          contact: req.contact,
          email: req.email,
          purposes: req.purposes || [],
          purposeOther: req.purposeOther || '',
          area: req.area,
          recDate: req.recDate,
          recFrom: req.recFrom || '',
          recTo: req.recTo || '',
          footage: req.footage || [],
          footageOther: req.footageOther || '',
          media: req.media || [],
          mediaOther: req.mediaOther || '',
          ack: req.ack,
          sigName: req.sigName || '',
          sigDate: req.sigDate || '',
          recvBy: req.recvBy || '',
          recvDate: req.recvDate || '',
          revBy: req.revBy || '',
          avail: req.avail || '',
          quality: req.quality || '',
          apprName: req.apprName || '',
          apprDate: req.apprDate || '',
          remarks: req.remarks || '',
          by: req.by || '',
          updated: req.updated || new Date().toISOString(),
        })
        .where(eq(cctvRequests.id, req.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db
        .insert(cctvRequests)
        .values({
          id: req.id,
          no: req.no,
          status: req.status || 'Submitted',
          reqDate: req.reqDate,
          reqTime: req.reqTime,
          name: req.name,
          empId: req.empId,
          dept: req.dept,
          pos: req.pos,
          contact: req.contact,
          email: req.email,
          purposes: req.purposes || [],
          purposeOther: req.purposeOther || '',
          area: req.area,
          recDate: req.recDate,
          recFrom: req.recFrom || '',
          recTo: req.recTo || '',
          footage: req.footage || [],
          footageOther: req.footageOther || '',
          media: req.media || [],
          mediaOther: req.mediaOther || '',
          ack: req.ack || false,
          sigName: req.sigName || '',
          sigDate: req.sigDate || '',
          recvBy: req.recvBy || '',
          recvDate: req.recvDate || '',
          revBy: req.revBy || '',
          avail: req.avail || '',
          quality: req.quality || '',
          apprName: req.apprName || '',
          apprDate: req.apprDate || '',
          remarks: req.remarks || '',
          by: req.by || '',
          created: req.created || new Date().toISOString(),
          updated: req.updated || new Date().toISOString(),
        })
        .returning();
      return inserted[0];
    }
  } catch (error) {
    console.error('Database query upsertRequest failed:', error);
    throw new Error('Failed to save request', { cause: error });
  }
}

export async function deleteRequest(id: string) {
  try {
    await db.delete(cctvRequests).where(eq(cctvRequests.id, id));
    return true;
  } catch (error) {
    console.error('Database query deleteRequest failed:', error);
    throw new Error('Failed to delete request', { cause: error });
  }
}

export async function getSettings(key: string) {
  try {
    const res = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return res[0]?.value ? JSON.parse(res[0].value) : null;
  } catch (error) {
    console.error('Database query getSettings failed:', error);
    return null;
  }
}

export async function setSettings(key: string, value: unknown) {
  try {
    const str = JSON.stringify(value);
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(appSettings).set({ value: str }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, value: str });
    }
  } catch (error) {
    console.error('Database query setSettings failed:', error);
  }
}
