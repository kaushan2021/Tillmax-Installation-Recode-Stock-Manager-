import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Define API Router early to avoid ReferenceErrors
  const apiRouter = express.Router();
  
  // Debug log for API router entry
  apiRouter.use((req, res, next) => {
    console.log(`[API Router] Handling: ${req.method} ${req.url}`);
    next();
  });

  // Lazy initialize Firebase Admin to prevent startup crashes
  let auth: admin.auth.Auth | null = null;
  let db: admin.firestore.Firestore | null = null;
  let firebaseConfig: any = null;

  let adminInitError: string | null = null;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      let appInstance;
      if (!admin.apps.length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
          try {
            let serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            if (typeof serviceAccount === 'string') {
              serviceAccount = JSON.parse(serviceAccount);
            }
            credential = admin.credential.cert(serviceAccount);
            console.log("Using FIREBASE_SERVICE_ACCOUNT for Admin SDK");
          } catch (e: any) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON", e);
            throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON. Please ensure it is a valid JSON string. Error: ${e.message}`);
          }
        } else {
          console.warn("FIREBASE_SERVICE_ACCOUNT is missing. Admin Auth features will fail.");
          credential = admin.credential.applicationDefault();
        }

        appInstance = admin.initializeApp({
          credential,
          projectId: firebaseConfig.projectId,
        });
      } else {
        appInstance = admin.app();
      }
      auth = admin.auth(appInstance);
      db = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
      console.log(`Firebase Admin initialized successfully for project: ${firebaseConfig.projectId}`);
    } else {
      console.warn("firebase-applet-config.json not found. Admin features disabled.");
      adminInitError = "firebase-applet-config.json not found";
    }
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin:", error);
    adminInitError = error.message;
  }

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============================================================
  // 1. Global Request logging middleware (MOVED TO TOP)
  // ============================================================
  app.use((req, res, next) => {
    const start = Date.now();
    const url = req.url;
    const originalUrl = req.originalUrl || url;
    const isApi = url.startsWith('/api') || originalUrl.startsWith('/api');
    
    if (isApi) {
      console.log(`[API-TRACE] ${req.method} ${url} (Original: ${originalUrl}) - Headers: ${JSON.stringify(req.headers)}`);
    }

    // Skip logging for static assets, source files, and vite internals to reduce noise
    const isStaticAsset = /\.(tsx?|jsx?|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map)$/.test(url.split('?')[0]) || 
                          url.startsWith('/src/') || 
                          url.startsWith('/@vite/') || 
                          url.startsWith('/@fs/') ||
                          url.startsWith('/node_modules/');

    if (isApi) {
      console.log(`[Server] Incoming API Request: ${req.method} ${url} (Accept: ${req.headers.accept})`);
    } else if (!isStaticAsset) {
      console.log(`[Server] Incoming Request: ${req.method} ${url}`);
    }

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (isApi) {
        console.log(`[Server] API Response: ${req.method} ${url} - Status: ${res.statusCode} - ${duration}ms`);
      } else if (res.statusCode >= 400 || (!isStaticAsset && res.statusCode !== 304)) {
        console.log(`[Server] Response: ${req.method} ${url} - Status: ${res.statusCode} - ${duration}ms`);
      }
    });
    next();
  });

  // ============================================================
  // 2. MOUNT API ROUTER AND GUARD (MOVED UP)
  // ============================================================
  
  // Mount the main API router early
  app.use("/api", apiRouter);

  // NUCLEAR API GUARD: Catch any unhandled /api requests and force JSON 404
  app.use("/api", (req, res) => {
    console.error(`[API Guard] Unhandled API request: ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "API endpoint not found",
      path: req.url,
      method: req.method,
      originalUrl: req.originalUrl
    });
  });

  // ============================================================
  // 3. API Router Definitions
  // ============================================================
  
  // Ping endpoint
  apiRouter.get("/ping", (req, res) => {
    res.json({ status: "ok", message: "API is alive", time: new Date().toISOString() });
  });

  // Middleware to verify if the request comes from an admin
  const verifyAdmin = async (req: any, res: any, next: any) => {
    console.log(`[Auth] Verifying admin for ${req.url}`);
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error(`[Auth] Missing FIREBASE_SERVICE_ACCOUNT`);
      return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT environment variable. Please generate a new private key from Firebase Console -> Project Settings -> Service Accounts, and add the entire JSON content to the AI Studio Secrets menu as FIREBASE_SERVICE_ACCOUNT." });
    }
    if (!auth || !db) {
      console.error(`[Auth] Firebase Admin not initialized`);
      return res.status(503).json({ error: `Firebase Admin not initialized: ${adminInitError}` });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      
      let userData;
      try {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        userData = userDoc.data();
      } catch (dbError) {
        if (decodedToken.email === 'pasi@tillmax.co.uk') {
          req.user = decodedToken;
          return next();
        }
        throw dbError;
      }

      if (userData?.role === 'ADMIN' || decodedToken.email === 'pasi@tillmax.co.uk') {
        req.user = decodedToken;
        next();
      } else {
        res.status(403).json({ error: "Forbidden: Admin access required" });
      }
    } catch (error: any) {
      res.status(401).json({ error: "Invalid token or session expired" });
    }
  };

  // User Management API Routes
  apiRouter.post("/admin/sync-users", verifyAdmin, async (req, res) => {
    console.log(`[Admin] sync-users hit`);
    if (!auth || !db) return res.status(503).json({ error: `Service unavailable: ${adminInitError || 'Unknown initialization error'}` });
    
    try {
      // 1. Get all users from Firebase Auth
      const listUsersResult = await auth.listUsers();
      const authUsers = listUsersResult.users;
      
      // 2. Get all users from Firestore
      const usersSnapshot = await db.collection('users').get();
      const firestoreUsers = new Map();
      usersSnapshot.forEach(doc => firestoreUsers.set(doc.id, doc.data()));
      
      const results = {
        synced: 0,
        fixed: 0,
        errors: 0
      };

      // 3. Sync Auth users to Firestore
      for (const authUser of authUsers) {
        if (!firestoreUsers.has(authUser.uid)) {
          console.log(`[Sync] Fixing missing Firestore record for ${authUser.email} (${authUser.uid})`);
          try {
            await db.collection('users').doc(authUser.uid).set({
              uid: authUser.uid,
              email: authUser.email || '',
              username: authUser.displayName || authUser.email?.split('@')[0] || 'Unknown',
              role: 'EMPLOYEE', // Default role for synced users
              createdAt: authUser.metadata.creationTime || new Date().toISOString(),
              syncedAt: new Date().toISOString()
            });
            results.fixed++;
          } catch (e) {
            console.error(`[Sync] Failed to fix ${authUser.uid}:`, e);
            results.errors++;
          }
        } else {
          results.synced++;
        }
      }

      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Error syncing users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/admin/create-user", verifyAdmin, async (req, res) => {
    console.log(`[Admin] create-user hit: ${JSON.stringify(req.body)}`);
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT environment variable. Please generate a new private key from Firebase Console -> Project Settings -> Service Accounts, and add the entire JSON content to the AI Studio Secrets menu as FIREBASE_SERVICE_ACCOUNT." });
    }
    if (!auth || !db) return res.status(503).json({ error: `Service unavailable: ${adminInitError || 'Unknown initialization error'}` });
    
    const { email, password, username, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required" });
    }

    try {
      let userRecord;
      let isExistingAuthUser = false;

      // Check if user already exists in Auth
      try {
        userRecord = await auth.getUserByEmail(email);
        isExistingAuthUser = true;
        console.log(`[Admin] User already exists in Auth: ${email} (${userRecord.uid})`);
      } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
          // Create new user in Auth
          console.log(`[Admin] Creating new user in Auth: ${email}`);
          userRecord = await auth.createUser({ 
            email, 
            password: password || Math.random().toString(36).slice(-12), // Generate random password if not provided
            displayName: username 
          });
        } else {
          throw e;
        }
      }

      // Check if user already exists in Firestore
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      if (userDoc.exists) {
        console.log(`[Admin] User already exists in Firestore: ${email}`);
        return res.status(400).json({ error: "User already exists in the database" });
      }

      // Create/Update user in Firestore
      console.log(`[Admin] Creating user record in Firestore: ${userRecord.uid}`);
      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email,
        username: username || email.split('@')[0],
        role,
        createdAt: new Date().toISOString(),
      });

      console.log(`[Admin] User creation successful: ${email}`);
      res.json({ success: true, uid: userRecord.uid, isNewAuthUser: !isExistingAuthUser });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/admin/update-user", verifyAdmin, async (req, res) => {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT environment variable. Please generate a new private key from Firebase Console -> Project Settings -> Service Accounts, and add the entire JSON content to the AI Studio Secrets menu as FIREBASE_SERVICE_ACCOUNT." });
    }
    if (!auth || !db) return res.status(503).json({ error: `Service unavailable: ${adminInitError || 'Unknown initialization error'}` });
    const { uid, email, password, username, role } = req.body;
    try {
      const updateParams: any = {};
      if (email) updateParams.email = email;
      if (password) updateParams.password = password;
      if (username) updateParams.displayName = username;

      if (Object.keys(updateParams).length > 0) {
        await auth!.updateUser(uid, updateParams);
      }

      const firestoreUpdate: any = {};
      if (email) firestoreUpdate.email = email;
      if (username) firestoreUpdate.username = username;
      if (role) firestoreUpdate.role = role;

      if (Object.keys(firestoreUpdate).length > 0) {
        await db!.collection('users').doc(uid).update(firestoreUpdate);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/admin/delete-user", verifyAdmin, async (req, res) => {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return res.status(500).json({ error: "Missing FIREBASE_SERVICE_ACCOUNT environment variable. Please generate a new private key from Firebase Console -> Project Settings -> Service Accounts, and add the entire JSON content to the AI Studio Secrets menu as FIREBASE_SERVICE_ACCOUNT." });
    }
    if (!auth || !db) return res.status(503).json({ error: `Service unavailable: ${adminInitError || 'Unknown initialization error'}` });
    const { uid } = req.body;
    try {
      await auth!.deleteUser(uid);
      await db!.collection('users').doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/send-renewal-email", async (req, res) => {
    const { to, subject, html, smtpConfig, attachments } = req.body;
    if (!to || !subject || !html || !smtpConfig) return res.status(400).json({ error: "Missing required fields" });
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      });
      const info = await transporter.sendMail({
        from: `"${smtpConfig.senderName || 'Tillmax Support'}" <${smtpConfig.user}>`,
        to, 
        subject, 
        html,
        attachments: attachments || []
      });
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Mount the main API router
  // app.use("/api", apiRouter); // ALREADY MOUNTED ABOVE

  // NUCLEAR API GUARD: Catch any unhandled /api requests and force JSON 404
  // app.use("/api", (req, res) => { ... }); // ALREADY MOUNTED ABOVE

  // 4. Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Global Error Handler]", err);
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      return res.status(err.status || 500).json({ error: "Internal server error", message: err.message });
    }
    next(err);
  });

  // Vite middleware for development
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Starting Vite in middleware mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite middleware mounted");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
