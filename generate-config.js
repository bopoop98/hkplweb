const fs = require('fs');

function escape(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
  'FIREBASE_MEASUREMENT_ID'
];

let missing = false;
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.warn(`Warning: Environment variable ${v} is not set.`);
    missing = true;
  }
}

const config = `
const firebaseConfig = {
  apiKey: "${escape(process.env.FIREBASE_API_KEY)}",
  authDomain: "${escape(process.env.FIREBASE_AUTH_DOMAIN)}",
  projectId: "${escape(process.env.FIREBASE_PROJECT_ID)}",
  storageBucket: "${escape(process.env.FIREBASE_STORAGE_BUCKET)}",
  messagingSenderId: "${escape(process.env.FIREBASE_MESSAGING_SENDER_ID)}",
  appId: "${escape(process.env.FIREBASE_APP_ID)}",
  measurementId: "${escape(process.env.FIREBASE_MEASUREMENT_ID)}"
};

export default firebaseConfig;
`;

fs.writeFileSync('config.js', config);
console.log('config.js generated!');
if (missing) {
  process.exit(1);
}
