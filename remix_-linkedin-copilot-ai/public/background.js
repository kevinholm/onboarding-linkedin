/**
 * LinkedIn Executive Copilot - Background Script
 */

// Handle extension icon click to open the side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LINKEDIN_POST_TEXT') {
    // Forward the message to the side panel
    // The side panel is index.html, which will be listening for this message
    console.log('Received post text from content script:', message.text);
  }
  return true;
});
