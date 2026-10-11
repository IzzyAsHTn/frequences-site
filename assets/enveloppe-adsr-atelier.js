const attackControl = document.querySelector("#attack-control");
      const decayControl = document.querySelector("#decay-control");
      const sustainControl = document.querySelector("#sustain-control");
      const releaseControl = document.querySelector("#release-control");
      const values = {
        attack: document.querySelector("#attack-value"),
        decay: document.querySelector("#decay-value"),
        sustain: document.querySelector("#sustain-value"),
        release: document.querySelector("#release-value")
      };
      const line = document.querySelector("#envelope-line");
      const glow = document.querySelector("#envelope-glow");
      const point = document.querySelector("#envelope-point");
      const durationOutput = document.querySelector("#envelope-duration");
      const playButton = document.querySelector("#envelope-play");
      const status = document.querySelector("#envelope-status");
      let audioContext = null;
      let oscillator = null;
      let gainNode = null;
      let isPlaying = false;
      const holdMs = 700;

      function currentSettings() {
        return { attack:Number(attackControl.value), decay:Number(decayControl.value), sustain:Number(sustainControl.value)/100, release:Number(releaseControl.value) };
      }
      const envelopeChart = window.FrequencesLineChart?.create(document.querySelector(".envelope-graph"), {
        grid: ".envelope-grid", line: "#envelope-line", glow: "#envelope-glow", dot: "#envelope-point",
        yDomain: [0, 1], yTicks: [0, .5, 1], formatY: value => `${Math.round(value * 100)} %`
      });
      function updateEnvelope() {
        const s = currentSettings();
        values.attack.value = `${s.attack} ms`; values.attack.textContent = values.attack.value;
        values.decay.value = `${s.decay} ms`; values.decay.textContent = values.decay.value;
        values.sustain.value = `${Math.round(s.sustain*100)} %`; values.sustain.textContent = values.sustain.value;
        values.release.value = `${s.release} ms`; values.release.textContent = values.release.value;
        const total = s.attack + s.decay + holdMs + s.release;
        const xA = 4 + 292 * s.attack / total;
        const xD = 4 + 292 * (s.attack + s.decay) / total;
        const xS = 4 + 292 * (s.attack + s.decay + holdMs) / total;
        const yS = 84 - 71 * s.sustain;
        const d = `M4 84 L${xA} 13 L${xD} ${yS} L${xS} ${yS} L296 84`;
        if (envelopeChart) {
          const releaseStart = (s.attack + s.decay + holdMs) / 1000;
          const data = [{ x: 0, y: 0 }, { x: s.attack / 1000, y: 1 },
            { x: (s.attack + s.decay) / 1000, y: s.sustain }, { x: releaseStart, y: s.sustain }];
          // Le lecteur applique un relâchement exponentiel (constante de temps : release / 5).
          for (let index = 1; index <= 32; index++) data.push({
            x: releaseStart + s.release / 1000 * index / 32,
            y: s.sustain * Math.exp(-5 * index / 32)
          });
          envelopeChart.update(data, [0, total / 1000], undefined,
            `Enveloppe ADSR : attaque ${s.attack} ms, décroissance ${s.decay} ms, maintien ${Math.round(s.sustain * 100)} %, relâchement ${s.release} ms. Amplitude relative dans le temps.`);
          envelopeChart.moveDot(s.attack / 1000);
        } else {
          line.setAttribute("d", d); glow.setAttribute("d", d);
          point.setAttribute("cx", xA); point.setAttribute("cy", 13);
        }
        durationOutput.value = `durée ≈ ${(total/1000).toLocaleString("fr-FR", {maximumFractionDigits:1})} s`;
        durationOutput.textContent = durationOutput.value;
        [attackControl,decayControl,sustainControl,releaseControl].forEach((control)=>control.style.setProperty("--progress", `${(Number(control.value)-Number(control.min))/(Number(control.max)-Number(control.min))*100}%`));
        Object.entries({attack:attackControl,decay:decayControl,sustain:sustainControl,release:releaseControl}).forEach(([key,control])=>control.setAttribute("aria-valuetext",values[key].value));
      }
      async function playEnvelope() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) { status.textContent = "La synthèse audio n’est pas disponible dans ce navigateur."; return; }
        if (isPlaying) return;
        isPlaying = true;
        playButton.disabled = true;
        const s = currentSettings();
        try {
          audioContext = new AudioContextClass();
          await audioContext.resume();
          oscillator = audioContext.createOscillator();
          gainNode = audioContext.createGain();
          const context = audioContext;
          const source = oscillator;
          const amp = gainNode;
          const now = context.currentTime;
          const peak = .14;
          const sustainLevel = Math.max(.0001, peak*s.sustain);
          const attackEnd = now + Math.max(.008,s.attack/1000);
          const decayEnd = attackEnd + s.decay/1000;
          const releaseStart = decayEnd + holdMs/1000;
          oscillator.type = "sawtooth";
          oscillator.frequency.value = 220;
          gainNode.gain.setValueAtTime(0,now);
          gainNode.gain.linearRampToValueAtTime(peak,attackEnd);
          gainNode.gain.linearRampToValueAtTime(sustainLevel,decayEnd);
          gainNode.gain.setValueAtTime(sustainLevel,releaseStart);
          gainNode.gain.setTargetAtTime(.0001,releaseStart,Math.max(.01,s.release/5000));
          oscillator.connect(gainNode); gainNode.connect(context.destination);
          oscillator.onended = () => {
            context.close().catch(()=>{});
            if (audioContext===context) { audioContext=null; oscillator=null; gainNode=null; isPlaying=false; playButton.disabled=false; playButton.setAttribute("aria-pressed","false"); playButton.innerHTML="<span aria-hidden=\"true\">▶</span> Écouter l’enveloppe"; status.textContent="Note terminée. Ajuste un paramètre pour comparer."; }
          };
          oscillator.start(now);
          oscillator.stop(releaseStart+s.release/1000+.12);
          playButton.setAttribute("aria-pressed","true");
          playButton.innerHTML="<span aria-hidden=\"true\">■</span> Arrêter";
          playButton.disabled=false;
          status.textContent="Note en cours : attaque, décroissance, maintien bref, puis relâchement.";
        } catch (error) {
          status.textContent="Impossible de démarrer l’écoute. Vérifie les réglages audio du navigateur.";
          if (audioContext) await audioContext.close().catch(()=>{});
          audioContext=null; oscillator=null; gainNode=null; isPlaying=false; playButton.disabled=false; playButton.setAttribute("aria-pressed","false");
        }
      }
      async function stopEnvelope() {
        const context=audioContext, source=oscillator, amp=gainNode;
        if (!context||!source||!amp) { isPlaying=false; playButton.setAttribute("aria-pressed","false"); return; }
        playButton.disabled=true;
        playButton.setAttribute("aria-pressed","false");
        playButton.innerHTML="<span aria-hidden=\"true\">▶</span> Écouter l’enveloppe";
        status.textContent="Arrêt en douceur…";
        const now=context.currentTime;
        amp.gain.cancelScheduledValues(now);
        amp.gain.setTargetAtTime(.0001,now,.025);
        source.onended=()=>{
          context.close().catch(()=>{});
          if(audioContext===context){audioContext=null;oscillator=null;gainNode=null;isPlaying=false;playButton.disabled=false;status.textContent="Écoute arrêtée.";}
        };
        try { source.stop(now+.14); } catch (error) { context.close().catch(()=>{}); audioContext=null;oscillator=null;gainNode=null;isPlaying=false;playButton.disabled=false;status.textContent="Écoute arrêtée."; }
      }
      [attackControl,decayControl,sustainControl,releaseControl].forEach((control)=>control.addEventListener("input",updateEnvelope));
      playButton.addEventListener("click",()=>playButton.getAttribute("aria-pressed")==="true"?stopEnvelope():playEnvelope());
      window.addEventListener("pagehide",()=>{if(audioContext)audioContext.close().catch(()=>{});});
      updateEnvelope();
