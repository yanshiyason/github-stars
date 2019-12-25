"use strict";

window.onload = function() {
  let githubToken = document.getElementById("githubToken");

  chrome.storage.local.get("githubToken", function(result) {
    if (result.githubToken) {
      githubToken.value = result.githubToken;
    }
  });

  githubToken.oninput = function(event) {
    let { value } = event.target;
    chrome.storage.local.set({ githubToken: value }, () => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      console.debug("Stored github token to local storage", value);
    });
  };
};
