(() => {
  const slider = document.querySelector('#cc-slider');
  const ccValue = document.querySelector('#cc-value');
  const sliderValue = document.querySelector('#slider-value');
  const path = document.querySelector('#automation-path');
  const pointsGroup = document.querySelector('#automation-points');
  const playhead = document.querySelector('#automation-head');
  const curveName = document.querySelector('#curve-name');
  const timeDisplay = document.querySelector('#automation-time');
  const recordButton = document.querySelector('#record-button');
  const recordLabel = document.querySelector('#record-label');
  const recordIcon = document.querySelector('#record-icon');
  const playButton = document.querySelector('#play-button');
  const playLabel = document.querySelector('#play-label');
  const playIcon = document.querySelector('#play-icon');
  const status = document.querySelector('#lab-status');
  let context = null;
  let oscillator = null;
  let filter = null;
  let gain = null;
  let recording = false;
  let playing = false;
  let captureStart = 0;
  let playbackStart = 0;
  let animation = 0;
  let take = [
    { time: 0, value: 25 }, { time: 1.2, value: 103 },
    { time: 3.2, value: 46 }, { time: 5.5, value: 116 }, { time: 8, value: 64 }
  ];
  let duration = 8;
  let capture = [];
  const mapHz = (value) => 120 * Math.pow(12000 / 120, value / 127);
  const hzText = (hz) => hz >= 1000 ? `${(hz / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kHz` : `${Math.round(hz)} Hz`;
  const automationChart = window.FrequencesLineChart?.create(document.querySelector('#automation-svg'), {
    grid: '.automation-grid', line: '#automation-path', marker: '#automation-head', points: '#automation-points',
    yDomain: [0, 127], yTicks: [0, 64, 127]
  });
  const graphX = (time) => automationChart ? automationChart.x(time) : 25 + Math.max(0, Math.min(1, time / duration)) * 850;
  const graphY = (value) => 180 - Math.max(0, Math.min(127, value)) / 127 * 160;
  const renderTake = () => {
    if (!take.length) return;
    if (automationChart) {
      automationChart.update(take.map(point => ({ x: point.time, y: point.value })), [0, duration], undefined,
        `Valeur CC 74 dans le temps, de 0 à ${duration.toLocaleString('fr-FR')} secondes et de 0 à 127. ${take.length} valeurs enregistrées.`);
      return;
    }
    path.setAttribute('d', take.map((point,index) => `${index ? 'L' : 'M'}${graphX(point.time).toFixed(1)} ${graphY(point.value).toFixed(1)}`).join(' '));
    pointsGroup.innerHTML = take.map(point => `<circle class="automation-point" cx="${graphX(point.time).toFixed(1)}" cy="${graphY(point.value).toFixed(1)}" r="5"/>`).join('');
  };
  const updateValue = (value, fromPlayback = false) => {
    const safe = Math.max(0, Math.min(127, Math.round(value)));
    slider.value = String(safe);
    slider.setAttribute('aria-valuetext', `${safe} sur 127, valeur du contrôleur CC 74`);
    ccValue.value = `${safe} / 127`;
    sliderValue.value = String(safe);
    const hz = mapHz(safe);
    if (filter && context) filter.frequency.setTargetAtTime(hz, context.currentTime, 0.025);
    if (!fromPlayback && recording) {
      const elapsed = Math.min(8, (performance.now() - captureStart) / 1000);
      const previous = capture[capture.length - 1];
      if (!previous || previous.value !== safe) {
        capture.push({ time: elapsed, value: safe });
        duration = Math.max(1.5, elapsed);
        take = capture;
        renderTake();
      }
      status.textContent = `Enregistrement · ${elapsed.toFixed(1)} s · CC 74 vaut ${safe} · coupure ${hzText(hz)}.`;
    } else if (fromPlayback) {
      status.textContent = `Relecture · CC 74 vaut ${safe} · filtre à ${hzText(hz)}.`;
    } else if (!playing) {
      status.textContent = `Valeur prête · CC 74 vaut ${safe} · filtre à ${hzText(hz)}.`;
    }
  };
  const ensureVoice = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('AudioContext indisponible');
    if (!context) context = new AudioContextClass();
    if (context.state === 'suspended') await context.resume();
    if (oscillator) return;
    oscillator = context.createOscillator();
    filter = context.createBiquadFilter();
    gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(110, context.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(mapHz(Number(slider.value)), context.currentTime);
    filter.Q.setValueAtTime(0.8, context.currentTime);
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, context.currentTime + 0.05);
    oscillator.connect(filter).connect(gain).connect(context.destination);
    oscillator.start();
  };
  const stopVoice = () => {
    if (!oscillator || !context || !gain) return;
    const voice = oscillator, voiceGain = gain;
    voiceGain.gain.cancelScheduledValues(context.currentTime);
    voiceGain.gain.setTargetAtTime(0, context.currentTime, 0.04);
    voice.stop(context.currentTime + 0.18);
    if (oscillator === voice) { oscillator = null; filter = null; gain = null; }
  };
  const resetPlayhead = () => { if (automationChart) automationChart.moveHead(0); else { playhead.setAttribute('x1','25'); playhead.setAttribute('x2','25'); } };
  const stopPlayback = (message = 'Lecture arrêtée.') => {
    if (!playing) return;
    playing = false;
    window.cancelAnimationFrame(animation);
    animation = 0;
    playButton.setAttribute('aria-pressed','false');
    playIcon.textContent = '▶';
    playLabel.textContent = 'Rejouer la courbe';
    recordButton.disabled = false;
    slider.disabled = recording;
    stopVoice();
    timeDisplay.value = `Prête · ${duration.toFixed(1)} s`;
    resetPlayhead();
    status.textContent = message;
  };
  const animatePlayback = (now) => {
    if (!playing) return;
    const elapsed = Math.min(duration, (now - playbackStart) / 1000);
    let right = take.findIndex(point => point.time >= elapsed);
    let value;
    if (right <= 0) value = take[0].value;
    else if (right < 0) value = take[take.length-1].value;
    else {
      const a=take[right-1], b=take[right];
      const portion=b.time===a.time ? 1 : (elapsed-a.time)/(b.time-a.time);
      value=a.value+(b.value-a.value)*portion;
    }
    updateValue(value,true);
    const x=graphX(elapsed);
    if (automationChart) automationChart.moveHead(elapsed); else { playhead.setAttribute('x1',x.toFixed(1)); playhead.setAttribute('x2',x.toFixed(1)); }
    timeDisplay.value=`${elapsed.toFixed(1)} / ${duration.toFixed(1)} s`;
    if (elapsed >= duration) { stopPlayback('Relecture terminée. Tu peux réenregistrer ou rejouer le geste.'); return; }
    animation=window.requestAnimationFrame(animatePlayback);
  };
  const stopRecording = (message) => {
    if (!recording) return;
    recording=false;
    window.cancelAnimationFrame(animation); animation=0;
    recordButton.setAttribute('aria-pressed','false');
    recordIcon.textContent='●'; recordLabel.textContent='Enregistrer un geste';
    slider.disabled=false; playButton.disabled=false;
    stopVoice(); resetPlayhead();
    if (capture.length>=2 && capture.some(point=>point.value!==capture[0].value)) {
      const elapsed=Math.max(0.1,(performance.now()-captureStart)/1000);
      duration=Math.min(8,Math.max(1.5,elapsed));
      const lastPoint=capture[capture.length-1];
      lastPoint.time=Math.min(duration,lastPoint.time);
      if(lastPoint.time<duration)capture.push({time:duration,value:lastPoint.value});
      take=capture; curveName.textContent='Ton geste enregistré'; renderTake();
      timeDisplay.value=`Prête · ${duration.toFixed(1)} s`;
      status.textContent=message || `Geste enregistré · ${take.length} valeurs capturées sur ${duration.toFixed(1)} s. Rejoue-le pour entendre le filtre suivre la courbe.`;
    } else {
      take=[{time:0,value:25},{time:1.2,value:103},{time:3.2,value:46},{time:5.5,value:116},{time:8,value:64}];duration=8;
      curveName.textContent='Courbe d’exemple';renderTake();
      timeDisplay.value='Prête à lire';
      status.textContent='Le geste a peu varié : la courbe d’exemple est conservée. Déplace davantage le curseur pendant l’enregistrement.';
    }
  };
  const animateRecording = (now) => {
    if (!recording) return;
    const elapsed=(now-captureStart)/1000;
    timeDisplay.value=`${Math.min(elapsed,8).toFixed(1)} / 8.0 s`;
    const x=graphX(Math.min(elapsed,8));if(automationChart)automationChart.moveHead(Math.min(elapsed,8));else{playhead.setAttribute('x1',x.toFixed(1));playhead.setAttribute('x2',x.toFixed(1));}
    if(elapsed>=8){stopRecording('Capture de 8 secondes terminée. Ton geste est prêt à être rejoué.');return;}
    animation=window.requestAnimationFrame(animateRecording);
  };
  const beginRecording = async () => {
    if(recording||playing)return;
    recordButton.disabled=true;
    try {
      await ensureVoice();
      recording=true;capture=[{time:0,value:Number(slider.value)}];captureStart=performance.now();
      take=capture;duration=8;curveName.textContent='Enregistrement en cours';renderTake();resetPlayhead();
      recordButton.setAttribute('aria-pressed','true');recordIcon.textContent='■';recordLabel.textContent='Terminer la capture';
      playButton.disabled=true;slider.disabled=false;
      status.textContent='Capture en cours · bouge le curseur pour enregistrer le mouvement du filtre.';
      animation=window.requestAnimationFrame(animateRecording);
    } catch { status.textContent='Le navigateur n’a pas pu démarrer le son local. Réessaie après un clic sur la page.'; }
    finally { recordButton.disabled=false; }
  };
  const beginPlayback = async () => {
    if(playing||recording)return;
    if(take.length<2){status.textContent='Enregistre plusieurs valeurs avant la relecture.';return;}
    playButton.disabled=true;
    try {
      await ensureVoice();
      playing=true;playbackStart=performance.now();resetPlayhead();
      playButton.setAttribute('aria-pressed','true');playIcon.textContent='■';playLabel.textContent='Arrêter la relecture';
      recordButton.disabled=true;slider.disabled=true;
      animation=window.requestAnimationFrame(animatePlayback);
    } catch { status.textContent='Le navigateur n’a pas pu démarrer le son local. Réessaie après un clic sur la page.'; }
    finally { playButton.disabled=false; }
  };
  slider.addEventListener('input',()=>updateValue(Number(slider.value)));
  recordButton.addEventListener('click',()=>{if(recording)stopRecording();else void beginRecording();});
  playButton.addEventListener('click',()=>{if(playing)stopPlayback();else void beginPlayback();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(recording)stopRecording('Capture arrêtée quand la page est passée en arrière-plan.');if(playing)stopPlayback('Relecture arrêtée quand la page est passée en arrière-plan.');}});
  window.addEventListener('pagehide',()=>{if(recording)stopRecording();if(playing)stopPlayback();stopVoice();});
  renderTake();updateValue(Number(slider.value));
})();
