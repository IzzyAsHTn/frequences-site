/* Fréquences : axes et géométrie communs, commandes et audio gérés par chaque page. */
(function (root) {
  "use strict";
  function create(element, options) {
    const d3 = root.d3;
    if (!element || !d3) return null;
    const svg = d3.select(element);
    svg.selectAll(options.grid).remove();
    const grid = svg.insert("g", ":first-child").attr("class", "chart-grid").attr("aria-hidden", "true");
    const axes = svg.append("g").attr("class", "chart-axes").attr("aria-hidden", "true");
    const gx = axes.append("g"), gy = axes.append("g");
    const curve = svg.select(options.line);
    const glow = options.glow ? svg.select(options.glow) : null;
    const marker = options.marker ? svg.select(options.marker) : null;
    const dot = options.dot ? svg.select(options.dot) : null;
    const points = options.points ? svg.select(options.points) : null;
    if (points) points.selectAll("*").remove();
    const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
    const motion = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)");
    let state, x, y, geometry, dotX, headX, frame = null, destroyed = false;
    svg.attr("data-renderer", "d3-line");
    function valueAt(value) {
      const data = state.data;
      const index = d3.bisector(item => item.x).left(data, value);
      if (index <= 0) return data[0].y;
      if (index >= data.length) return data[data.length - 1].y;
      const a = data[index - 1], b = data[index];
      return a.y + (b.y - a.y) * (value - a.x) / (b.x - a.x || 1);
    }
    function moveDot(value) {
      dotX = value;
      if (!dot || !state || !x) return;
      const safe = Math.max(state.domain[0], Math.min(state.domain[1], value));
      dot.attr("cx", x(safe)).attr("cy", y(valueAt(safe))).attr("r", 4);
    }
    function moveHead(value) {
      headX = value;
      if (!marker || !state || !x) return;
      const safe = Math.max(state.domain[0], Math.min(state.domain[1], value));
      marker.attr("x1", x(safe)).attr("x2", x(safe))
        .attr("y1", geometry.top).attr("y2", geometry.bottom);
    }
    function render() {
      if (!state || destroyed) return;
      const width = Math.round(element.getBoundingClientRect().width || 600);
      const compact = width < 480;
      const height = compact ? 198 : 218;
      geometry = { width, height, left: 48, right: width - 18, top: 22, bottom: height - 34 };
      x = (options.log ? d3.scaleLog() : d3.scaleLinear()).domain(state.domain)
        .range([geometry.left, geometry.right]).clamp(true);
      y = d3.scaleLinear().domain(options.yDomain).range([geometry.bottom, geometry.top]).clamp(true);
      svg.attr("viewBox", `0 0 ${width} ${height}`);
      const ticks = options.xTicks ? options.xTicks(compact, state.domain) : x.ticks(compact ? 3 : 5);
      const formatX = options.formatX || (value => number.format(value));
      gx.attr("transform", `translate(0,${geometry.bottom})`)
        .call(d3.axisBottom(x).tickValues(ticks).tickFormat(formatX).tickSize(4).tickSizeOuter(0).tickPadding(7));
      gx.selectAll(".tick text").attr("text-anchor", value =>
        value === state.domain[0] ? "start" : value === state.domain[1] ? "end" : "middle");
      gy.attr("transform", `translate(${geometry.left},0)`)
        .call(d3.axisLeft(y).tickValues(options.yTicks).tickFormat(options.formatY || number.format)
          .tickSize(0).tickSizeOuter(0).tickPadding(7));
      grid.selectAll("line.chart-horizontal").data(options.yTicks).join("line")
        .attr("class", "chart-horizontal").attr("x1", geometry.left).attr("x2", geometry.right)
        .attr("y1", value => y(value)).attr("y2", value => y(value));
      grid.selectAll("line.chart-vertical").data(ticks).join("line")
        .attr("class", "chart-vertical").attr("x1", value => x(value)).attr("x2", value => x(value))
        .attr("y1", geometry.top).attr("y2", geometry.bottom);
      const path = d3.line().x(item => x(item.x)).y(item => y(item.y))(state.data);
      curve.attr("d", path);
      if (glow) glow.attr("d", path);
      if (points) points.selectAll("circle").data(state.data, item => item.x).join("circle")
        .attr("class", "automation-point").attr("cx", item => x(item.x)).attr("cy", item => y(item.y)).attr("r", 3.5);
      if (state.marker !== undefined) moveHead(state.marker);
      else if (headX !== undefined) moveHead(headX);
      else if (marker) moveHead(state.domain[0]);
      if (dotX !== undefined) moveDot(dotX);
    }
    function resize() {
      if (frame !== null || destroyed) return;
      frame = root.requestAnimationFrame(() => { frame = null; render(); });
    }
    const observer = root.ResizeObserver ? new root.ResizeObserver(resize) : null;
    if (observer) observer.observe(element);
    else root.addEventListener("resize", resize);
    root.addEventListener("pagehide", event => { if (!event.persisted) destroy(); });
    function destroy() {
      destroyed = true;
      if (observer) observer.disconnect();
      else root.removeEventListener("resize", resize);
      if (frame !== null) root.cancelAnimationFrame(frame);
    }
    return {
      update(data, domain, markerValue, description) {
        if (!data.length || destroyed) return;
        state = { data, domain, marker: markerValue };
        if (description) svg.attr("aria-label", description);
        render();
      },
      x: value => x ? x(value) : 0,
      moveDot, moveHead, destroy,
      reducedMotion: () => Boolean(motion && motion.matches),
    };
  }
  root.FrequencesLineChart = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
