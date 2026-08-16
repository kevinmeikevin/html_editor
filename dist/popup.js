/**
 * HTML Editor - Popup Script
 */
(() => {
  'use strict';

  const dot = document.getElementById('dot');
  const statusText = document.getElementById('status-text');
  const btnToggle = document.getElementById('btn-toggle');
  const btnSave = document.getElementById('btn-save');
  const warning = document.getElementById('file-access-warning');
  const btnOpenExtensions = document.getElementById('btn-open-extensions');

  let currentTab = null;
  let isFilePage = false;

  // Check current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    currentTab = tabs[0];
    const url = currentTab.url || '';

    if (url.startsWith('file://')) {
      isFilePage = true;
      statusText.textContent = '本地 HTML 文件';
      dot.className = 'status-dot';
      checkEditorStatus();
    } else {
      isFilePage = false;
      statusText.textContent = '请打开本地 HTML 文件 (file://)';
      dot.className = 'status-dot inactive';
      btnToggle.disabled = true;
      btnSave.disabled = true;
    }
  });

  // Check if content script is loaded and editing
  function checkEditorStatus() {
    chrome.tabs.sendMessage(currentTab.id, { type: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not loaded - file access not enabled
        statusText.textContent = '未开启文件访问权限，请看下方说明';
        dot.className = 'status-dot inactive';
        warning.style.borderColor = '#ef4444';
        warning.style.background = '#fef2f2';
        btnToggle.disabled = true;
        btnSave.disabled = true;
        btnOpenExtensions.style.animation = 'pulse 1.5s ease-in-out infinite';
        return;
      }

      if (response && response.editing) {
        statusText.textContent = '编辑模式已开启';
        dot.className = 'status-dot active';
        btnToggle.textContent = '停止编辑';
      } else {
        statusText.textContent = '编辑模式未开启';
        dot.className = 'status-dot';
        btnToggle.textContent = '开始编辑';
      }
    });
  }

  // Open chrome://extensions page (with extension ID to highlight this extension)
  btnOpenExtensions.addEventListener('click', () => {
    const extId = chrome.runtime.id;
    chrome.tabs.create({ url: 'chrome://extensions/?id=' + extId });
  });

  // Toggle edit mode
  btnToggle.addEventListener('click', () => {
    if (!currentTab || !isFilePage) return;
    chrome.tabs.sendMessage(currentTab.id, { type: 'toggleEdit' }, (response) => {
      if (chrome.runtime.lastError) {
        statusText.textContent = '无法连接到编辑器';
        dot.className = 'status-dot inactive';
        return;
      }
      if (response && response.editing) {
        statusText.textContent = '编辑模式已开启';
        dot.className = 'status-dot active';
        btnToggle.textContent = '停止编辑';
      } else {
        statusText.textContent = '编辑模式未开启';
        dot.className = 'status-dot';
        btnToggle.textContent = '开始编辑';
      }
    });
  });

  // Save
  btnSave.addEventListener('click', () => {
    if (!currentTab || !isFilePage) return;
    chrome.tabs.sendMessage(currentTab.id, { type: 'save' }, () => {
      if (chrome.runtime.lastError) {
        statusText.textContent = '无法连接到编辑器';
        return;
      }
      window.close();
    });
  });
})();
