const admin = require('firebase-admin');
const { normalizePlan } = require('./planTiers');
const { PLAN_COMMERCIAL_META } = require('./modulePresets');

const SESSION_STALE_MS = 5 * 60 * 1000;

function toPositiveInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

async function loadLicenseDoc(db, companyId) {
  if (!companyId) return {};
  try {
    const snap = await db.collection('companies').doc(companyId).collection('config').doc('license').get();
    if (snap.exists) return snap.data() || {};
  } catch {}
  try {
    const snap = await db.collection('licenses').doc(companyId).get();
    if (snap.exists) return snap.data() || {};
  } catch {}
  return {};
}

async function resolvePlanLimits(db, companyId) {
  const lic = await loadLicenseDoc(db, companyId);
  const plan = normalizePlan(lic?.plan || 'basic');
  const base = PLAN_COMMERCIAL_META[plan] || PLAN_COMMERCIAL_META.basic;

  const extraUsers = toPositiveInt(lic?.extraUsers ?? lic?.extra_users ?? 0, 0);
  const includedUsers = toPositiveInt(base?.includedUsers, 1);
  const maxCreatedUsers = toPositiveInt(
    lic?.maxCreatedUsers ?? lic?.max_created_users ?? includedUsers + extraUsers,
    includedUsers + extraUsers
  );
  const maxConcurrentSessions = toPositiveInt(
    lic?.maxConcurrentSessions ?? lic?.max_concurrent_sessions ?? maxCreatedUsers,
    maxCreatedUsers
  );

  return {
    plan,
    includedUsers,
    extraUsers,
    maxCreatedUsers,
    maxConcurrentSessions
  };
}

async function countCreatedUsers(db, companyId) {
  const snap = await db.collection('companies').doc(companyId).collection('usuarios').get();
  return snap.size;
}

async function getActiveSessions(db, companyId) {
  const cutoff = Date.now() - SESSION_STALE_MS;
  const snap = await db
    .collection('companies')
    .doc(companyId)
    .collection('active_sessions')
    .where('lastSeenMs', '>=', cutoff)
    .get();

  const byUid = new Map();
  snap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.revoked === true) return;
    byUid.set(doc.id, { id: doc.id, ...data });
  });
  return byUid;
}

async function ensureCanCreateUser(db, companyId) {
  const limits = await resolvePlanLimits(db, companyId);
  const totalUsers = await countCreatedUsers(db, companyId);
  if (totalUsers >= limits.maxCreatedUsers) {
    return {
      ok: false,
      status: 403,
      code: 'USER_LIMIT_EXCEEDED',
      message:
        `Tu plan permite hasta ${limits.maxCreatedUsers} usuarios. ` +
        'Para crear más usuarios, actualizá el abono o agregá usuarios extra.'
    };
  }
  return { ok: true, limits, totalUsers };
}

async function enforceSessionAccess(db, companyId, user, sessionId, deviceId, sessionStartedAtMsRaw) {
  if (!companyId || !user?.uid) return { ok: true };
  if (!sessionId) {
    return {
      ok: false,
      status: 401,
      code: 'SESSION_REQUIRED',
      message: 'Sesión inválida. Cerrá sesión e ingresá nuevamente.'
    };
  }

  const limits = await resolvePlanLimits(db, companyId);
  const activeByUid = await getActiveSessions(db, companyId);
  const userSessionRef = db
    .collection('companies')
    .doc(companyId)
    .collection('active_sessions')
    .doc(user.uid);

  const existingSnap = await userSessionRef.get();
  const existing = existingSnap.exists ? existingSnap.data() || {} : null;
  const cutoff = Date.now() - SESSION_STALE_MS;
  const existingActive = existing && Number(existing.lastSeenMs || 0) >= cutoff && existing.revoked !== true;
  const sameSession = existing && existing.sessionId === sessionId;
  const incomingStartedAtMs = toPositiveInt(sessionStartedAtMsRaw, 0) || Date.now();
  const existingStartedAtMs = toPositiveInt(existing?.sessionStartedAtMs, 0);

  if (existingActive && !sameSession) {
    // Permitir transferencia automática: la sesión más nueva desplaza a la anterior.
    if (incomingStartedAtMs <= existingStartedAtMs) {
      return {
        ok: false,
        status: 409,
        code: 'SESSION_REPLACED',
        message: 'Tu sesión fue reemplazada por un inicio más reciente en otro dispositivo.',
        details: {
          activeDeviceId: existing.deviceId || null
        }
      };
    }
  }

  const hasActiveForThisUid = activeByUid.has(user.uid);
  const currentActiveCount = activeByUid.size;
  if (!hasActiveForThisUid && currentActiveCount >= limits.maxConcurrentSessions) {
    return {
      ok: false,
      status: 429,
      code: 'SESSION_LIMIT_EXCEEDED',
      message:
        `Tu plan permite ${limits.maxConcurrentSessions} sesiones activas concurrentes. ` +
        'Cerrá una sesión o ampliá tu abono.'
    };
  }

  await userSessionRef.set(
    {
      uid: user.uid,
      email: user.email || '',
      companyId,
      sessionId,
      deviceId: deviceId || 'unknown-device',
      revoked: false,
      plan: limits.plan,
      sessionLimit: limits.maxConcurrentSessions,
      sessionStartedAtMs: incomingStartedAtMs,
      lastSeenMs: Date.now(),
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return {
    ok: true,
    limits,
    activeSessions: Math.max(currentActiveCount, hasActiveForThisUid ? currentActiveCount : currentActiveCount + 1)
  };
}

module.exports = {
  SESSION_STALE_MS,
  resolvePlanLimits,
  ensureCanCreateUser,
  enforceSessionAccess
};
