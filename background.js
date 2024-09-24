// background.js

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScriptLoaded") {
    chrome.storage.local.set({ starCounts: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
    })

    sendResponse({ message: "Background script received the message." });
  }

  if (request.action === "storeStarCounts") {
    // save the repos to chrome storage
    chrome.storage.local.set({ starCounts: request.starCounts }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      console.debug("Stored repos to local storage", request.repos);
    });

  }

  // Return true to indicate that the response is asynchronous
  return true;
});

// You can also add other event listeners and background tasks here
