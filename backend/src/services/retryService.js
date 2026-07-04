function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryAsync(fn, opts = {}) {
  const {
    retries = 3,
    minDelay = 500,
    factor = 2,
    jitter = true,
  } = opts;

  let attempt = 0;
  let delay = minDelay;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      const rand = jitter ? Math.random() * delay : 0;
      await sleep(Math.round(delay + rand));
      delay = Math.round(delay * factor);
    }
  }
}


function retryable(fn, opts = {}) {
  return (...args) => retryAsync(() => fn(...args), opts);
}

module.exports = {
  retryAsync,
  retryable,
};