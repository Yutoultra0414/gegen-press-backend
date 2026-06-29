/**
 * Firebase Configuration
 * Gegen Press! バックエンド
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin SDK の初期化
const serviceAccountKey = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

// Firebase を初期化
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// Firestore の取得
const db = admin.firestore();

// Auth の取得
const auth = admin.auth();

// Storage の取得
const storage = admin.storage();

module.exports = {
  admin,
  db,
  auth,
  storage,
};
