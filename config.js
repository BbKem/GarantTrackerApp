import firebase from "firebase/compat/app";
import { getDatabase } from "firebase/database";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDl2KQyuz8dZDA0hXq93ve7XjomQuNgpj4",
  authDomain: "garanttrackerapp.firebaseapp.com",
  databaseURL: "https://garanttrackerapp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "garanttrackerapp",
  storageBucket: "garanttrackerapp.firebasestorage.app",
  messagingSenderId: "12201452273",
  appId: "1:12201452273:web:78fe0a69eb16e989e5ff50"
};


const app = initializeApp(firebaseConfig);
const db=getDatabase(app);

export {db};