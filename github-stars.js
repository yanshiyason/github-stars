const EXPIRE_AFTER = 1000 * 60 * 60 * 24; // 1 day
const GITHUB_STAR_MARK = `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' aria-label='star' height='16' class='octicon octicon-star v-align-text-bottom' viewBox='0 0 14 16' version='1.1' width='14' role='img'%3E%3Cpath fill-rule='evenodd' d='M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6z'%3E%3C/path%3E%3C/svg%3E" width="14px" height="14px" style="display: inline; margin: 0px; padding: 1px; width: 14px;" />`;

const extractRepoFromUrl = function (url) {
  const match = url.match(
    /^https?:\/\/github.com\/([a-zA-Z0-9_\-\.]+)?\/([a-zA-Z0-9_\-\.]+)\/?$/
  );

  if (!match) {
    return [false, null];
  }

  return [true, { user: match[1], repo: match[2] }];
};

const saveToCache = function (url, stargazersCount) {
  const value = { stargazersCount, timestamp: new Date().getTime() };
  chrome.storage.local.set({ [url]: value }, () => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    console.debug(
      "Stored stargazersCount to local storage for url",
      url,
      stargazersCount
    );
  });
};

const fetchGithubStars = function (url, token, onStargazersCount) {
  const [_, { user, repo }] = extractRepoFromUrl(url);
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;

  const headers = {};
  if (token) {
    console.debug("github token found, setting auth header");
    headers["Authorization"] = `token ${token}`;
  }

  return fetch(apiUrl, { headers })
    .then((response) => {
      return response.json().then((data) => {
        if (
          data.message &&
          data.message.match(/API rate limit exceeded/)
        ) {
          throw new Error(
            "Github API Rate limit exceeded. Please set an auth token in the options page."
          );
        }

        let count;
        if (data.message === "Not Found") {
          count = "NOT_A_REPO";
        } else {
          count = data.stargazers_count;
        }
        saveToCache(url, count);
        return count;
      });
    })
    .then(onStargazersCount)
    .catch((err) => {
      console.error(`Failed to fetch stars for ${apiUrl}`, err);
      onStargazersCount("NOT_A_REPO");
    });
};

const displayCachedOrRemoteGithubStars = function (
  url,
  token,
  onStargazersCount
) {
  const [ok, _] = extractRepoFromUrl(url);
  if (!ok) {
    onStargazersCount("NOT_A_REPO");
    return;
  }

  chrome.storage.local.get(url, (result) => {
    const cached = result[url];
    if (!cached) {
      fetchGithubStars(url, token, onStargazersCount);
      return;
    }

    const isExpired = cached.timestamp + EXPIRE_AFTER < Date.now();

    if (cached.stargazersCount === "NOT_A_REPO") {
      onStargazersCount("NOT_A_REPO");
      return;
    }

    if (isExpired || cached.stargazersCount === undefined) {
      fetchGithubStars(url, token, onStargazersCount);
    } else {
      onStargazersCount(cached.stargazersCount);
    }
  });
};
