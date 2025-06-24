// api/config.js

export default function handler(request, response) {
  // The `process.env` object contains your Vercel Environment Variables.
  // These are securely sourced from your Vercel project settings.
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };

  // Send the configuration object back to the client as a JSON response.
  response.status(200).json(firebaseConfig);
}
