chrome.runtime.sendMessage({ action: "contentScriptLoaded" });

chrome.storage.local.get(["githubToken"], function (result) {
  const aTags = document.querySelectorAll("a[href*='github.com/']");
  const starCounts = [];
  let responses = 0;
  for (let i = 0; i < aTags.length; i++) {
    displayCachedOrRemoteGithubStars(
      aTags[i].href,
      result.githubToken,
      stargazersCount => {
        responses++;
        if (stargazersCount === "NOT_A_REPO") {
          return;
        }

        if (typeof stargazersCount !== "number") {
          return;
        }


        aTags[i].innerHTML = `${aTags[i].innerHTML} [${GITHUB_STAR_MARK}${stargazersCount}]`;

        starCounts.push({ repo: aTags[i].href, stargazersCount });

        if (responses === aTags.length - 1) {
          chrome.runtime.sendMessage({
            action: "storeStarCounts",
            starCounts,
          });
        }
      }
    );
  }
});
