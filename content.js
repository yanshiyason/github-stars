chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getGithubLinks") {
    const links = document.querySelectorAll('a[href*="github.com/"]');
    const repoSet = new Set();

    links.forEach(link => {
      const match = link.href.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (match) {
        repoSet.add(match[1]);
      }
    });

    sendResponse({ repos: Array.from(repoSet) });
  }
});
