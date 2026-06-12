// modules/chat.js - AI Chatbot Module for Smart Turkistan
import { api } from '../api.js';

export const ChatModule = {
  init() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const hints = document.querySelectorAll('#chat-quick-hints .hint-chip');

    if (!form || !input) return;

    // 1. Chat Form Submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = input.value.trim();
      if (msg === "") return;
      
      this.sendMessage(msg);
      input.value = "";
    });

    // 2. Suggestion Hints
    hints.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const text = e.target.innerText;
        this.sendMessage(text);
      });
    });
  },

  async sendMessage(messageText) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    // A) Append User Message
    const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgHTML = `
      <div class="message user">
        <div class="message-bubble">${this.escapeHTML(messageText)}</div>
        <span class="message-time">${userTime}</span>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', userMsgHTML);
    this.scrollToBottom();

    // B) Show Bot Typing Indicator
    const typingId = `bot-typing-${Date.now()}`;
    const typingHTML = `
      <div class="message bot" id="${typingId}">
        <div class="message-bubble" style="display: flex; gap: 4px; padding: 10px 14px; align-items: center;">
          <span class="dot" style="width: 6px; height: 6px; background: var(--color-primary); border-radius: 50%; animation: chat-dot 1.2s infinite ease-in-out;"></span>
          <span class="dot" style="width: 6px; height: 6px; background: var(--color-primary); border-radius: 50%; animation: chat-dot 1.2s infinite ease-in-out 0.2s;"></span>
          <span class="dot" style="width: 6px; height: 6px; background: var(--color-primary); border-radius: 50%; animation: chat-dot 1.2s infinite ease-in-out 0.4s;"></span>
        </div>
        <style>
          @keyframes chat-dot {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
        </style>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', typingHTML);
    this.scrollToBottom();

    try {
      // C) Send query to Mock API
      const res = await api.sendChatMessage(messageText);

      // Remove typing indicator
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      // D) Append Bot Reply
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsgHTML = `
        <div class="message bot">
          <div class="message-bubble">${res.response}</div>
          <span class="message-time">${botTime}</span>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', botMsgHTML);
      this.scrollToBottom();

    } catch (error) {
      console.error(error);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      container.insertAdjacentHTML('beforeend', `
        <div class="message bot">
          <div class="message-bubble" style="color: var(--color-danger)">Кешіріңіз, қате орын алды. Қайталап көріңіз.</div>
        </div>
      `);
      this.scrollToBottom();
    }
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
};
