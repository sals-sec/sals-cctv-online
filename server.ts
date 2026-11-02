import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  verifyUserCredentials,
  getAllUsers,
  createDbUser,
  updateUserRole,
  deleteUser,
  getAllRequests,
  upsertRequest,
  deleteRequest,
  getSettings,
  setSettings,
  seedDefaultUsersIfEmpty,
} from './src/db/queries.ts';
import { CctvRequest } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Seed default users on startup
  await seedDefaultUsersIfEmpty().catch(console.error);

  // API Routes
  // 1. User login with credentials against Cloud SQL
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'User ID and password are required' });
      }
      const verifiedUser = await verifyUserCredentials(username, password);
      res.json({ success: true, user: verifiedUser });
    } catch (error: any) {
      console.error('Login error:', error.message);
      res.status(401).json({ error: error.message || 'Login failed' });
    }
  });

  // 2. Users management in Cloud SQL
  app.get('/api/users', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const usersList = await getAllUsers();
      res.json(usersList);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch users' });
    }
  });

  app.post('/api/users', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password and role are required' });
      }
      const createdBy = req.user?.uid || 'admin';
      const newUser = await createDbUser(username, password, role, createdBy);
      res.json({ success: true, user: newUser });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  app.patch('/api/users/:uid/role', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.params;
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'Role is required' });
      const updated = await updateUserRole(uid, role);
      res.json({ success: true, user: updated });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: error.message || 'Failed to update role' });
    }
  });

  app.delete('/api/users/:uid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { uid } = req.params;
      await deleteUser(uid);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });

  // 3. CCTV Requests
  app.get('/api/requests', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const rows = await getAllRequests();
      res.json(rows);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch requests' });
    }
  });

  app.post('/api/requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      const requestData: CctvRequest = req.body;
      if (!requestData || !requestData.id || !requestData.no) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      const saved = await upsertRequest(requestData);
      res.json({ success: true, request: saved });
    } catch (error: any) {
      console.error('Error saving request:', error);
      res.status(500).json({ error: error.message || 'Failed to save request' });
    }
  });

  app.post('/api/requests/batch', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { requests } = req.body;
      if (!Array.isArray(requests)) {
        return res.status(400).json({ error: 'Array of requests required' });
      }
      for (const r of requests) {
        if (r && r.id && r.no) {
          await upsertRequest(r);
        }
      }
      const all = await getAllRequests();
      res.json({ success: true, count: requests.length, requests: all });
    } catch (error: any) {
      console.error('Error batch saving requests:', error);
      res.status(500).json({ error: error.message || 'Failed to batch save' });
    }
  });

  app.delete('/api/requests/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await deleteRequest(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting request:', error);
      res.status(500).json({ error: error.message || 'Failed to delete request' });
    }
  });

  // 4. Settings
  app.get('/api/settings', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const val = await getSettings('app_settings');
      res.json(val || { dark: false, officer: '' });
    } catch (error: any) {
      console.error('Error getting settings:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  app.post('/api/settings', requireAuth, async (req: AuthRequest, res) => {
    try {
      await setSettings('app_settings', req.body);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Frontend integration: Vite middleware in dev or static files in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
