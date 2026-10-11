const cutoffSlider = document.querySelector("#cutoff-slider");
      const resonanceSlider = document.querySelector("#resonance-slider");
      const cutoffValue = document.querySelector("#cutoff-value");
      const resonanceValue = document.querySelector("#resonance-value");
      const filterReadout = document.querySelector("#filter-readout");
      const responseCurve = document.querySelector("#response-curve");
      const responseGlow = document.querySelector("#response-glow");
      const cutoffMarker = document.querySelector("#cutoff-marker");
      const typeButtons = [...document.querySelectorAll(".filter-type")];
      const soundButton = document.querySelector("#filter-sound");
      const status = document.querySelector("#filter-status");
      let filterType = "lowpass";
      let audioContext = null;
      let oscillator = null;
      let filterNode = null;
      let gainNode = null;
      const minFrequency = 80;
      const maxFrequency = 12000;

      function frequencyFromSlider() {
        return minFrequency * Math.pow(maxFrequency / minFrequency, Number(cutoffSlider.value) / 100);
      }
      const graphMinFrequency = 20;
      const graphMaxFrequency = 20000;
      function responseAt(frequency, cutoff, q, type, sampleRate) {
        const omega = 2 * Math.PI * cutoff / sampleRate;
        const cosine = Math.cos(omega);
        const alpha = Math.sin(omega) / (2 * q);
        let b0, b1, b2;
        if (type === "highpass") { b0 = (1 + cosine) / 2; b1 = -(1 + cosine); b2 = b0; }
        else if (type === "bandpass") { b0 = alpha; b1 = 0; b2 = -alpha; }
        else if (type === "notch") { b0 = 1; b1 = -2 * cosine; b2 = 1; }
        else { b0 = (1 - cosine) / 2; b1 = 1 - cosine; b2 = b0; }
        const a0 = 1 + alpha, a1 = -2 * cosine, a2 = 1 - alpha;
        const phase = 2 * Math.PI * frequency / sampleRate;
        const numeratorReal = b0 + b1 * Math.cos(phase) + b2 * Math.cos(2 * phase);
        const numeratorImaginary = -b1 * Math.sin(phase) - b2 * Math.sin(2 * phase);
        const denominatorReal = a0 + a1 * Math.cos(phase) + a2 * Math.cos(2 * phase);
        const denominatorImaginary = -a1 * Math.sin(phase) - a2 * Math.sin(2 * phase);
        const numerator = Math.hypot(numeratorReal, numeratorImaginary);
        const denominator = Math.hypot(denominatorReal, denominatorImaginary);
        return numerator / Math.max(denominator, 1e-12);
      }
      function pathFor(type, cutoff, q) {
        const sampleRate = audioContext?.sampleRate || 48000;
        const points = [];
        for (let index = 0; index <= 192; index++) {
          const position = index / 192;
          const frequency = graphMinFrequency * Math.pow(graphMaxFrequency / graphMinFrequency, position);
          const magnitude = responseAt(frequency, cutoff, q, type, sampleRate);
          const decibels = Math.max(-48, Math.min(24, 20 * Math.log10(Math.max(magnitude, 1e-8))));
          const x = 2 + position * 296;
          const y = 9 + ((24 - decibels) / 72) * 82;
          points.push(`${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
        }
        return points.join(" ");
      }
      const responseChart = window.FrequencesLineChart?.create(document.querySelector(".filter-graph"), {
        grid: ".graph-grid", line: "#response-curve", glow: "#response-glow", marker: "#cutoff-marker",
        log: true, yDomain: [-48, 24], yTicks: [-48, -24, 0, 24],
        xTicks: compact => compact ? [20, 200, 2000, 20000] : [20, 100, 1000, 10000, 20000],
        formatX: value => value >= 1000 ? `${value / 1000}k` : String(value)
      });
      function updateFilter(animateCurve = false) {
        const frequency = frequencyFromSlider();
        const q = .5 + Number(resonanceSlider.value) / 100 * 11.5;
        const x = 2 + (Math.log(frequency / graphMinFrequency) / Math.log(graphMaxFrequency / graphMinFrequency)) * 296;
        const hzText = `${Math.round(frequency).toLocaleString("fr-FR")} Hz`;
        cutoffValue.value = hzText;
        cutoffValue.textContent = hzText;
        filterReadout.value = hzText;
        filterReadout.textContent = hzText;
        resonanceValue.value = q.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
        resonanceValue.textContent = resonanceValue.value;
        cutoffSlider.setAttribute("aria-valuetext", hzText);
        resonanceSlider.setAttribute("aria-valuetext", `${resonanceValue.value} de facteur Q`);
        cutoffSlider.style.setProperty("--progress", `${cutoffSlider.value}%`);
        resonanceSlider.style.setProperty("--progress", `${resonanceSlider.value}%`);
        const d = pathFor(filterType, frequency, q);
        if (responseChart) {
          const sampleRate = audioContext?.sampleRate || 48000;
          const data = Array.from({ length: 193 }, (_, index) => {
            const hz = graphMinFrequency * Math.pow(graphMaxFrequency / graphMinFrequency, index / 192);
            return { x: hz, y: Math.max(-48, Math.min(24, 20 * Math.log10(Math.max(responseAt(hz, frequency, q, filterType, sampleRate), 1e-8)))) };
          });
          responseChart.update(data, [20, 20000], frequency,
            `Réponse ${filterType}, coupure ${hzText}, facteur Q ${resonanceValue.value}. Axe horizontal logarithmique : 20 à 20 000 Hz. Gain : −48 à +24 dB.`, animateCurve ? 180 : 0);
        } else {
          responseCurve.setAttribute("d", d); responseGlow.setAttribute("d", d);
          cutoffMarker.setAttribute("x1", x); cutoffMarker.setAttribute("x2", x);
        }
        if (filterNode && audioContext) {
          filterNode.frequency.setTargetAtTime(frequency, audioContext.currentTime, .035);
          filterNode.Q.setTargetAtTime(q, audioContext.currentTime, .04);
        }
      }
      function setType(type) {
        filterType = type;
        typeButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.type === type)));
        if (filterNode && audioContext) filterNode.type = type;
        updateFilter(true);
      }
      async function startSound() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) { status.textContent = "La synthèse audio n’est pas disponible dans ce navigateur."; return; }
        soundButton.disabled = true;
        try {
          audioContext = new AudioContextClass();
          await audioContext.resume();
          oscillator = audioContext.createOscillator();
          filterNode = audioContext.createBiquadFilter();
          gainNode = audioContext.createGain();
          oscillator.type = "sawtooth";
          oscillator.frequency.value = 220;
          filterNode.type = filterType;
          filterNode.frequency.value = frequencyFromSlider();
          filterNode.Q.value = .5 + Number(resonanceSlider.value) / 100 * 11.5;
          const now = audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(.055, now + .025);
          oscillator.connect(filterNode); filterNode.connect(gainNode); gainNode.connect(audioContext.destination);
          oscillator.start(now);
          soundButton.setAttribute("aria-pressed", "true");
          soundButton.innerHTML = "<span aria-hidden=\"true\">■</span> Arrêter";
          status.textContent = "Écoute active : change le type de filtre, la coupure ou la résonance.";
        } catch (error) {
          status.textContent = "Impossible de démarrer l’écoute. Vérifie les réglages audio du navigateur.";
          if (audioContext) await audioContext.close().catch(() => {});
          audioContext = null; oscillator = null; filterNode = null; gainNode = null;
        } finally { soundButton.disabled = false; }
      }
      async function stopSound() {
        const context = audioContext;
        if (context && gainNode && oscillator) {
          gainNode.gain.cancelScheduledValues(context.currentTime);
          gainNode.gain.setTargetAtTime(.0001, context.currentTime, .025);
          oscillator.onended = () => context.close().catch(() => {});
          oscillator.stop(context.currentTime + .16);
        }
        audioContext = null; oscillator = null; filterNode = null; gainNode = null;
        soundButton.setAttribute("aria-pressed", "false");
        soundButton.innerHTML = "<span aria-hidden=\"true\">▶</span> Écouter";
        status.textContent = "Écoute inactive.";
      }
      cutoffSlider.addEventListener("input", () => updateFilter());
      resonanceSlider.addEventListener("input", () => updateFilter());
      typeButtons.forEach((button) => button.addEventListener("click", () => setType(button.dataset.type)));
      soundButton.addEventListener("click", () => soundButton.getAttribute("aria-pressed") === "true" ? stopSound() : startSound());
      window.addEventListener("pagehide", () => { if (audioContext) audioContext.close().catch(() => {}); });
      updateFilter();
