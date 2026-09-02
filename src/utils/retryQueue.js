// File d’attente générique avec réessais : même logique que autosaveQueue.js (délai
// croissant plafonné, pause si hors-ligne, dédoublonnage par clé), sans rien de spécifique
// aux projets. Un seul appel « repush » (flush) rejoue les éléments en attente — jamais
// l’état complet de l’application, pour ne jamais écraser un changement fait par quelqu’un
// d’autre pendant la coupure.
const DEFAULT_BASE_DELAY = 1000;
const MAX_RETRY_DELAY = 8000;
const MAX_RETRIES = 5;
const MAX_QUEUE_SIZE = 50;

const wait = (delay) => new Promise((resolve) => {
  setTimeout(resolve, delay);
});

export const createRetryQueue = ({ processItem, onStatusChange, getItemKey } = {}) => {
  const queue = [];
  let isRunning = false;

  const keyOf = typeof getItemKey === 'function' ? getItemKey : () => null;

  const setStatus = (status, details = {}) => {
    if (typeof onStatusChange === 'function') {
      onStatusChange(status, details);
    }
  };

  const run = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    while (queue.length > 0) {
      const entry = queue.shift();

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        queue.unshift(entry);
        setStatus('offline', { queueSize: queue.length });
        isRunning = false;
        return;
      }

      setStatus('syncing', { queueSize: queue.length + 1 });

      try {
        await processItem(entry.payload);
        setStatus('synced', { queueSize: queue.length });
      } catch (error) {
        const retryCount = (entry.retryCount || 0) + 1;
        if (retryCount > MAX_RETRIES) {
          setStatus('error', { queueSize: queue.length, error });
          continue;
        }

        const retryDelay = Math.min(DEFAULT_BASE_DELAY * (2 ** (retryCount - 1)), MAX_RETRY_DELAY);
        queue.unshift({ ...entry, retryCount });
        setStatus('syncing', { queueSize: queue.length, retryInMs: retryDelay });
        await wait(retryDelay);
      }
    }

    isRunning = false;
  };

  return {
    enqueue(payload) {
      const entry = { payload, retryCount: 0 };
      const key = keyOf(payload);
      if (key) {
        const existingIndex = queue.findIndex((candidate) => keyOf(candidate.payload) === key);
        if (existingIndex >= 0) {
          queue.splice(existingIndex, 1, entry);
        } else {
          queue.push(entry);
        }
      } else {
        queue.push(entry);
      }

      if (queue.length > MAX_QUEUE_SIZE) {
        queue.splice(0, queue.length - MAX_QUEUE_SIZE);
      }
      run();
    },
    flush() {
      run();
    },
    size() {
      return queue.length;
    }
  };
};
