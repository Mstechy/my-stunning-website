import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";
import { formatDate } from "./db.js";
import { getLocation, attachMap } from "./map.js";

// 🔐 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCLcicbtIwsJ5kKY_Gkid1UGA405gxMCX8",
  authDomain: "lifelong-vault.firebaseapp.com",
  projectId: "lifelong-vault",
  storageBucket: "lifelong-vault.appspot.com",
  messagingSenderId: "934673423800",
  appId: "1:934673423800:web:86443335b674337ad7034d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const memsCol = collection(db, 'memories');

// 🧩 DOM Elements
const form = document.getElementById('form-memory');
const timeline = document.getElementById('timeline');
const modal = document.getElementById('modal-add');
const toast = document.getElementById('toast');
const themeToggle = document.getElementById('theme-toggle');
const themeSelect = document.getElementById('theme-select');
const recordBtn = document.getElementById('btn-record');

let mediaRecorder;
let audioChunks = [];

// 🎙 Voice Recorder
recordBtn.onclick = async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const file = new File([blob], voice-'Date.now()'.webm);
      const dt = new DataTransfer();
      dt.items.add(file);
      form['mem-voice'].files = dt.files;
      recordBtn.textContent = '🎙 Record';
    };

    mediaRecorder.start();
    recordBtn.textContent = '⏹ Stop';
  } catch (err) {
    alert('🎙 Please allow mic access.');
  }
};

// 📝 Form Submission
form.onsubmit = async (e) => {
  e.preventDefault();
  modal.classList.add('hidden');

  const data = {
    title: form['mem-title'].value,
    desc: form['mem-desc'].value,
    date: form['mem-date'].value,
    createdAt: new Date()
  };

  const loc = await getLocation();
  if (loc) data.location = loc;

  const urls = await Promise.all(['mem-img', 'mem-video', 'mem-voice'].map(async (id) => {
    const file = form[id].files[0];
    if (!file) return null;
    const snap = await uploadBytes(ref(storage, 'id'/'Date.now()'-'file.name'), file);
    return getDownloadURL(snap.ref);
  }));

  if (urls[0]) data.img = urls[0];
  if (urls[1]) data.video = urls[1];
  if (urls[2]) data.voice = urls[2];

  await addDoc(memsCol, data);
  form.reset();
  showToast('✅ Memory saved');
  loadMemories();
};

// 🔁 Load Memories
async function loadMemories() {
  timeline.innerHTML = '';
  const snap = await getDocs(memsCol);

  snap.docs
    .sort((a, b) => b.data().createdAt - a.data().createdAt)
    .forEach((d) => renderMemory(d.data()));
}
window.addEventListener('DOMContentLoaded', loadMemories);

// 🧱 Render Memory Card
function renderMemory(mem) {
  const card = document.createElement('div');
  card.className = 'timeline-entry';

  card.innerHTML = `
    <h3>${formatDate(mem.date)} – ${mem.title}</h3>
    <p>${mem.desc}</p>
    ${mem.img ? <img src="${mem.img}" style="max-width:100%;margin-top:.5rem" /> : ''}
    ${mem.video ? <video src="${mem.video}" controls style="max-width:100%;margin-top:.5rem"></video> : ''}
    ${mem.voice ? <audio src="${mem.voice}" controls style="margin-top:.5rem"></audio> : ''}
  `;

  if (mem.location) {
    const div = document.createElement('div');
    div.className = 'map';
    card.append(div);
    attachMap(div, mem.location);
  }

  timeline.prepend(card);
}

// 🍞 Toast Notification
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// 🌗 Theme Switch
function applyTheme(mode) {
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (mode === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    prefers
      ? document.documentElement.setAttribute('data-theme', 'dark')
      : document.documentElement.removeAttribute('data-theme');
  }

  themeSelect.value = mode;
  themeToggle.textContent = document.documentElement.hasAttribute('data-theme') ? '☀' : '🌙';
}

const saved = localStorage.getItem('lv-theme') || 'auto';
applyTheme(saved);

themeSelect.onchange = () => {
  localStorage.setItem('lv-theme', themeSelect.value);
  applyTheme(themeSelect.value);
};

themeToggle.onclick = () => {
  const next = document.documentElement.hasAttribute('data-theme') ? 'light' : 'dark';
  localStorage.setItem('lv-theme', next);
  applyTheme(next);
};

// 📍 Modal Events
document.getElementById('btn-add').onclick = () => modal.classList.remove('hidden');
document.getElementById('btn-close').onclick = () => modal.classList.add('hidden');
document.getElementById('btn-start').onclick = () => document.getElementById('welcome').style.display = 'none';