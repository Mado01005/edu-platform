let eventBuffer = [];
let flushTimer = null;

function flush() {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer = []; // Clear buffer immediately

  // Send all buffered events in a single network request
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'USER_INTERACTIONS_BATCH',
      details: { events, count: events.length }
    })
  }).catch((err) => {
    console.error('[Telemetry Worker] Failed to flush events', err);
    // Optional: could push events back into array for retry
  });
}

// Start the flush timer when the worker initializes
flushTimer = setInterval(flush, 10000); // 10s intervals

// Listen for messages from the main UI thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'EVENT') {
    eventBuffer.push(event.data.payload);
  } else if (event.data?.type === 'FLUSH') {
    // Immediate flush triggered by UI (e.g., page unload)
    flush();
  }
});
