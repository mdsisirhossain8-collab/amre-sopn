import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import twilio from "twilio";
import fs from "fs";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

dotenv.config();

// Initialize Firebase Admin with high resilience
let adminApp: admin.app.App;
try {
  if (!admin.apps.length) {
    // Attempt initialization without arguments first, then with config
    try {
      console.log("[Firebase] Attempting default initialization...");
      adminApp = admin.initializeApp();
    } catch (e) {
      const targetProject = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
      console.log(`[Firebase] Default failed, using explicit Project ID: ${targetProject}`);
      adminApp = admin.initializeApp({ projectId: targetProject });
    }
  } else {
    adminApp = admin.app();
  }
} catch (err: any) {
  console.error("[Firebase] Critical Initialization Error:", err.message);
  // Last resort
  adminApp = admin.apps[0] || admin.initializeApp({ projectId: firebaseConfig.projectId });
}

// Select database - robust handling
let firestoreDb: admin.firestore.Firestore;
let firestoreHealthy = true;
let firestoreFailureCount = 0;
const MAX_FS_FAILURES = 5;

const configDbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)")
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

let currentDbId = configDbId;

function getDbInstance(id?: string) {
  try {
    // @ts-ignore
    return id ? adminApp.firestore(id) : adminApp.firestore();
  } catch (e: any) {
    console.error(`[Firestore] Db instance error for "${id || '(default)'}":`, e.message);
    // @ts-ignore
    return adminApp.firestore();
  }
}

firestoreDb = getDbInstance(currentDbId);

// Global Error Handlers to prevent process crash
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection. Reason:', reason instanceof Error ? reason.message : reason);
});

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  dbId: string | null;
  projectId: string | null;
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    dbId: currentDbId || "(default)",
    projectId: adminApp.options.projectId || null
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper for resilient Firestore operations with timeout
async function runResilient<T>(op: (db: admin.firestore.Firestore) => Promise<T>, operationType: OperationType, path: string | null, timeoutMs = 20000): Promise<T> {
  // Circuit breaker: skip if failing repeatedly
  if (!firestoreHealthy && firestoreFailureCount > MAX_FS_FAILURES * 2) {
    throw new Error("Firestore circuit breaker active");
  }

  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("Firestore operation timed out"));
    }, timeoutMs);
  });

  // Ensure the promise is "handled" even if race finishes before timeout
  timeoutPromise.catch(() => {});

  const execute = async (db: admin.firestore.Firestore): Promise<T> => {
    try {
      const result = await Promise.race([op(db), timeoutPromise]);
      clearTimeout(timeoutHandle);
      
      // Reset health on success
      firestoreHealthy = true;
      firestoreFailureCount = 0;
      
      return result;
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      
      // Track failures
      firestoreFailureCount++;
      if (firestoreFailureCount > MAX_FS_FAILURES) {
        firestoreHealthy = false;
      }
      
      // Handle Database Not Found (NOT_FOUND = 5)
      const errorMsg = err.message || String(err);
      const errorCode = err.code;
      if ((errorCode === 5 || errorMsg.includes("NOT_FOUND") || errorMsg.includes("not found")) && currentDbId) {
        console.warn(`[Firestore] Database "${currentDbId}" NOT_FOUND. Falling back to (default)...`);
        currentDbId = undefined;
        try {
          const fallbackDb = getDbInstance();
          return (await Promise.race([
            op(fallbackDb), 
            new Promise<never>((_, r) => setTimeout(() => r(new Error("Fallback timeout")), 10000))
          ])) as any;
        } catch (fallbackErr) {
           console.error("[Firestore] Fallback failed.");
           handleFirestoreError(fallbackErr, operationType, path);
        }
      }
      
      handleFirestoreError(err, operationType, path);
    }
  };

  return await execute(firestoreDb);
}

// Perform a smoke test
let firestoreReady: Promise<void> = (async () => {
  try {
    console.log(`[Firestore] Verifying connection: ${currentDbId || "(default)"}...`);
    // CRITICAL: Call get() to test connection as per guidelines
    await runResilient(db => db.collection('_health').doc('touch').get(), OperationType.GET, '_health/touch', 15000);
    console.log("[Firestore] Connection verified");
  } catch (err: any) {
    console.warn(`[Firestore] Connection verification warning (could be empty DB): ${err.message}`);
  }
})();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default Data
const defaultData: any = {
  simulatedUsers: [
    {
      id: "admin-1",
      name: "Admin User",
      email: "mdsisirhossain8@gmail.com",
      password: "admin",
      picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      isAdmin: true,
      address: "",
      phone: ""
    }
  ],
  orders: [],
  messages: [],
  products: [],
  categories: [],
  siteContent: {
    heroSubtitle: "Special Offer",
    heroTitle: "Summer Sale is On!",
    heroPromo: "Up to 50% OFF",
    heroBtnShop: "Shop Now",
    heroBtnExplore: "Explore More",
    categoryTitle: "Top Categories",
    categorySeeAll: "See All",
    featuredTitle: "Featured Products",
    latestTitle: "Latest Arrivals",
    latestDesc: "Discover the freshest styles from AMRE SOPNO. Our new collection is designed to make you stand out and feel confident.",
    latestBtnViewAll: "View All Collection",
    promoTitle: "Exclusive Member Discount",
    promoDesc: "Join our community and get EXTRA 20% OFF on your first order.",
    promoBtnJoin: "Join AMRE SOPNO Now",
    footerSlogan: "Your destination for the trendiest and most high-quality fashion. We bring the world's best styles straight to your wardrobe.",
    footerHeadingLinks: "Quick Links",
    footerHeadingCollections: "Our Collections",
    footerHeadingSupport: "Customer Support",
    siteName: "AMRE SOPNO",
    navHome: "Home",
    navProducts: "Products",
    navPost: "Post",
    navAbout: "About Us",
    navSale: "Sale",
    navCategories: "Categories",
    liveBannerText: "✨কুরবানি ধামাকা এখন LIVE! | Flat 30% OFF On all Items✨",
    heroImages: [
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
    ]
  }
};

let appData = { ...defaultData };

async function loadData() {
  try {
    console.log(`[Firestore] Initializing data load (Project: ${firebaseConfig.projectId})...`);
    
    // Load collections
    const collections = ['products', 'categories', 'orders', 'messages', 'simulatedUsers'];
    for (const collName of collections) {
      try {
        console.log(`[Firestore] Reading collection: ${collName}...`);
        const snapshot = await runResilient(db => db.collection(collName).get(), OperationType.LIST, collName);
        const loadedData = snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: isNaN(Number(doc.id)) ? doc.id : Number(doc.id) };
        });
        appData[collName] = loadedData;
        console.log(`[Firestore] Sync: Loaded ${loadedData.length} records from ${collName}`);
      } catch (collErr: any) {
        console.warn(`[Firestore] FAILED to load ${collName}: ${collErr.message}`);
        // Keep memory data as fallback
      }
    }

    // Load site content
    try {
      const siteContentDoc = await runResilient(db => db.collection('siteContent').doc('main').get(), OperationType.GET, 'siteContent/main');
      if (siteContentDoc.exists) {
        appData.siteContent = { ...defaultData.siteContent, ...siteContentDoc.data() };
        console.log("[Firestore] Site content loaded");
      }
    } catch (siteErr: any) {
      console.warn("[Firestore] Site content load failed:", siteErr.message);
    }

  } catch (err: any) {
    console.error("[Firestore] Global data load error:", err.message);
  }
}

async function saveData(collectionName?: string, data?: any) {
  // We now use targeted saves in the API handlers
}

// Initial load will happen inside startServer
// await loadData();

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  // Wait for Firestore to be verified/fallback
  await firestoreReady;

  // Load data from Firestore before starting server
  try {
    await loadData();
    console.log("[Sync] Initial data load completed from Firestore");
  } catch (err) {
    console.error("[Sync] Failed to load initial data from Firestore:", err);
  }

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "oyo-oyo-secret-99",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Global API Response Wrapper for better error isolation
  app.use('/api', (req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 400 && data && !data.error) {
        data = { error: "API Error", details: data };
      }
      return originalJson.call(this, data);
    };
    next();
  });

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // API Routes
  app.get("/api/health", async (req, res) => {
    let fsStatus = "checking";
    try {
      await runResilient(db => db.collection('_health').doc('touch').set({ 
        ping: new Date().toISOString(),
        dbId: currentDbId || "default"
      }, { merge: true }), OperationType.WRITE, '_health/touch');
      fsStatus = "connected";
    } catch (e: any) {
      fsStatus = `error: ${e.message}`;
    }

    res.json({ 
      status: "ok", 
      firestore: fsStatus,
      activeDbId: currentDbId || "(default)",
      configDbId: firebaseConfig.firestoreDatabaseId,
      projectId: adminApp?.options?.projectId,
      ambientProject: process.env.GOOGLE_CLOUD_PROJECT || "not-set",
      env: process.env.NODE_ENV,
      dataLoaded: {
        products: appData.products?.length || 0,
        categories: appData.categories?.length || 0,
        orders: appData.orders?.length || 0
      }
    });
  });

  app.post("/api/auth/sync", (req: any, res) => {
    const { user } = req.body;
    if (user) {
      req.session.user = user;
      return res.json({ success: true });
    }
    res.status(400).json({ error: "No user provided" });
  });

  app.get("/api/user", (req: any, res) => {
    res.json(req.session.user || null);
  });

  app.post("/api/user/update", requireAuth, async (req: any, res) => {
    const { address, phone, name } = req.body;
    if (req.session.user) {
      // Find and update in storage
      const userIndex = appData.simulatedUsers.findIndex((u: any) => u.id === req.session.user.id);
      if (userIndex !== -1) {
        const updatedUser = { ...appData.simulatedUsers[userIndex], address, phone, name: name || req.session.user.name };
        appData.simulatedUsers[userIndex] = updatedUser;
        
        await runResilient(db => db.collection('simulatedUsers').doc(String(req.session.user.id)).set(updatedUser), OperationType.WRITE, `simulatedUsers/${req.session.user.id}`);
      }

      req.session.user.address = address;
      req.session.user.phone = phone;
      req.session.user.name = name || req.session.user.name;
      return res.json({ success: true, user: req.session.user });
    }
    res.status(401).json({ error: "No session" });
  });

  app.get("/api/auth/google/url", (req: any, res) => {
    const origin = req.query.origin as string;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!origin) return res.status(400).json({ error: "Origin is required" });
    if (!clientId) return res.status(400).json({ error: "GOOGLE_CLIENT_ID is missing in environment variables" });
    
    const redirectUri = `${origin}/auth/callback`;
    req.session.oauthRedirectUri = redirectUri; // Store it for the callback
    req.session.oauthProvider = "google";

    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  app.get("/api/auth/facebook/url", (req: any, res) => {
    const origin = req.query.origin as string;
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    
    if (!origin) return res.status(400).json({ error: "Origin is required" });
    if (!clientId) return res.status(400).json({ error: "FACEBOOK_CLIENT_ID is missing in environment variables" });

    const redirectUri = `${origin}/auth/callback`;
    req.session.oauthRedirectUri = redirectUri;
    req.session.oauthProvider = "facebook";

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=email,public_profile`;
    res.json({ url });
  });

  app.get(["/auth/callback", "/auth/callback/"], async (req: any, res) => {
    const { code } = req.query;
    const redirectUri = req.session.oauthRedirectUri;
    const provider = req.session.oauthProvider || "google";

    if (!redirectUri) {
      return res.status(400).send("Session expired. Please try again.");
    }
    
    try {
      if (provider === "google") {
        const { tokens } = await client.getToken({
          code: code as string,
          redirect_uri: redirectUri,
        });
        client.setCredentials(tokens);

        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token!,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (payload) {
          const userObj = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            isAdmin: payload.email === "mdsisirhossain8@gmail.com",
          };
          
          req.session.user = userObj;
        }
      } else if (provider === "facebook") {
        // Exchange code for access token
        const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${code}`);
        const { access_token } = await tokenRes.json();

        // Get user profile
        const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`);
        const fbUser = await userRes.json();

        if (fbUser) {
          const userObj = {
            id: fbUser.id,
            email: fbUser.email,
            name: fbUser.name,
            picture: fbUser.picture?.data?.url,
            isAdmin: fbUser.email === "mdsisirhossain8@gmail.com",
          };

          req.session.user = userObj;
        }
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  // API Routes for Products
  app.get("/api/products", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(appData.products);
  });

  app.get("/api/categories", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(appData.categories);
  });

  app.get("/api/site-content", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(appData.siteContent);
  });

  app.post("/api/products", requireAuth, async (req: any, res) => {
    try {
      if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden: Admin access required" });
      if (Array.isArray(req.body)) {
        console.log(`[API] Syncing ${req.body.length} products to Firestore...`);
        
        // 1. Normalize IDs to strings
        const productsWithStrIds = req.body.map((p: any) => ({ ...p, id: String(p.id) }));
        
        // Update local state immediately (Optimistic)
        appData.products = productsWithStrIds;

        await runResilient(async (db) => {
           // 2. Identify and handle sync deletions
           const snapshot = await db.collection('products').get();
           
           const existingIds = snapshot.docs.map(d => d.id);
           const newIds = new Set(productsWithStrIds.map(p => p.id));
           const toDeleteIds = existingIds.filter(id => !newIds.has(id));
           
           console.log(`[Firestore] Status: ${existingIds.length} docs in DB. Action: Upsert ${productsWithStrIds.length}, Delete ${toDeleteIds.length}`);

           // 3. Batch operations
           let batch = db.batch();
           let totalCount = 0;
           let batchCount = 0;

           // Upsert new/updated
           for (const p of productsWithStrIds) {
             const docRef = db.collection('products').doc(p.id);
             // Sanitize: remove undefined values which Firestore rejects
             const cleanP: any = {};
             Object.keys(p).forEach(k => { if (p[k] !== undefined) cleanP[k] = p[k]; });
             batch.set(docRef, cleanP);
             totalCount++;
             batchCount++;
             if (batchCount === 400) {
               console.log(`[Firestore] Committing Upsert batch...`);
               await batch.commit();
               batch = db.batch();
               batchCount = 0;
             }
           }

           // Delete removed
           if (toDeleteIds.length > 0) {
             for (const id of toDeleteIds) {
               const docRef = db.collection('products').doc(id);
               batch.delete(docRef);
               totalCount++;
               batchCount++;
               if (batchCount === 400) {
                 console.log(`[Firestore] Committing Deletion batch...`);
                 await batch.commit();
                 batch = db.batch();
                 batchCount = 0;
               }
             }
           }

           if (batchCount > 0) {
             await batch.commit();
           }
           console.log(`[Firestore] SUCCESS: Sync completed. Total ops: ${totalCount}`);
        }, OperationType.WRITE, 'products/batch');

        res.json({ success: true, count: productsWithStrIds.length });
      } else {
        res.status(400).json({ error: "Invalid data: Expected array of products" });
      }
    } catch (err: any) {
      console.error("[API Error] Product sync fatal failure:", err.message);
      res.status(500).json({ 
        error: "Product sync failed", 
        details: err.message,
        dbId: currentDbId || "(default)",
        projectId: adminApp?.options?.projectId
      });
    }
  });

  app.post("/api/categories", requireAuth, async (req: any, res) => {
    try {
      if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
      if (Array.isArray(req.body)) {
        const categoriesWithStrIds = req.body.map((c: any) => ({ ...c, id: String(c.id) }));
        appData.categories = categoriesWithStrIds;

        await runResilient(async (db) => {
          const snapshot = await db.collection('categories').get();
          const existingIds = snapshot.docs.map(d => d.id);
          const newIds = new Set(categoriesWithStrIds.map(c => c.id));
          const toDeleteIds = existingIds.filter(id => !newIds.has(id));

          let batch = db.batch();
          let count = 0;

          for (const c of categoriesWithStrIds) {
            const docRef = db.collection('categories').doc(c.id);
            batch.set(docRef, c);
            count++;
            if (count === 400) {
              await batch.commit();
              batch = db.batch();
              count = 0;
            }
          }

          for (const id of toDeleteIds) {
            const docRef = db.collection('categories').doc(id);
            batch.delete(docRef);
            count++;
            if (count === 400) {
              await batch.commit();
              batch = db.batch();
              count = 0;
            }
          }

          if (count > 0) await batch.commit();
        }, OperationType.WRITE, 'categories/batch');
        
        res.json({ success: true });
      }
    } catch (err: any) {
      console.error("Error saving categories:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/site-content", requireAuth, async (req: any, res) => {
    try {
      if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
      appData.siteContent = req.body;
      await runResilient(db => db.collection('siteContent').doc('main').set(req.body), OperationType.WRITE, 'siteContent/main');
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error saving site content:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/orders", requireAuth, async (req: any, res) => {
    const { items, total, address, phone, paymentMethod, transactionId } = req.body;
    const newOrder = {
      id: `ord-${Date.now()}`,
      userId: req.session.user.id,
      userName: req.session.user.name,
      items,
      total,
      address: address || req.session.user.address,
      phone: phone || req.session.user.phone,
      paymentMethod,
      transactionId,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
    
    appData.orders.push(newOrder);
    try {
      await runResilient(db => db.collection('orders').doc(newOrder.id).set(newOrder), OperationType.CREATE, `orders/${newOrder.id}`);
    } catch (e: any) {
      console.warn("[Firestore] Syncing new order to DB failed:", e.message);
    }
    res.json({ success: true, order: newOrder });
  });

  app.get("/api/admin/orders", requireAuth, (req: any, res) => {
    if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    res.json(appData.orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  app.put("/api/admin/orders/:id", requireAuth, async (req: any, res) => {
    if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    const { status } = req.body;
    
    const orderIndex = appData.orders.findIndex((o: any) => o.id === id);
    if (orderIndex === -1) return res.status(404).json({ error: "Order not found" });
    
    appData.orders[orderIndex].status = status;
    await runResilient(db => db.collection('orders').doc(id).update({ status }), OperationType.UPDATE, `orders/${id}`);
    res.json({ success: true, order: appData.orders[orderIndex] });
  });

  app.delete("/api/admin/orders/:id", requireAuth, async (req: any, res) => {
    if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    const { id } = req.params;
    
    const orderIndex = appData.orders.findIndex((o: any) => o.id === id);
    if (orderIndex !== -1) {
      appData.orders.splice(orderIndex, 1);
      await runResilient(db => db.collection('orders').doc(id).delete(), OperationType.DELETE, `orders/${id}`);
    }
    res.json({ success: true });
  });

  app.get("/api/user/orders", requireAuth, (req: any, res) => {
    const userOrders = appData.orders
      .filter((o: any) => o.userId === req.session.user.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(userOrders);
  });

  // API Routes for Chat
  app.get("/api/messages", requireAuth, (req: any, res) => {
    const { userId, orderId } = req.query;
    
    const filteredMessages = appData.messages.filter((m: any) => {
      // If admin, show all messages to/from admin or involving the specific userId/orderId
      if (req.session.user.isAdmin) {
        if (orderId) return m.orderId === orderId;
        if (userId) return m.senderId === userId || m.receiverId === userId || m.senderId === 'admin' || m.receiverId === 'admin';
        // Default admin view: all messages involving 'admin' or of particular interest
        return m.senderId === req.session.user.id || m.receiverId === req.session.user.id || m.receiverId === 'admin' || m.senderId === 'admin';
      }

      // Customer view
      if (orderId) return m.orderId === orderId;
      if (userId) return m.senderId === userId || m.receiverId === userId;
      return m.senderId === req.session.user.id || m.receiverId === req.session.user.id;
    });

    res.json(filteredMessages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  });

  app.get("/api/admin/chat/users", requireAuth, (req: any, res) => {
    if (!req.session.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    
    const userIds = new Set([
      ...appData.orders.map((o: any) => o.userId),
      ...appData.messages.map((m: any) => m.senderId),
      ...appData.messages.map((m: any) => m.receiverId)
    ]);
    userIds.delete(req.session.user.id);
    userIds.delete('admin');

    const interactionDetails = Array.from(userIds).map(id => {
      const order = appData.orders.find((o: any) => o.userId === id);
      const user = appData.simulatedUsers.find((u: any) => u.id === id);
      return { 
        id, 
        name: user?.name || order?.userName || `Customer ${String(id).slice(-4)}`,
        lastOrder: order?.id
      };
    });
    res.json(interactionDetails);
  });

  app.post("/api/messages", requireAuth, async (req: any, res) => {
    const { text, receiverId, orderId } = req.body;
    const newMessage = {
      id: `msg-${Date.now()}`,
      senderId: req.session.user.id,
      receiverId: receiverId || 'admin',
      orderId,
      text,
      createdAt: new Date().toISOString()
    };
    
    appData.messages.push(newMessage);
    await runResilient(db => db.collection('messages').doc(newMessage.id).set(newMessage), OperationType.WRITE, `messages/${newMessage.id}`);
    res.json({ success: true, message: newMessage });
  });

  app.post("/api/auth/register", async (req: any, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    
    if (appData.simulatedUsers.some((u: any) => u.email === email)) return res.status(400).json({ error: "User already exists" });

    const newUser = {
      id: `u-${Date.now()}`,
      name,
      email,
      password, // In real apps, hash this!
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      isAdmin: email === "mdsisirhossain8@gmail.com"
    };

    appData.simulatedUsers.push(newUser);
    await runResilient(db => db.collection('simulatedUsers').doc(newUser.id).set(newUser), OperationType.WRITE, `simulatedUsers/${newUser.id}`);

    req.session.user = { ...newUser };
    delete (req.session.user as any).password;
    
    res.json({ success: true, user: req.session.user });
  });

  app.post("/api/auth/login", (req: any, res) => {
    const { email, password } = req.body;
    const user = appData.simulatedUsers.find((u: any) => u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    req.session.user = { ...user };
    delete (req.session.user as any).password;
    
    res.json({ success: true, user: req.session.user });
  });

  // Phone Auth Simulation & Real SMS
  app.post("/api/auth/phone/otp", async (req: any, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Phone number required" });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.phoneAuth = { phoneNumber, otp };
    
    let sentRealSms = false;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && from) {
      try {
        const twilioClient = twilio(accountSid, authToken);
        await twilioClient.messages.create({
          body: `Your verification code for ${process.env.VITE_SITE_NAME || "AMRE SOPNO"} is: ${otp}`,
          from: from,
          to: phoneNumber
        });
        sentRealSms = true;
      } catch (err) {
        console.error("Twilio Error:", err);
      }
    }

    if (!sentRealSms) {
      console.log(`[AUTH-SIMULATION] OTP for ${phoneNumber}: ${otp}`);
      res.json({ success: true, message: "OTP sent (Simulation: Check server console)" });
    } else {
      res.json({ success: true, message: "OTP sent via SMS" });
    }
  });

  app.post("/api/auth/phone/verify", async (req: any, res) => {
    const { code } = req.body;
    const phoneAuth = req.session.phoneAuth;

    if (!phoneAuth || code !== phoneAuth.otp) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    const userId = `phone-${phoneAuth.phoneNumber}`;
    let user = appData.simulatedUsers.find((u: any) => u.id === userId);
    
    if (!user) {
      user = {
        id: userId,
        email: null,
        name: `User ${phoneAuth.phoneNumber}`,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phoneAuth.phoneNumber}`,
        phone: phoneAuth.phoneNumber,
        isAdmin: false
      };
      appData.simulatedUsers.push(user);
      await runResilient(db => db.collection('simulatedUsers').doc(userId).set(user), OperationType.WRITE, `simulatedUsers/${userId}`);
    }

    req.session.user = { ...user };
    delete (req.session.user as any).password;

    delete req.session.phoneAuth;
    res.json({ success: true, user: req.session.user });
  });

  // Error handling middleware for API - ensures JSON even on crash
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error('[API Error Handler]:', err);
    res.status(err.status || 500).json({
      error: "Internal Server Error",
      message: err.message,
      path: req.path
    });
  });

  // API 404 Handler - MUST be before Vite/Static middleware to avoid HTML response for missing API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ 
      error: "API route not found", 
      path: req.path,
      method: req.method 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const html = await vite.transformIndexHtml(req.originalUrl, '<!DOCTYPE html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    console.log("Starting in PRODUCTION mode");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files from the dist directory
    app.use(express.static(distPath));
    
    // SPA catch-all - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: "API not found" });
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(500).send("Server Error: Missing index.html in dist. Please rebuild the app.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
