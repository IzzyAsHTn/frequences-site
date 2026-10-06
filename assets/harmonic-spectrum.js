/* Fréquences : spectre idéal, D3 pour les échelles, axes, joins et transitions. */
(function (root) {
  "use strict";

  function partials(type, fundamental) {
    if (!["sine", "triangle", "square", "sawtooth"].includes(type)) {
      throw new RangeError("Forme d’onde inconnue.");
    }
    const hz = Number(fundamental);
    if (!Number.isFinite(hz) || hz <= 0 || hz > 500) {
      throw new RangeError("Fondamentale hors du domaine du graphique.");
    }
    return Array.from({ length: 12 }, (_, index) => {
      const rank = index + 1;
      let level;
      if (type === "sine") level = rank === 1 ? 1 : 0;
      else if (type === "triangle") level = rank % 2 ? 1 / (rank * rank) : 0;
      else if (type === "square") level = rank % 2 ? 1 / rank : 0;
      else level = 1 / rank;
      return { rank, frequency: hz * rank, level };
    });
  }

  function layout(containerWidth) {
    const width = Math.round(Number(containerWidth) > 0 ? containerWidth : 600);
    const compact = width < 480;
    const margin = { top: 22, right: 18, bottom: 32, left: compact ? 46 : 48 };
    const plotHeight = compact ? 132 : 148;
    return {
      width,
      height: margin.top + plotHeight + margin.bottom,
      margin,
      bottom: margin.top + plotHeight,
      right: width - margin.right,
      xTicks: compact ? [0, 2000, 4000, 6000] : [0, 1500, 3000, 4500, 6000],
    };
  }

  function create(element, options = {}) {
    const d3 = root.d3;
    if (!element || !d3 || typeof d3.scaleLinear !== "function") return null;

    const svg = d3.select(element);
    const grid = svg.select("#harmonic-grid");
    const marks = svg.select("#harmonic-bars");
    const xAxis = svg.select("#harmonic-x-axis");
    const yAxis = svg.append("g").attr("class", "spectrum-d3-axis spectrum-d3-y");
    const annotation = svg.append("g").attr("class", "spectrum-d3-annotation");
    const overlay = svg.append("rect").attr("class", "spectrum-d3-hitarea")
      .attr("fill", "transparent").attr("aria-hidden", "true");
    const reducedMotion = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let state = null;
    let xScale = null;
    let geometry = null;
    let drawn = false;
    let resizeFrame = null;
    let destroyed = false;

    // Seuls les calques graphiques sont renouvelés ; le titre et la description restent en place.
    grid.selectAll("*").remove();
    xAxis.selectAll("*").remove();
    xAxis.attr("class", "spectrum-d3-axis spectrum-d3-x");
    svg.attr("data-renderer", "d3");

    function render(animate) {
      if (!state || destroyed) return;
      geometry = layout(element.getBoundingClientRect().width);
      const { width, height, margin, bottom, right, xTicks } = geometry;
      const plotWidth = right - margin.left;
      xScale = d3.scaleLinear().domain([0, 6000]).range([margin.left, right]);
      const y = d3.scaleLinear().domain([0, 1]).range([bottom, margin.top]);
      const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      xAxis.attr("transform", `translate(0,${bottom})`)
        .call(d3.axisBottom(xScale).tickValues(xTicks).tickSize(4).tickSizeOuter(0)
          .tickPadding(7).tickFormat(value => number.format(value)));
      xAxis.selectAll(".tick text").attr("text-anchor", value =>
        value === 0 ? "start" : value === 6000 ? "end" : "middle");
      yAxis.attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickValues([0, .5, 1]).tickSize(0).tickSizeOuter(0)
          .tickPadding(7).tickFormat(value => `${Math.round(value * 100)} %`));

      grid.selectAll("line.spectrum-d3-horizontal").data([0, .25, .5, .75, 1]).join("line")
        .attr("class", "spectrum-d3-horizontal")
        .attr("x1", margin.left).attr("x2", right)
        .attr("y1", value => y(value)).attr("y2", value => y(value));
      grid.selectAll("line.spectrum-d3-vertical").data(xTicks).join("line")
        .attr("class", "spectrum-d3-vertical")
        .attr("x1", value => xScale(value)).attr("x2", value => xScale(value))
        .attr("y1", margin.top).attr("y2", bottom);

      const barWidth = Math.max(3, Math.min(14, (xScale(state.data[0].frequency) - xScale(0)) * .62));
      const bars = marks.selectAll("rect.harmonic-bar").data(state.data, item => item.rank)
        .join(enter => enter.append("rect").attr("class", "harmonic-bar")
          .attr("x", item => xScale(item.frequency) - barWidth / 2)
          .attr("y", bottom).attr("height", 0));
      bars.interrupt("spectrum")
        .attr("rx", 0).attr("aria-hidden", "true")
        .attr("data-rank", item => item.rank)
        .attr("data-frequency", item => item.frequency)
        .attr("data-level", item => item.level)
        .classed("is-selected", item => item.rank === state.selected);

      const duration = animate && drawn && !(reducedMotion && reducedMotion.matches) ? 180 : 0;
      svg.interrupt("spectrum");
      const transition = duration ? svg.transition("spectrum").duration(duration).ease(d3.easeCubicOut) : null;
      const position = transition ? bars.transition(transition) : bars;
      position.attr("x", item => xScale(item.frequency) - barWidth / 2)
        .attr("y", item => y(item.level)).attr("width", barWidth)
        .attr("height", item => bottom - y(item.level));

      const selected = state.data.find(item => item.rank === state.selected) || state.data[0];
      const selectedX = xScale(selected.frequency);
      const guide = annotation.selectAll("line").data([selected]).join("line");
      const label = annotation.selectAll("text").data([selected]).join("text")
        .attr("text-anchor", "middle").text(item => `H${item.rank}`);
      guide.interrupt("spectrum");
      label.interrupt("spectrum");
      (transition ? guide.transition(transition) : guide)
        .attr("x1", selectedX).attr("x2", selectedX)
        .attr("y1", margin.top).attr("y2", bottom);
      (transition ? label.transition(transition) : label)
        .attr("x", Math.max(margin.left + 12, Math.min(right - 12, selectedX)))
        .attr("y", margin.top - 8);
      overlay.attr("x", margin.left).attr("y", margin.top)
        .attr("width", plotWidth).attr("height", bottom - margin.top);
      drawn = true;
    }

    // Une sélection du partiel le plus proche remplace les cibles minuscules sur téléphone.
    overlay.on("pointerup.spectrum", event => {
      if (!state || !xScale || event.button > 0) return;
      if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) {
        press = null;
        return;
      }
      press = null;
      const [pointerX] = d3.pointer(event, element);
      const targetHz = xScale.invert(Math.max(geometry.margin.left, Math.min(geometry.right, pointerX)));
      const nearest = Math.max(1, Math.min(12, Math.round(targetHz / state.data[0].frequency)));
      if (typeof options.onInspect === "function") options.onInspect(nearest);
    });
    let press = null;
    overlay.on("pointerdown.spectrum", event => { press = { x: event.clientX, y: event.clientY }; });
    overlay.on("pointercancel.spectrum", () => { press = null; });

    function queueResize() {
      if (destroyed || resizeFrame !== null) return;
      resizeFrame = root.requestAnimationFrame(() => { resizeFrame = null; render(false); });
    }
    const observer = root.ResizeObserver ? new root.ResizeObserver(queueResize) : null;
    if (observer) observer.observe(element);
    else root.addEventListener("resize", queueResize);

    function motionChanged() { render(false); }
    if (reducedMotion && reducedMotion.addEventListener) reducedMotion.addEventListener("change", motionChanged);

    return {
      update(data, selected = 1) {
        if (destroyed) return;
        const animate = state && state.selected === selected;
        state = { data, selected };
        render(animate);
      },
      destroy() {
        destroyed = true;
        if (observer) observer.disconnect();
        else root.removeEventListener("resize", queueResize);
        if (resizeFrame !== null) root.cancelAnimationFrame(resizeFrame);
        if (reducedMotion && reducedMotion.removeEventListener) reducedMotion.removeEventListener("change", motionChanged);
        marks.selectAll("rect").interrupt("spectrum");
        annotation.selectAll("*").interrupt("spectrum");
        svg.interrupt("spectrum");
        overlay.on(".spectrum", null);
      },
    };
  }

  root.FrequencesSpectrum = Object.freeze({ create, partials, layout });
})(typeof window !== "undefined" ? window : globalThis);
