/**
 * HTML Editor - Background Service Worker
 */
(() => {
  'use strict';

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'download') {
      // Use chrome.downloads API to save the file
      chrome.downloads.download({
        url: msg.url,
        filename: msg.filename || 'edited.html',
        saveAs: true,
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
      return true; // Keep channel open for async response
    }

    if (msg.type === 'inject') {
      // Inject content script into a specific tab (if not already on file:// page)
      chrome.scripting.executeScript({
        target: { tabId: sender.tab ? sender.tab.id : msg.tabId },
        files: ['content.js'],
      }, () => {
        sendResponse({ success: !chrome.runtime.lastError });
      });
      return true;
    }
  });

  // Handle extension installation
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('[HTML Editor] 扩展已安装');
    }
  });
})();
