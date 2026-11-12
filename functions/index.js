const {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} = require('node:crypto');
const { promisify } = require('node:util');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const {
  isValidNickname,
  isValidPassword,
  isValidUsername,
} = require('./validation');

initializeApp();

const auth = getAuth();
const db = getFirestore();
const scryptAsync = promisify(scrypt);
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_HASH_LENGTH = 64;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://holyhell24.github.io',
];

function hashKey(value) {
  return createHash('sha256').update(value).digest('hex');
}

function clientIp(request) {
  return request.rawRequest.ip || 'unknown';
}

async function consumeRateLimit(key, maxAttempts, windowMs) {
  const ref = db.doc(`authRateLimits/${key}`);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const record = snapshot.exists ? snapshot.data() : {};
    const windowEndsAt = record.windowEndsAt || 0;
    const count = windowEndsAt > now ? record.count || 0 : 0;

    if (count >= maxAttempts) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many attempts. Please try again later.',
      );
    }

    transaction.set(ref, {
      count: count + 1,
      windowEndsAt: windowEndsAt > now ? windowEndsAt : now + windowMs,
      expiresAt: new Date(now + windowMs * 2),
    });
  });
}

async function clearRateLimit(key) {
  await db.doc(`authRateLimits/${key}`).delete();
}

function requireUsername(username) {
  if (!isValidUsername(username)) {
    throw new HttpsError(
      'invalid-argument',
      'Use a username with 3–15 letters or numbers.',
    );
  }
}

function requireNickname(nickname) {
  if (!isValidNickname(nickname)) {
    throw new HttpsError(
      'invalid-argument',
      'Use a nickname with 3–15 letters or numbers.',
    );
  }
}

function requirePassword(password) {
  if (!isValidPassword(password)) {
    throw new HttpsError(
      'invalid-argument',
      'Password must be between 1 and 128 characters.',
    );
  }
}

async function createPasswordHash(password, salt) {
  return scryptAsync(password, salt, PASSWORD_HASH_LENGTH, SCRYPT_OPTIONS);
}

async function removeAccountDocuments(uid, usernameKey, nicknameKey) {
  const userRef = db.doc(`users/${uid}`);
  const credentialRef = db.doc(`credentials/${uid}`);
  const usernameRef = db.doc(`usernames/${usernameKey}`);
  const nicknameRef = db.doc(`nicknameClaims/${nicknameKey}`);

  await db.runTransaction(async (transaction) => {
    const [user, credential, username, nickname] = await Promise.all([
      transaction.get(userRef),
      transaction.get(credentialRef),
      transaction.get(usernameRef),
      transaction.get(nicknameRef),
    ]);

    if (user.exists && user.data().uid === uid) {
      transaction.delete(userRef);
    }
    if (credential.exists && credential.data().uid === uid) {
      transaction.delete(credentialRef);
    }
    if (username.exists && username.data().uid === uid) {
      transaction.delete(usernameRef);
    }
    if (nickname.exists && nickname.data().uid === uid) {
      transaction.delete(nicknameRef);
    }
  });
}

exports.registerAccount = onCall(
  {
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
    memory: '512MiB',
    concurrency: 5,
    maxInstances: 20,
  },
  async (request) => {
    const { username, password, nickname } = request.data || {};
    requireUsername(username);
    requirePassword(password);
    requireNickname(nickname);

    const ipKey = hashKey(clientIp(request));
    await consumeRateLimit(`register_${ipKey}`, 10, 60 * 60 * 1000);

    const usernameKey = username.toLowerCase();
    const nicknameKey = nickname.toLowerCase();
    const uid = randomUUID();
    const salt = randomBytes(16);
    const passwordHash = await createPasswordHash(password, salt);
    const userRef = db.doc(`users/${uid}`);
    const credentialRef = db.doc(`credentials/${uid}`);
    const usernameRef = db.doc(`usernames/${usernameKey}`);
    const nicknameRef = db.doc(`nicknameClaims/${nicknameKey}`);

    await db.runTransaction(async (transaction) => {
      const [usernameClaim, nicknameClaim] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(nicknameRef),
      ]);

      if (usernameClaim.exists) {
        throw new HttpsError(
          'already-exists',
          'That username is already taken.',
        );
      }
      if (nicknameClaim.exists) {
        throw new HttpsError(
          'already-exists',
          'That nickname is already taken.',
        );
      }

      transaction.create(userRef, { uid, username, nickname });
      transaction.create(credentialRef, {
        uid,
        username: usernameKey,
        passwordSalt: salt.toString('base64'),
        passwordHash: passwordHash.toString('base64'),
      });
      transaction.create(usernameRef, { uid });
      transaction.create(nicknameRef, { uid });
    });

    try {
      await auth.createUser({ uid });
    } catch (error) {
      await removeAccountDocuments(uid, usernameKey, nicknameKey);
      throw error;
    }

    return { token: await auth.createCustomToken(uid) };
  },
);

exports.loginAccount = onCall(
  {
    region: 'us-central1',
    cors: ALLOWED_ORIGINS,
    memory: '512MiB',
    concurrency: 5,
    maxInstances: 20,
  },
  async (request) => {
    const { username, password } = request.data || {};
    requireUsername(username);
    requirePassword(password);

    const usernameKey = username.toLowerCase();
    const ipKey = hashKey(clientIp(request));
    const userKey = hashKey(`${clientIp(request)}:${usernameKey}`);
    await consumeRateLimit(`login_ip_${ipKey}`, 100, 15 * 60 * 1000);
    await consumeRateLimit(`login_user_${userKey}`, 10, 15 * 60 * 1000);

    const usernameSnapshot = await db.doc(`usernames/${usernameKey}`).get();
    const uid = usernameSnapshot.exists
      ? usernameSnapshot.data().uid
      : undefined;
    const credentialSnapshot = uid
      ? await db.doc(`credentials/${uid}`).get()
      : undefined;
    const credential = credentialSnapshot?.exists
      ? credentialSnapshot.data()
      : undefined;

    if (
      !credential ||
      typeof credential.passwordSalt !== 'string' ||
      typeof credential.passwordHash !== 'string'
    ) {
      await createPasswordHash(password, Buffer.alloc(16));
      throw new HttpsError(
        'unauthenticated',
        'Username or password is incorrect.',
      );
    }

    const storedHash = Buffer.from(credential.passwordHash, 'base64');
    const candidateHash = await createPasswordHash(
      password,
      Buffer.from(credential.passwordSalt, 'base64'),
    );

    if (
      storedHash.length !== candidateHash.length ||
      !timingSafeEqual(storedHash, candidateHash)
    ) {
      throw new HttpsError(
        'unauthenticated',
        'Username or password is incorrect.',
      );
    }

    await clearRateLimit(`login_ip_${ipKey}`);
    await clearRateLimit(`login_user_${userKey}`);
    return { token: await auth.createCustomToken(uid) };
  },
);

exports.changeNickname = onCall(
  { region: 'us-central1', cors: ALLOWED_ORIGINS, maxInstances: 20 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to edit your nickname.');
    }

    const { nickname } = request.data || {};
    requireNickname(nickname);

    const uid = request.auth.uid;
    const userRef = db.doc(`users/${uid}`);
    const nicknameKey = nickname.toLowerCase();
    const nicknameRef = db.doc(`nicknameClaims/${nicknameKey}`);

    const result = await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) {
        throw new HttpsError(
          'not-found',
          'Your account profile could not be found.',
        );
      }

      const currentNickname = userSnapshot.data().nickname;
      if (!isValidNickname(currentNickname)) {
        throw new HttpsError(
          'failed-precondition',
          'Your saved nickname is invalid.',
        );
      }

      const currentKey = currentNickname.toLowerCase();
      const currentClaimRef = db.doc(`nicknameClaims/${currentKey}`);
      const nicknameClaim = await transaction.get(nicknameRef);
      const currentClaim =
        currentKey === nicknameKey
          ? nicknameClaim
          : await transaction.get(currentClaimRef);

      if (nicknameClaim.exists && nicknameClaim.data().uid !== uid) {
        return { status: 'taken' };
      }
      if (!currentClaim.exists || currentClaim.data().uid !== uid) {
        throw new HttpsError(
          'failed-precondition',
          'Your nickname claim is missing. Please contact support.',
        );
      }

      if (currentKey !== nicknameKey) {
        transaction.delete(currentClaimRef);
      }
      transaction.set(nicknameRef, { uid });
      transaction.update(userRef, { nickname });
      return { status: 'saved', nickname };
    });

    if (result.status === 'taken') {
      throw new HttpsError('already-exists', 'That nickname is already taken.');
    }

    return { nickname: result.nickname };
  },
);
