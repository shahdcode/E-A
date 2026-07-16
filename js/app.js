/* ===================================================================
   SARAH & JAMES — WEDDING INVITATION
   app.js

   ───────────────────────────────────────────────────────────────────
   SETUP CHECKLIST — read this before going live
   ───────────────────────────────────────────────────────────────────
   1. WEDDING DATE
      Edit CONFIG.weddingDate below if the ceremony date/time changes.

   2. VENUE / MAP
      Replace CONFIG.venue.mapQuery with your exact venue address.
      For a more reliable embed long-term, you can instead go to
      Google Maps → Share → Embed a map → copy the <iframe> "src" URL
      and paste it directly into the iframe in index.html (#venueMap).

   3. GOOGLE FORM (RSVP)
      The RSVP form is fully custom-styled but submits to a Google Form
      behind the scenes, so responses land in a Google Sheet for you.

      a) Create a Google Form with these questions, IN THIS ORDER,
         matching these exact answer choices for the multiple choice one:
           - Full Name              → Short answer
           - Will you be attending? → Multiple choice:
                                         "Joyfully Accepts"
                                         "Regretfully Declines"
           - Number of Guests       → Short answer
           - Message                → Paragraph

      b) Open the live form, click the 3-dot menu → "Get pre-filled link".
         Fill in dummy answers for every question and click "Get link".

      c) Open that pre-filled link and look at the URL. You'll see
         something like:
           ...viewform?entry.123456789=John&entry.987654321=Joyfully...
         Copy each "entry.XXXXXXXXX" number into CONFIG.googleForm.entries
         below, matching it to the right field.
      d) Take the form's normal URL, e.g.:
           https://docs.google.com/forms/d/e/1FAIpQLSxxxxx/viewform
         and change "viewform" to "formResponse". Paste that into
         CONFIG.googleForm.actionUrl below.

      Until you do this, the form will run in "demo mode": it validates
      and shows a success message, but nothing is saved anywhere. You'll
      see a console warning reminding you it isn't configured yet.
   =================================================================== */

const CONFIG = {
  weddingDate: '2026-09-19T17:00:00',

  venue: {
    mapQuery: '26GH+R7 Old Cairo',
  },

  guestLimits: { min: 0, max: 10 },

  googleForm: {
    actionUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeUktQvZy2fcGP0Hi_-l_BqhUjvxXW8r3HpHAh1BxRoJc9rRQ/formResponse',
    entries: {
      fullName: 'entry.1765694629',
      attending: 'entry.1637011081',
      // guestCount: 'entry.REPLACE_ME_3',
      message: 'entry.1408390855',
    },
  },
};

document.addEventListener('DOMContentLoaded', () => {
  [
    initCountdown,
    initScrollReveal,
    initVenue,
    initGuestStepper,
    initRsvpForm,
    initAudioControl,
    initHeroVideoLoop,
    initHeroMask,
  ].forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error(`[app.js] ${fn.name} failed:`, err);
    }
  });
});

/* ===================================================================
   HERO MASK — covers the brief decode glitch when the video starts,
   showing the site background color instead of a raw green flash
   =================================================================== */
function initHeroMask() {
  const video = document.querySelector('.hero__video');
  const mask = document.getElementById('heroMask');
  if (!video || !mask) return;

  video.addEventListener('playing', () => {
    // Small buffer so we're past the very first (potentially glitchy) frames
    setTimeout(() => mask.classList.add('is-hidden'), 250);
  }, { once: true });
}


/* ===================================================================
   HERO VIDEO — plays fully once, then loops only from 0:08 to the end
   =================================================================== */
function initHeroVideoLoop() {
  const video = document.querySelector('.hero__video');
  const mask = document.getElementById('heroMask');
  if (!video) return;

  const LOOP_START = 8; // seconds

  video.addEventListener('ended', () => {
    video.currentTime = LOOP_START;
    video.play().catch(() => {});
  });

  // Try to autoplay normally first (this is what runs 99% of the time).
  // Only if the browser actually blocks it — which iOS does in Low Power
  // Mode — do we fall back to a single tap/click/scroll to start it.
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // Autoplay was blocked. Reveal the poster right away instead of
      // leaving it hidden behind the mask while we wait for a gesture.
      if (mask) mask.classList.add('is-hidden');

      const startOnInteraction = () => {
        video.play().catch(() => {});
        document.removeEventListener('touchstart', startOnInteraction);
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('scroll', startOnInteraction);
      };
      document.addEventListener('touchstart', startOnInteraction, { once: true, passive: true });
      document.addEventListener('click', startOnInteraction, { once: true });
      document.addEventListener('scroll', startOnInteraction, { once: true, passive: true });
    });
  }
}

/* ===================================================================
   AUDIO CONTROL — floating mute/unmute button
   =================================================================== */
/* ===================================================================
   AUDIO CONTROL — floating mute/unmute button
   =================================================================== */
function initAudioControl() {
  const audio = document.getElementById('bgAudio');
  const toggleBtn = document.getElementById('audioToggle');
  const iconOn = toggleBtn?.querySelector('.audio-icon--on');
  const iconOff = toggleBtn?.querySelector('.audio-icon--off');

  if (!audio || !toggleBtn) return;

  let isPlaying = false;

  function updateIcons(playing) {
    if (iconOn) iconOn.style.display = playing ? 'block' : 'none';
    if (iconOff) iconOff.style.display = playing ? 'none' : 'block';
  }

  // Toggle play/pause
  function toggleAudio() {
    if (audio.paused) {
      audio.play().then(() => {
        isPlaying = true;
        updateIcons(true);
      }).catch(() => {
        isPlaying = false;
        updateIcons(false);
      });
    } else {
      audio.pause();
      isPlaying = false;
      updateIcons(false);
    }
  }

  // Click handler
  toggleBtn.addEventListener('click', toggleAudio);

  // Stop the music when the tab/page is hidden or closed — prevents
  // audio continuing in the background on iPhone/Safari.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.pause();
      isPlaying = false;
      updateIcons(false);
    }
  });

  window.addEventListener('pagehide', () => {
    audio.pause();
  });

  // If audio ends, restart loop
  audio.addEventListener('ended', () => {
    if (audio.loop) {
      audio.play().catch(() => {});
    }
  });

  // ===== FORCE AUTOPLAY ON PAGE LOAD =====
  function forceAutoplay() {
    audio.play().then(() => {
      isPlaying = true;
      updateIcons(true);
      console.log('🎵 Audio started playing!');
    }).catch((err) => {
      console.warn('⚠️ Autoplay blocked. Will try on user interaction.', err);
      // Show ON icon anyway so user knows audio is ready
      isPlaying = true;
      updateIcons(true);
      
      // Try to play on ANY user interaction (click, tap, scroll, etc.)
      const playOnInteraction = function() {
        audio.play().then(() => {
          isPlaying = true;
          updateIcons(true);
          console.log('🎵 Audio started on user interaction!');
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('touchstart', playOnInteraction);
          document.removeEventListener('keydown', playOnInteraction);
          document.removeEventListener('scroll', playOnInteraction);
        }).catch(() => {});
      };
      
      document.addEventListener('click', playOnInteraction);
      document.addEventListener('touchstart', playOnInteraction);
      document.addEventListener('keydown', playOnInteraction);
      document.addEventListener('scroll', playOnInteraction);
    });
  }

  // Try to autoplay immediately
  forceAutoplay();

  // Also try again after a short delay (some browsers need this)
  setTimeout(forceAutoplay, 500);
  setTimeout(forceAutoplay, 1500);
}

/* ===================================================================
   COUNTDOWN — days / hours / minutes until CONFIG.weddingDate
   =================================================================== */
function initCountdown() {
  const target = new Date(CONFIG.weddingDate).getTime();

  const elDays = document.getElementById('cd-days');
  const elHours = document.getElementById('cd-hours');
  const elMinutes = document.getElementById('cd-minutes');
  const elSeconds = document.getElementById('cd-seconds');
  const elTimer = document.getElementById('countdownTimer');
  const elArrived = document.getElementById('countdownArrived');

  if (!elDays || !elHours || !elMinutes || !elSeconds || isNaN(target)) return;

  function pad(num) {
    return String(Math.max(0, num)).padStart(2, '0');
  }

  function tick() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      elDays.textContent = '00';
      elHours.textContent = '00';
      elMinutes.textContent = '00';
      elSeconds.textContent = '00';
      if (elTimer) elTimer.hidden = true;
      if (elArrived) elArrived.hidden = false;
      clearInterval(intervalId);
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    elDays.textContent = pad(days);
    elHours.textContent = pad(hours);
    elMinutes.textContent = pad(minutes);
    elSeconds.textContent = pad(seconds);
  }

  tick();
  const intervalId = setInterval(tick, 1000);
}

/* ===================================================================
   SCROLL REVEAL — quiet fade + rise as sections enter the viewport
   =================================================================== */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ===================================================================
   VENUE — wire up the map + "Get Directions" button from CONFIG
   =================================================================== */
function initVenue() {
  const query = encodeURIComponent(CONFIG.venue.mapQuery);

  const map = document.getElementById('venueMap');
  if (map) {
    map.src = `https://www.google.com/maps?q=${query}&output=embed`;
  }

  const directions = document.getElementById('directionsBtn');
  if (directions) {
    directions.href = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
  }
}

/* ===================================================================
   GUEST STEPPER — the - / + control for "Number of Guests Attending"
   =================================================================== */
function initGuestStepper() {
  const input = document.getElementById('guestCount');
  const decreaseBtn = document.getElementById('decreaseGuests');
  const increaseBtn = document.getElementById('increaseGuests');
  if (!input || !decreaseBtn || !increaseBtn) return;

  const { min, max } = CONFIG.guestLimits;

  function setValue(next) {
    const clamped = Math.min(max, Math.max(min, next));
    input.value = String(clamped);
    decreaseBtn.disabled = clamped <= min;
    increaseBtn.disabled = clamped >= max;
  }

  decreaseBtn.addEventListener('click', () => setValue(parseInt(input.value, 10) - 1));
  increaseBtn.addEventListener('click', () => setValue(parseInt(input.value, 10) + 1));

  setValue(parseInt(input.value, 10) || 1);

  // If the couple declines, guest count drops to 0 and locks; accepting restores it to at least 1.
  document.querySelectorAll('input[name="attending"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Regretfully Declines') {
        setValue(0);
        decreaseBtn.disabled = true;
        increaseBtn.disabled = true;
      } else {
        decreaseBtn.disabled = false;
        increaseBtn.disabled = false;
        if (parseInt(input.value, 10) < 1) setValue(1);
      }
    });
  });
}

/* ===================================================================
   RSVP FORM — validation + submission to the Google Form
   =================================================================== */
function initRsvpForm() {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  const submitBtn = document.getElementById('rsvpSubmit');
  const statusEl = document.getElementById('rsvpStatus');

  const fields = {
    fullName: {
      input: document.getElementById('fullName'),
      group: document.getElementById('fullName')?.closest('.form-group'),
      errorEl: document.getElementById('error-fullName'),
    },
    attending: {
      group: document.getElementById('rsvpForm').querySelector('fieldset'),
      errorEl: document.getElementById('error-attending'),
    },
    // guestCount: {
    //   group: document.getElementById('guestGroup'),
    //   errorEl: document.getElementById('error-guestCount'),
    // },
  };

  function setError(key, message) {
    const field = fields[key];
    if (!field) return;
    if (field.group) field.group.classList.add('has-error');
    if (field.errorEl) field.errorEl.textContent = message;
  }

  function clearError(key) {
    const field = fields[key];
    if (!field) return;
    if (field.group) field.group.classList.remove('has-error');
    if (field.errorEl) field.errorEl.textContent = '';
  }

  function clearAllErrors() {
    Object.keys(fields).forEach(clearError);
  }

  function validate() {
    clearAllErrors();
    let isValid = true;
    let firstInvalid = null;

    const fullName = fields.fullName.input.value.trim();
    if (!fullName) {
      setError('fullName', 'Please tell us your name.');
      firstInvalid = firstInvalid || fields.fullName.input;
      isValid = false;
    }

    const attending = form.querySelector('input[name="attending"]:checked');
    if (!attending) {
      setError('attending', 'Please choose one.');
      firstInvalid = firstInvalid || form.querySelector('input[name="attending"]');
      isValid = false;
    }

    if (!isValid && firstInvalid) firstInvalid.focus();

    return { isValid, attending };
  }

  function buildPayload(attendingInput) {
    return {
      fullName: fields.fullName.input.value.trim(),
      attending: attendingInput.value,
      message: document.getElementById('message').value.trim(),
    };
  }

  function isGoogleFormConfigured() {
    return (
      !CONFIG.googleForm.actionUrl.includes('REPLACE_WITH_YOUR_FORM_ID') &&
      !Object.values(CONFIG.googleForm.entries).some((v) => v.includes('REPLACE_ME'))
    );
  }

  async function submitToGoogleForm(data) {
    const params = new URLSearchParams();
    params.append(CONFIG.googleForm.entries.fullName, data.fullName);
    params.append(CONFIG.googleForm.entries.attending, data.attending);
    params.append(CONFIG.googleForm.entries.message, data.message);

    // Google Forms doesn't return CORS headers, so the response is opaque.
    // A resolved fetch (no thrown network error) is treated as success.
    await fetch(CONFIG.googleForm.actionUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.querySelector('.btn-text').textContent = isSubmitting ? 'Sending…' : 'Send RSVP';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const { isValid, attending } = validate();
    if (!isValid) return;

    const data = buildPayload(attending);
    setSubmitting(true);
    statusEl.textContent = '';
    statusEl.classList.remove('is-error');

    try {
      if (isGoogleFormConfigured()) {
        await submitToGoogleForm(data);
      } else {
        console.warn(
          '[RSVP] Google Form is not configured yet — see the SETUP CHECKLIST at the top of js/app.js. Showing a demo success message; nothing was saved.'
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      statusEl.textContent = 'Thank you! Your RSVP has been received with love.';
      form.reset();
      clearAllErrors();
    } catch (err) {
      statusEl.textContent = "Something went wrong — please try again, or reach out to us directly.";
      statusEl.classList.add('is-error');
    } finally {
      setSubmitting(false);
    }
  });

  function initGuestStepperReset() {
    const input = document.getElementById('guestCount');
    const decreaseBtn = document.getElementById('decreaseGuests');
    const increaseBtn = document.getElementById('increaseGuests');
    if (input) input.value = '1';
    if (decreaseBtn) decreaseBtn.disabled = false;
    if (increaseBtn) increaseBtn.disabled = false;
  }
}
