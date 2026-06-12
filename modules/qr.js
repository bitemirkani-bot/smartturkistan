// modules/qr.js - QR Scanner & Generator Module for Smart Turkistan
import { api } from '../api.js';

let html5QrcodeScanner = null;

export const QrModule = {
  async init() {
    const placeSelect = document.getElementById('qr-place-select');
    const generateBtn = document.getElementById('generate-qr-btn');
    const startScanBtn = document.getElementById('start-scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');
    const statusMsg = document.getElementById('scanner-status');

    if (!placeSelect) return;

    // 1. Populate Place Select for Generator
    try {
      const places = await api.getPlaces();
      placeSelect.innerHTML = places.map(p => `
        <option value="${p.id}">${p.name} (ID: ${p.id})</option>
      `).join('');
    } catch (e) {
      console.error(e);
    }

    // 2. Generate QR Button Click Handler
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateQr();
      });
    }

    // 3. Scanner Controls
    if (startScanBtn) {
      startScanBtn.addEventListener('click', () => {
        this.startScanner();
      });
    }

    if (stopScanBtn) {
      stopScanBtn.addEventListener('click', () => {
        this.stopScanner();
      });
    }
  },

  generateQr() {
    const placeSelect = document.getElementById('qr-place-select');
    const qrOutput = document.getElementById('qr-code-output');

    if (!placeSelect || !qrOutput) return;

    const placeId = placeSelect.value;
    const placeName = placeSelect.options[placeSelect.selectedIndex].text;
    
    // Scannable payload: smart-turkistan:place-id:3
    const qrData = `smart-turkistan:place-id:${placeId}`;
    
    // Use public QR Code API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

    qrOutput.innerHTML = `
      <div style="text-align: center;">
        <img class="qr-img" src="${qrUrl}" alt="${placeName} QR Code">
        <p class="sub-text mt-2" style="font-weight: 600; color: var(--color-primary);">${placeName}</p>
        <button id="sim-scan-btn" class="btn btn-sm btn-outline mt-2 w-full" data-payload="${qrData}">
          <i data-lucide="scan"></i> Осы QR-ды сканерлеуді симуляциялау
        </button>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Simulation Button
    const simBtn = document.getElementById('sim-scan-btn');
    if (simBtn) {
      simBtn.addEventListener('click', (e) => {
        const payload = e.currentTarget.getAttribute('data-payload');
        this.handleQrScanResult(payload);
      });
    }
  },

  startScanner() {
    const statusMsg = document.getElementById('scanner-status');
    const startScanBtn = document.getElementById('start-scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');

    if (!document.getElementById('qr-reader')) return;

    statusMsg.innerText = "Камераға рұқсат сұралуда...";
    startScanBtn.classList.add('hidden');
    stopScanBtn.classList.remove('hidden');

    // Initialize HTML5 QR Reader
    html5QrcodeScanner = new Html5Qrcode("qr-reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrcodeScanner.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => {
        // Scan Success callback
        this.handleQrScanResult(decodedText);
        this.stopScanner();
      },
      (errorMessage) => {
        // Verbose scan failure (usually safely ignorable as camera sweeps)
      }
    ).then(() => {
      statusMsg.innerText = "Сканер белсенді. QR кодты камераға жақындатыңыз.";
      statusMsg.style.color = "var(--color-success)";
    }).catch(err => {
      console.error(err);
      statusMsg.innerText = "Камера қосылмады: " + err;
      statusMsg.style.color = "var(--color-danger)";
      this.stopScanner();
    });
  },

  stopScanner() {
    const statusMsg = document.getElementById('scanner-status');
    const startScanBtn = document.getElementById('start-scan-btn');
    const stopScanBtn = document.getElementById('stop-scan-btn');

    startScanBtn.classList.remove('hidden');
    stopScanBtn.classList.add('hidden');
    statusMsg.innerText = "Сканер белсенді емес";
    statusMsg.style.color = "var(--color-text-muted)";

    if (html5QrcodeScanner) {
      html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner = null;
      }).catch(err => {
        console.error("Error stopping scanner:", err);
      });
    }
  },

  handleQrScanResult(decodedText) {
    console.log("QR scanned payload:", decodedText);
    const statusMsg = document.getElementById('scanner-status');
    
    // Check if format matches: smart-turkistan:place-id:3
    if (decodedText.startsWith("smart-turkistan:place-id:")) {
      const parts = decodedText.split(":");
      const placeId = parts[parts.length - 1];
      
      // Trigger details modal open
      document.dispatchEvent(new CustomEvent('open-place-detail', { detail: placeId }));
      
      // Celebrate with confetti!
      if (window.confetti) {
        window.confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    } else {
      alert(`Сканерленген QR код жүйеге сәйкес келмейді: ${decodedText}`);
    }
  }
};
