const storageFetcher = () => new Promise((resolve, reject) => {
  chrome.storage.local.get(["starCounts"], (result) => {
    if (result.starCounts && result.starCounts.length > 0) {
      resolve(result.starCounts)
    } else {
      // retry in 1 second
      setTimeout(() => {
        storageFetcher().then(resolve).catch(reject)
      }, 1000)
    }
  });

});
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    const repoList = document.getElementById("repoList");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error("No active tab found.");
        return;
      }

      storageFetcher().then((starCounts) => {
        repoList.innerHTML = "";

        starCounts.sort((a, b) => b.stargazersCount - a.stargazersCount)

        for (let i = 0; i < starCounts.length; i++) {
          let { repo, stargazersCount } = starCounts[i]
          const listItem = document.createElement("li");
          listItem.innerHTML = `<a href="${repo}" target="_blank">${repo} [${GITHUB_STAR_MARK}${stargazersCount}]</a>`;
          repoList.appendChild(listItem);
        }
      })
    });
  }, 1000);
});
