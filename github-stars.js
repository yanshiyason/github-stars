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

const requestQueue = [];
let isProcessing = false;
const BATCH_SIZE = 50; // Number of requests to process at a time

const processQueue = () => {
  if (requestQueue.length === 0) {
    isProcessing = false; // Reset processing flag when the queue is empty
    return; // Exit if there's nothing to process
  }

  isProcessing = true; // Set processing flag
  const batch = requestQueue.splice(0, BATCH_SIZE); // Get the next batch of requests

  // Process each request in the batch
  const promises = batch.map(({ url, token, onStargazersCount }) =>
    fetchGithubStars(url, token, onStargazersCount)
  );

  // Wait for all promises in the batch to resolve
  Promise.all(promises)
    .then(() => {
      setTimeout(processQueue, 500); // Delay before processing the next batch
    })
    .catch(() => {
      setTimeout(processQueue, 500); // Delay even on error
    });
};

const queueFetchGithubStars = function (url, token, onStargazersCount) {
  requestQueue.push({ url, token, onStargazersCount });
  checkQueue(); // Check the queue to start processing if needed
};

const checkQueue = () => {
  if (requestQueue.length > 0 && !isProcessing) {
    processQueue(); // Start processing if there are items in the queue
  }
};

const fetchGithubStars = function (url, token, onStargazersCount) {
  const [_, { user, repo }] = extractRepoFromUrl(url);
  const apiUrl = `https://api.github.com/repos/${user}/${repo}`;

  const headers = {};
  if (token) {
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
      queueFetchGithubStars(url, token, onStargazersCount);
      return;
    }

    const isExpired = cached.timestamp + EXPIRE_AFTER < Date.now();

    if (cached.stargazersCount === "NOT_A_REPO") {
      onStargazersCount("NOT_A_REPO");
      return;
    }

    if (isExpired || cached.stargazersCount === undefined) {
      queueFetchGithubStars(url, token, onStargazersCount);
    } else {
      onStargazersCount(cached.stargazersCount);
    }
  });
};
