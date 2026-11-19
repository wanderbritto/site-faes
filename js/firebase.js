// FAES - Conexão com o Firebase (autenticação e banco de dados)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAa2iU-XBVuInCLssstccsb5suQEfgfUP4",
  authDomain: "faes-site.firebaseapp.com",
  projectId: "faes-site",
  storageBucket: "faes-site.firebasestorage.app",
  messagingSenderId: "943039773153",
  appId: "1:943039773153:web:ef875669e34d6863df7aa0"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);