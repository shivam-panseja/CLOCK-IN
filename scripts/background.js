/**
 * Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Keka Auto-Login Extension installed.');
  
  // Initialize default settings
  chrome.storage.sync.get(['autoLoginEnabled', 'autoLoginEmail'], (result) => {
    if (result.autoLoginEnabled === undefined) {
      chrome.storage.sync.set({ autoLoginEnabled: true });
    }
  });
});

/**
 * Handle messages from content scripts if needed
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'LOGIN_SUCCESS') {
    console.log('Login detected for:', sender.tab.url);
    // Potential for future features like tracking session time
  }
});

/**
 * Optional: Detect if login is stuck and redirect
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = tab.url.toLowerCase();
    
    // If we land on Keka login but we think we should be logged in, we could trigger a check.
    // However, usually the content script handles the login button.
  }
});
