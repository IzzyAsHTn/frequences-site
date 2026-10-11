/* Cycle de lecture commun aux quatre ateliers Sampling. */
(() => {
  'use strict';

  function create() {
    let context;
    let active;
    let generation = 0;

    function disconnect(voice) {
      voice.source.disconnect();
      voice.gain.disconnect();
    }

    function stopSource() {
      if (!active) return;
      const voice = active;
      active = null;
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* Une source déjà terminée est silencieuse. */ }
      disconnect(voice);
    }

    function silence() {
      generation += 1;
      stopSource();
      if (context && context.state === 'running') {
        context.suspend().catch(error => console.error('Suspension audio impossible.', error));
      }
    }

    async function play(buildVoice) {
      const request = ++generation;
      try {
        context ??= new AudioContext();
        await context.resume();
        if (request !== generation || document.hidden) {
          if (document.hidden) silence();
          return;
        }
        stopSource();
        const voice = buildVoice(context);
        active = voice;
        voice.source.onended = () => {
          disconnect(voice);
          if (active === voice) active = null;
        };
        voice.source.start(...(voice.start || []));
      } catch (error) {
        if (request === generation) silence();
        console.error('Échec de lecture dans l’atelier Sampling.', error);
      }
    }

    window.addEventListener('pagehide', silence);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) silence();
    });
    return { play };
  }

  window.FrequencesSamplingAudio = { create };
})();
