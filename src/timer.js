var queueHead,
    queueTail,
    active, // the currently-executing timer
    frame, // is an animation frame pending?
    timeout, // is a timeout pending?
    timeoutTime = Infinity; // the time the timeout will fire

// The timer will continue to fire until callback returns true.
export function timer(callback, delay, time) {
  if (time == null) time = Date.now(); else time = +time;
  if (delay != null) time += +delay;

  // Add the callback to the tail of the queue.
  var timer = {callback: callback, time: time, flush: false, next: null};
  if (queueTail) queueTail.next = timer;
  else queueHead = timer;
  queueTail = timer;

  wakeAt(time);
};

// Replace the current timer. Only allowed within a timer callback.
export function timerReplace(callback, delay, time) {
  if (time == null) time = Date.now(); else time = +time;
  if (delay != null) time += +delay;
  active.callback = callback;
  active.time = time;
};

// Execute all eligible timers,
// then flush completed timers to avoid concurrent queue modification.
// Returns the time of the earliest active timer.
export function timerFlush(time) {
  if (time == null) time = Date.now(); else time = +time;
  var active0 = active;

  // Note: timerFlush can be re-entrant, so we must preserve the old active.
  active = queueHead;
  while (active) {
    if (time >= active.time) active.flush = active.callback(time - active.time, time);
    active = active.next;
  }
  active = active0;
  time = Infinity;

  // Note: invoking a timer callback can change the timer queue (due to a re-
  // entrant timerFlush or scheduling a new timer). Thus we must defer capturing
  // queueHead until after we’ve invoked all callbacks.
  var t0,
      t1 = queueHead;
  while (t1) {
    if (t1.flush) {
      t1 = t0 ? t0.next = t1.next : queueHead = t1.next;
    } else {
      if (t1.time < time) time = t1.time;
      t1 = (t0 = t1).next;
    }
  }
  queueTail = t0;
  return time;
};

function wake() {
  frame = timeout = 0, timeoutTime = Infinity;
  wakeAt(timerFlush());
}

function wakeAt(time) {
  if (frame) return; // Fastest wake already set.
  var delay = time - Date.now();
  if (delay > 24) {
    if (timeoutTime > time) { // Note: false if time is infinite.
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(wake, delay);
      timeoutTime = time;
    }
  } else {
    if (timeout) timeout = clearTimeout(timeout), timeoutTime = Infinity;
    frame = requestAnimationFrame(wake);
  }
}
