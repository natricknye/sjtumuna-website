/* Rotating 2D atlas of Xuhui for the delegate portal.
 * Only the administrative boundary, one smooth Huangpu waterfront and the
 * location labels / leader lines are drawn.
 */
(() => {
  'use strict';
  const map = document.querySelector('.xuhui-map');
  const canvas = document.getElementById('xuhui-map-canvas');
  const host = map?.querySelector('.xuhui-pins');
  const scene = map?.closest('.home-orbit-scene');
  const data = window.XUHUI_MAP_DATA?.outline;
  const rawBuildings = window.XUHUI_BUILDINGS?.buildings;
  if (!map || !canvas || !host || !Array.isArray(data) || !data.length) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // The disclaimer belongs to the map component, not to the page copy. Keep it
  // a sibling of the map so it can sit immediately below the drawing without
  // ever covering buildings, labels or the drag surface.
  const caption = map.parentElement?.querySelector('.xuhui-district-caption');
  const disclaimer = document.createElement('p');
  disclaimer.className = 'xuhui-map-disclaimer';
  disclaimer.textContent = document.documentElement.lang.startsWith('en')
    ? 'Map for regional illustration only; not the actual conference venue.'
    : '地图仅作区域介绍演示，非会议实际召开地点。';
  if (caption) caption.insertAdjacentElement('afterend', disclaimer);
  else map.insertAdjacentElement('afterend', disclaimer);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const AUTO_SPEED = 0.000052;
  const MAP_SCALE = 0.49;
  const VENUES = [
    { committee: '02', panel: 'panel-ecosoc', code: 'ECOSOC', zh: '梧桐区', en: 'Wutong', kickerZh: '02 / ECOSOC', kickerEn: '02 / ECOSOC', topicZh: '萨赫勒治理', topicEn: 'Sahel governance', lon: 121.455, lat: 31.211 },
    { committee: '04', panel: 'panel-unodc', code: 'UNODC', zh: '西岸', en: 'West Bund', kickerZh: '04 / UNODC', kickerEn: '04 / UNODC', topicZh: 'UNODC · 替代发展', topicEn: 'UNODC · Alternative development', lon: 121.458, lat: 31.168 },
    { committee: '01', panel: 'panel-ga2', code: 'GA2', zh: '漕河泾', en: 'Caohejing', kickerZh: '01 / GA2', kickerEn: '01 / GA2', topicZh: '半导体价值链', topicEn: 'Semiconductor value chains', lon: 121.404, lat: 31.169 },
    { committee: '03', panel: 'panel-london', code: '1912', zh: '上海中学', en: 'SHANGHAI HIGH SCHOOL', kickerZh: '03 / 1912', kickerEn: '03 / 1912', topicZh: '伦敦会议', topicEn: 'London Conference', lon: 121.4370, lat: 31.1488 },
    { landmark: true, code: 'SJTU', zh: '交通大学', en: 'SJTU XUHUI CAMPUS', kickerZh: 'SJTU', kickerEn: 'SJTU', topicZh: '本次大会地点', topicEn: 'Conference venue', lon: 121.436, lat: 31.201 },
  ];

  const lats = data.map((p) => p[1]);
  const lons = data.map((p) => p[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const cosLat = Math.cos(midLat * DEG);
  const raw = data.map(([lon, lat]) => [(lon - midLon) * cosLat, lat - midLat]);
  const extent = Math.max(...raw.flatMap(([x, y]) => [Math.abs(x), Math.abs(y)]));
  const normalize = 0.92 / extent;
  const outline = raw.map(([x, y]) => [x * normalize, -y * normalize]);
  const pointOf = (lon, lat) => [(lon - midLon) * cosLat * normalize, -(lat - midLat) * normalize];
  const buildings = (Array.isArray(rawBuildings) ? rawBuildings : [])
    .filter((building) => Array.isArray(building.coords) && building.coords.length > 2)
    .map((building) => {
      const points = building.coords.map(([lon, lat]) => pointOf(lon, lat));
      const center = points.reduce((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0]).map((value) => value / points.length);
      // OSM footprints are centimetre-accurate but only a few screen pixels wide at
      // this district scale. Keep their shape and true centre, and apply one
      // consistent overview-map exaggeration so the cluster remains legible.
      const overviewScale = building.overviewScale ?? (building.extrude === false ? 1 : 7);
      return {
        ...building,
        points: points.map(([x, y]) => [center[0] + (x - center[0]) * overviewScale, center[1] + (y - center[1]) * overviewScale]),
      };
    });

  // ---------- small deterministic helpers ----------
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (rgb, alpha = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  function chaikin(points, iterations = 2) {
    let result = points;
    for (let pass = 0; pass < iterations; pass++) {
      if (result.length < 3) break;
      const next = [result[0]];
      for (let i = 0; i < result.length - 1; i++) {
        const a = result[i];
        const b = result[i + 1];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      next.push(result[result.length - 1]);
      result = next;
    }
    return result;
  }
  function simplifyPath(points, tolerance) {
    if (points.length <= 2) return points.slice();
    const square = tolerance * tolerance;
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [first, last] = stack.pop();
      const a = points[first];
      const b = points[last];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const denominator = dx * dx + dy * dy || 1;
      let max = 0;
      let index = -1;
      for (let i = first + 1; i < last; i++) {
        const p = points[i];
        const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / denominator, 0, 1);
        const px = a[0] + t * dx;
        const py = a[1] + t * dy;
        const d = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
        if (d > max) {
          max = d;
          index = i;
        }
      }
      if (max > square && index > 0) {
        keep[index] = 1;
        stack.push([first, index], [index, last]);
      }
    }
    return points.filter((_, index) => keep[index]);
  }
  function catmullRom(points, steps = 10) {
    if (points.length < 3) return points.slice();
    const source = [points[0], ...points, points[points.length - 1]];
    const result = [];
    for (let i = 0; i < source.length - 3; i++) {
      const p0 = source[i];
      const p1 = source[i + 1];
      const p2 = source[i + 2];
      const p3 = source[i + 3];
      for (let step = 0; step < steps; step++) {
        const t = step / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        result.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  // ---------- Huangpu river from the eastern boundary ----------
  function buildEastBank(poly) {
    let south = 0;
    let north = 0;
    let east = 0;
    for (let i = 1; i < poly.length; i++) {
      if (poly[i][1] > poly[south][1]) south = i;
      if (poly[i][1] < poly[north][1]) north = i;
      if (poly[i][0] > poly[east][0]) east = i;
    }
    function arc(from, to, step) {
      const result = [];
      let index = from;
      for (let guard = 0; guard <= poly.length; guard++) {
        result.push(poly[index]);
        if (index === to) break;
        index = (index + step + poly.length) % poly.length;
      }
      return result;
    }
    const forward = arc(south, north, 1);
    const backward = arc(south, north, -1);
    const rawBank = forward.includes(poly[east]) ? forward : backward;
    // Keep the bank running south -> north so it can replace the eastern
    // segment of the outline without creating a closing diagonal.
    const ordered = rawBank[0][1] < rawBank[rawBank.length - 1][1] ? rawBank.slice().reverse() : rawBank;
    // Remove the administrative jitter first, then draw a single smooth curve
    // through a small number of surviving control points.
    const controls = simplifyPath(chaikin(ordered, 2), 0.007);
    const bank = catmullRom(controls, 12);
    bank[0] = ordered[0];
    bank[bank.length - 1] = ordered[ordered.length - 1];
    return { bank, south, north, east, controls };
  }

  function buildDisplayOutline(poly, eastInfo) {
    const { south, north, east, bank } = eastInfo;
    function arc(from, to, step) {
      const result = [];
      let index = from;
      for (let guard = 0; guard <= poly.length; guard++) {
        result.push(poly[index]);
        if (index === to) break;
        index = (index + step + poly.length) % poly.length;
      }
      return result;
    }
    const northToSouth = arc(north, south, 1);
    const west = northToSouth.includes(poly[east]) ? arc(north, south, -1) : northToSouth;
    return west.concat(bank.slice(1, -1));
  }

  function buildRiver(bank) {
    return { bank: bank.slice() };
  }

  const eastInfo = buildEastBank(outline);
  const displayOutline = buildDisplayOutline(outline, eastInfo);
  const river = buildRiver(eastInfo.bank);

  // ---------- palette ----------
  const DAY = {
    surface: 'rgba(247,252,255,0.6)',
    shadow: 'rgba(13,53,78,0.18)',
    ink: [30, 87, 118],
    soft: [103, 147, 168],
    water: [97, 158, 190],
  };
  const NIGHT = {
    surface: 'rgba(7,23,38,0.78)',
    shadow: 'rgba(0,0,0,0.55)',
    ink: [218, 243, 255],
    soft: [142, 195, 218],
    water: [96, 177, 211],
  };

  let width = 800;
  let dpr = 1;
  let angle = -0.2;
  let frame = 0;
  let last = 0;
  let dayLayer = null;
  let nightLayer = null;
  let layerWidth = 0;
  let layerDpr = 0;
  let pad = 6;
  let dragging = false;
  let drag = null;
  let spin = 0;
  let night = 0;
  let hoverPin = null;
  let mapHover = false;
  let activePin = null;
  const ripples = [];

  // ---------- pins ----------
  const pins = VENUES.map((venue) => {
    const el = document.createElement(venue.landmark ? 'span' : 'a');
    el.className = `city-pin xuhui-pin${venue.landmark ? ' is-landmark' : ''}`;
    el.dataset.phase = 'day';
    if (!venue.landmark) {
      el.href = `#${venue.panel}`;
      el.dataset.committee = venue.committee;
      el.dataset.panel = venue.panel;
      el.addEventListener('click', (event) => {
        event.preventDefault();
        const button = document.querySelector(`.delegate-choice[data-committee="${venue.committee}"]`);
        const panel = document.getElementById(venue.panel);
        if (!button || !panel) return;
        const current = pins.find((pin) => pin.el === el) || null;
        setActive(current);
        if (current) ripples.push({ x: current.dot.x, y: current.dot.y, start: performance.now() });
        if (button.getAttribute('aria-expanded') !== 'true') button.click();
        const complete = () => {
          panel.scrollIntoView({ behavior: reduce.matches ? 'instant' : 'smooth', block: 'start' });
          const heading = panel.querySelector('h2');
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        };
        if (reduce.matches) complete();
        else window.setTimeout(complete, 180);
      });
    } else {
      el.setAttribute('role', 'note');
    }
    el.innerHTML = '<span class="city-pin-label"><span class="city-kicker"></span><span class="city-name"></span><span class="city-en"></span><span class="city-entry"></span></span>';
    host.append(el);
    const label = el.querySelector('.city-pin-label');
    return {
      ...venue,
      el,
      label,
      point: pointOf(venue.lon, venue.lat),
      labelW: 140,
      labelH: 68,
      edge: '',
      dot: { x: 0, y: 0 },
      labelRect: { x: 0, y: 0, w: 140, h: 68 },
    };
  });

  map.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    mapHover = true;
    request();
  });
  map.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    mapHover = false;
    request();
  });

  pins.forEach((pin) => {
    if (pin.landmark) return;
    const enter = () => {
      hoverPin = pin;
      map.classList.add('is-hovering');
      pin.el.classList.add('is-hovered');
      request();
    };
    const leave = () => {
      if (hoverPin === pin) hoverPin = null;
      if (!hoverPin) map.classList.remove('is-hovering');
      pin.el.classList.remove('is-hovered');
      request();
    };
    pin.el.addEventListener('pointerenter', enter);
    pin.el.addEventListener('pointerleave', leave);
    pin.el.addEventListener('focus', enter);
    pin.el.addEventListener('blur', leave);
  });

  function setActive(pin) {
    if (activePin && activePin !== pin) activePin.el.classList.remove('is-active');
    activePin = pin;
    if (pin) pin.el.classList.add('is-active');
  }

  document.querySelectorAll('.delegate-panel-close').forEach((button) => {
    button.addEventListener('click', () => setActive(null));
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activePin) setActive(null);
  });

  function readNight() {
    const rawNight = document.body.style.getPropertyValue('--fx-night')
      || getComputedStyle(document.body).getPropertyValue('--fx-night');
    const value = Number.parseFloat(rawNight);
    return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
  }

  function updateLabels() {
    const english = document.documentElement.lang.toLowerCase().startsWith('en');
    for (const pin of pins) {
      pin.el.querySelector('.city-kicker').textContent = english ? pin.kickerEn : pin.kickerZh;
      pin.el.querySelector('.city-name').textContent = english ? pin.en : pin.zh;
      const secondary = pin.el.querySelector('.city-en');
      secondary.textContent = english ? '' : pin.en;
      secondary.hidden = english;
      const topic = english ? pin.topicEn : pin.topicZh;
      pin.el.querySelector('.city-entry').textContent = pin.landmark ? topic : `${topic} ↗`;
      pin.el.setAttribute('aria-label', english
        ? `${pin.en}${pin.landmark ? ' · Conference venue' : ' · committee entrance'}`
        : `${pin.zh}${pin.landmark ? ' · 本次大会地点' : ' · 会场入口'}`);
    }
    const title = scene?.querySelector('h1');
    if (title) title.textContent = english ? 'Delegate portal' : '代表入口';
    const district = document.querySelector('.xuhui-district-caption .district-zh');
    if (district) district.textContent = english ? 'Xuhui District' : '徐汇区';
    disclaimer.textContent = english
      ? 'Map for regional illustration only; not the actual conference venue.'
      : '地图仅作区域介绍演示，非会议实际召开地点。';
    canvas.setAttribute('aria-label', english
      ? 'Rotating overhead line drawing of Xuhui District. Drag to rotate. Four committee entrances, one campus location note, selected West Bund tower footprints, Xujiahui Cathedral, Wukang Mansion, Longhua Temple and Pagoda, and Shanghai Botanical Garden © OpenStreetMap contributors.'
      : '旋转的徐汇区俯瞰线稿地图，可拖动旋转。包含四个会场入口、交通大学本次大会地点，以及西岸楼体、徐家汇天主堂、武康大楼、龙华寺与龙华塔、上海植物园轮廓 © OpenStreetMap contributors。');
    map.setAttribute('aria-label', english
      ? 'Interactive Xuhui map. Drag to rotate; use Left and Right arrows; press Home to reset.'
      : '交互式徐汇区地图。拖动旋转，左右方向键旋转，Home 键复位。');
    host.setAttribute('aria-label', english ? 'Committee locations' : '会场地点入口');
    measureFrame();
    measureLabels();
    layout();
    draw();
  }

  function measureLabels() {
    for (const pin of pins) {
      pin.labelW = Math.max(1, Math.round(pin.label.offsetWidth));
      pin.labelH = Math.max(1, Math.round(pin.label.offsetHeight));
    }
  }

  function measureFrame() {
    pad = Math.max(4, Math.round(width * 0.009));
  }

  // ---------- static map layers ----------
  function renderLayer(palette, isNight) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(width * dpr));
    c.height = c.width;
    const g = c.getContext('2d');
    if (!g) return c;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const cx = width / 2;
    const cy = width / 2;
    const radius = width * MAP_SCALE;
    const point = (p) => [cx + p[0] * radius, cy + p[1] * radius];
    const path = (points, close = false) => {
      g.beginPath();
      points.forEach((p, index) => {
        const [x, y] = point(p);
        if (index) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      if (close) g.closePath();
    };
    const stroke = (points, color, lineWidth, alpha = 1, close = false, dash = null) => {
      if (!points.length) return;
      g.save();
      g.globalAlpha = alpha;
      g.strokeStyle = color;
      g.lineWidth = lineWidth;
      if (dash) g.setLineDash(dash);
      path(points, close);
      g.stroke();
      g.restore();
    };
    // A single clean water band along the smoothed east bank. Clip away the
    // land side so the administrative boundary itself closes the waterfront.
    if (river.bank.length) {
      g.save();
      g.beginPath();
      g.rect(0, 0, width, width);
      displayOutline.forEach(([x, y], index) => {
        const p = point([x, y]);
        if (index) g.lineTo(p[0], p[1]);
        else g.moveTo(p[0], p[1]);
      });
      g.closePath();
      g.clip('evenodd');
      g.lineCap = 'butt';
      g.lineJoin = 'round';
      g.strokeStyle = rgba(palette.water, isNight ? 0.34 : 0.24);
      g.lineWidth = width * 0.084;
      path(river.bank);
      g.stroke();
      g.strokeStyle = rgba(palette.water, isNight ? 0.2 : 0.14);
      g.lineWidth = width * 0.076;
      path(river.bank);
      g.stroke();
      g.restore();
    }

    // Soft, non-circular shadow behind the district.
    g.save();
    g.shadowColor = palette.shadow;
    g.shadowBlur = width * (isNight ? 0.045 : 0.03);
    g.shadowOffsetY = width * 0.008;
    g.fillStyle = palette.surface;
    path(displayOutline, true);
    g.fill();
    g.restore();

    // Administrative boundary.
    g.save();
    g.strokeStyle = rgba(palette.ink, isNight ? 0.26 : 0.18);
    g.lineWidth = Math.max(5.5, width * 0.011);
    path(displayOutline, true);
    g.stroke();
    g.restore();
    stroke(displayOutline, rgba(palette.ink, 0.98), Math.max(1.8, width * 0.0027), 1, true);

    return c;
  }

  function buildLayers() {
    dayLayer = renderLayer(DAY, false);
    nightLayer = renderLayer(NIGHT, true);
    layerWidth = width;
    layerDpr = dpr;
  }

  // ---------- layout ----------
  function chooseSide(pin, x) {
    const dx = x - width / 2;
    let side = dx < 0 ? 'left' : 'right';
    // Keep a side through the middle of the map; only switch after the point
    // has clearly crossed to the other half.
    if (pin.edge === 'left' && dx < width * 0.06) side = 'left';
    else if (pin.edge === 'right' && dx > -width * 0.06) side = 'right';
    return side;
  }

  function resolveLane(items, min, max, desiredOf, sizeOf) {
    if (!items.length) return [];
    items.sort((a, b) => desiredOf(a) - desiredOf(b));
    const gap = Math.max(width < 520 ? 8 : 10, Math.round(width * 0.012));
    const sizes = items.map(sizeOf);
    const total = sizes.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, items.length - 1);
    const fittedGap = total > max - min ? Math.max(2, (max - min - sizes.reduce((sum, value) => sum + value, 0)) / Math.max(1, items.length - 1)) : gap;
    const positions = items.map((item) => clamp(desiredOf(item), min, max - sizeOf(item)));
    for (let i = 1; i < positions.length; i++) {
      positions[i] = Math.max(positions[i], positions[i - 1] + sizes[i - 1] + fittedGap);
    }
    const overflow = positions[positions.length - 1] + sizes[sizes.length - 1] - max;
    if (overflow > 0) {
      for (let i = 0; i < positions.length; i++) positions[i] -= overflow;
    }
    if (positions[0] < min) {
      const shift = min - positions[0];
      for (let i = 0; i < positions.length; i++) positions[i] += shift;
      const endOverflow = positions[positions.length - 1] + sizes[sizes.length - 1] - max;
      if (endOverflow > 0) {
        let cursor = min;
        for (let i = 0; i < positions.length; i++) {
          positions[i] = clamp(cursor, min, max - sizes[i]);
          cursor = positions[i] + sizes[i] + Math.max(1, fittedGap);
        }
      }
    }
    return positions;
  }

  function layout() {
    if (!width) return;
    const cx = width / 2;
    const cy = width / 2;
    const radius = width * MAP_SCALE;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const pin of pins) {
      const [x, y] = pin.point;
      const px = cx + (x * cos - y * sin) * radius;
      const py = cy + (x * sin + y * cos) * radius;
      pin.dot = { x: px, y: py };
      pin.edge = chooseSide(pin, px);
      pin.el.style.left = `${px}px`;
      pin.el.style.top = `${py}px`;
      pin.el.classList.remove('lane-top', 'lane-right', 'lane-bottom', 'lane-left');
      pin.el.classList.add(`lane-${pin.edge}`);
    }

    const lanes = { left: [], right: [] };
    for (const pin of pins) lanes[pin.edge].push(pin);
    // Leave the top-left corner free for the page heading on desktop. On
    // mobile the heading is in normal flow, so the full side can be used.
    const verticalMin = Math.max(pad, width > 720 ? width * 0.12 : pad);
    const verticalMax = width - pad;

    for (const lane of ['left', 'right']) {
      const group = lanes[lane];
      if (!group.length) continue;
      const positions = resolveLane(group, verticalMin, verticalMax, (p) => p.dot.y - p.labelH / 2, (p) => p.labelH);
      group.forEach((pin, index) => {
        pin.labelRect = {
          x: lane === 'left' ? pad : width - pad - pin.labelW,
          y: positions[index],
          w: pin.labelW,
          h: pin.labelH,
        };
      });
    }

    for (const pin of pins) {
      const rect = pin.labelRect;
      pin.label.style.left = `${Math.round(rect.x - pin.dot.x + 22)}px`;
      pin.label.style.top = `${Math.round(rect.y - pin.dot.y + 22)}px`;
      pin.el.dataset.phase = night > 0.46 ? 'night' : 'day';
      pin.el.classList.remove('align-left', 'align-right', 'align-center');
      const offset = rect.x + rect.w / 2 - pin.dot.x;
      pin.el.classList.add(Math.abs(offset) < 8 ? 'align-center' : offset > 0 ? 'align-left' : 'align-right');
    }

  }

  // ---------- draw ----------
  function boundaryScreenPath() {
    const cx = width / 2;
    const cy = width / 2;
    const radius = width * MAP_SCALE;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    displayOutline.forEach(([x, y], index) => {
      const px = cx + (x * cos - y * sin) * radius;
      const py = cy + (x * sin + y * cos) * radius;
      if (index) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.closePath();
  }

  function drawAtmosphere(value) {
    const phase = Number.parseFloat(scene?.dataset.solarPhase) || 0;
    const cx = width / 2;
    const cy = width / 2;
    ctx.save();
    boundaryScreenPath();
    ctx.clip();
    const lightX = cx + Math.cos(phase) * width * 0.38;
    const lightY = cy + Math.sin(phase) * width * 0.22;
    const wash = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.72);
    wash.addColorStop(0, rgba([223, 246, 255], 0.11 * (1 - value)));
    wash.addColorStop(0.46, 'rgba(255,255,255,0)');
    wash.addColorStop(1, rgba([2, 11, 22], 0.22 * value));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, width);
    const nightPool = ctx.createRadialGradient(cx - width * 0.18, cy + width * 0.14, 0, cx - width * 0.18, cy + width * 0.14, width * 0.55);
    nightPool.addColorStop(0, rgba([43, 75, 98], 0.09 * value));
    nightPool.addColorStop(1, 'rgba(43,75,98,0)');
    ctx.fillStyle = nightPool;
    ctx.fillRect(0, 0, width, width);
    ctx.restore();

    if (value > 0.08) {
      ctx.save();
      ctx.strokeStyle = rgba([190, 235, 255], 0.16 * value);
      ctx.lineWidth = Math.max(4, width * 0.008);
      ctx.shadowColor = rgba([190, 235, 255], 0.4 * value);
      ctx.shadowBlur = width * 0.018;
      boundaryScreenPath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBuildings(value) {
    if (!buildings.length) return;
    const cx = width / 2;
    const cy = width / 2;
    const radius = width * MAP_SCALE;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const heightScale = width * 0.00036;
    const topFill = rgba(mix([238, 250, 255], [8, 27, 44], value), value > 0.46 ? 0.88 : 0.82);
    const sideFill = rgba(mix([145, 195, 218], [8, 28, 48], value), value > 0.46 ? 0.5 : 0.36);
    const edge = rgba(mix(DAY.ink, NIGHT.ink, value), value > 0.46 ? 0.62 : 0.48);
    const baseEdge = rgba(mix(DAY.soft, NIGHT.soft, value), value > 0.46 ? 0.38 : 0.28);
    const tencentTopFill = rgba(mix([190, 243, 236], [93, 178, 178], value), value > 0.46 ? 0.9 : 0.86);
    const tencentSideFill = rgba(mix([65, 137, 137], [34, 84, 94], value), value > 0.46 ? 0.56 : 0.42);
    const tencentEdge = rgba(mix([29, 105, 108], [190, 225, 230], value), value > 0.46 ? 0.7 : 0.62);
    const rendered = buildings.map((building) => {
      const screen = building.points.map(([x, y]) => [
        cx + (x * cos - y * sin) * radius,
        cy + (x * sin + y * cos) * radius,
      ]);
      const centroidY = screen.reduce((sum, point) => sum + point[1], 0) / screen.length;
      return { ...building, screen, centroidY, lift: clamp((building.height || 0) * heightScale, 6, 76) };
    }).sort((a, b) => {
      const aArea = a.extrude === false ? 0 : 1;
      const bArea = b.extrude === false ? 0 : 1;
      return aArea - bArea || a.centroidY - b.centroidY;
    });

    const gardenFill = rgba(mix([154, 196, 183], [64, 130, 120], value), value > 0.46 ? 0.12 : 0.1);
    const templeFill = rgba(mix([195, 214, 226], [104, 166, 191], value), value > 0.46 ? 0.12 : 0.1);
    const areaEdge = rgba(mix([102, 145, 166], [193, 230, 246], value), value > 0.46 ? 0.38 : 0.3);

    ctx.save();
    boundaryScreenPath();
    ctx.clip();
    for (const building of rendered) {
      const { screen, lift } = building;
      const isTencent = building.highlight === 'tencent';
      const buildingTopFill = isTencent ? tencentTopFill : topFill;
      const buildingSideFill = isTencent ? tencentSideFill : sideFill;
      const buildingEdge = isTencent ? tencentEdge : edge;
      if (building.extrude === false) {
        ctx.beginPath();
        screen.forEach(([x, y], index) => {
          if (index) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = building.kind === 'garden' ? gardenFill : templeFill;
        ctx.fill();
        ctx.strokeStyle = areaEdge;
        ctx.lineWidth = Math.max(0.65, width * 0.0008);
        ctx.stroke();
        continue;
      }
      const top = screen.map(([x, y]) => [x, y - lift]);
      ctx.fillStyle = buildingSideFill;
      for (let index = 0; index < screen.length - 1; index++) {
        const a = screen[index];
        const b = screen[index + 1];
        const ta = top[index];
        const tb = top[index + 1];
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(tb[0], tb[1]);
        ctx.lineTo(ta[0], ta[1]);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      top.forEach(([x, y], index) => {
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = buildingTopFill;
      ctx.fill();
      ctx.strokeStyle = buildingEdge;
      ctx.lineWidth = Math.max(0.65, width * 0.0008);
      ctx.stroke();
      ctx.beginPath();
      screen.forEach(([x, y], index) => {
        if (index) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = baseEdge;
      ctx.lineWidth = Math.max(0.5, width * 0.0006);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLeaders(value) {
    if (!pins.length) return;
    for (const pin of pins) {
      const hot = pin === hoverPin || pin === activePin;
      const rect = pin.labelRect;
      const tx = clamp(pin.dot.x, rect.x, rect.x + rect.w);
      const ty = clamp(pin.dot.y, rect.y, rect.y + rect.h);
      ctx.save();
      ctx.setLineDash(hot ? [] : [1.5, 4]);
      ctx.lineWidth = hot ? Math.max(1.2, width * 0.0015) : Math.max(0.8, width * 0.00095);
      ctx.strokeStyle = rgba(mix(DAY.soft, NIGHT.soft, value), hot ? 0.92 : (value > 0.46 ? 0.74 : 0.6));
      ctx.beginPath();
      ctx.moveTo(pin.dot.x, pin.dot.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      if (hot) {
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(1.6, width * 0.0024), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawPointFeedback(value) {
    const now = performance.now();
    const pulse = (Math.sin(now / 420) + 1) / 2;
    const accent = mix(DAY.ink, NIGHT.ink, value);
    const hot = pins.filter((pin) => pin === hoverPin || pin === activePin);
    for (const pin of hot) {
      const active = pin === activePin;
      ctx.save();
      ctx.translate(pin.dot.x, pin.dot.y);
      ctx.strokeStyle = rgba(accent, active ? 0.72 : 0.42);
      ctx.lineWidth = active ? 1.7 : 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, 9 + (active ? 7 : 4) * pulse, 0, TAU);
      ctx.stroke();
      if (active) {
        ctx.globalAlpha = 0.35 + 0.25 * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, 19 + 5 * pulse, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (let index = ripples.length - 1; index >= 0; index--) {
      const ripple = ripples[index];
      const age = now - ripple.start;
      if (age > 760) {
        ripples.splice(index, 1);
        continue;
      }
      const progress = age / 760;
      ctx.save();
      ctx.strokeStyle = rgba(mix(DAY.ink, NIGHT.ink, value), (1 - progress) * 0.55);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, 8 + progress * 34, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRiverCurrent() {
    if (reduce.matches || !river.bank.length) return;
    const radius = width * MAP_SCALE;
    const cx = width / 2;
    const cy = width / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    river.bank.forEach(([x, y], index) => {
      const px = x * radius;
      const py = y * radius;
      if (index) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.setLineDash([width * 0.012, width * 0.095]);
    ctx.lineDashOffset = -(performance.now() * 0.022) % (width * 0.107);
    ctx.strokeStyle = rgba(mix(DAY.water, NIGHT.water, night), night > 0.46 ? 0.22 : 0.15);
    ctx.lineWidth = Math.max(0.9, width * 0.0015);
    ctx.stroke();
    ctx.restore();
  }

  function drawBoundaryPulse() {
    if (reduce.matches) return;
    const now = performance.now();
    const accent = mix([142, 40, 59], [247, 213, 185], night);
    ctx.save();
    ctx.strokeStyle = rgba(accent, night > 0.46 ? 0.55 : 0.34);
    ctx.lineWidth = Math.max(1, width * 0.0014);
    ctx.setLineDash([width * 0.016, width * 0.76]);
    ctx.lineDashOffset = -(now * 0.018) % (width * 0.776);
    ctx.shadowColor = rgba(accent, night > 0.46 ? 0.36 : 0.16);
    ctx.shadowBlur = width * 0.012;
    boundaryScreenPath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    night = readNight();
    ctx.clearRect(0, 0, width, width);
    if (!dayLayer || !nightLayer) return;
    ctx.save();
    ctx.translate(width / 2, width / 2);
    ctx.rotate(angle);
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 1 - night;
    ctx.drawImage(dayLayer, -width / 2, -width / 2, width, width);
    ctx.globalAlpha = night;
    ctx.drawImage(nightLayer, -width / 2, -width / 2, width, width);
    ctx.globalAlpha = 1;
    ctx.restore();

    drawRiverCurrent();
    drawAtmosphere(night);
    drawBuildings(night);
    drawBoundaryPulse();
    drawLeaders(night);
    drawPointFeedback(night);

    if (map.dataset.night !== String(night > 0.46)) map.dataset.night = String(night > 0.46);
  }

  function resize() {
    const next = Math.round(map.getBoundingClientRect().width);
    if (!next) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const changed = next !== width || nextDpr !== dpr || !dayLayer;
    width = next;
    dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = canvas.width;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${width}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    if (changed || layerWidth !== width || layerDpr !== dpr) {
      buildLayers();
      measureFrame();
      measureLabels();
    }
    layout();
    draw();
  }

  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (document.hidden) return;
    const dt = Math.min(64, Math.max(1, now - (last || now)));
    last = now;
    if (!dragging) {
      const auto = reduce.matches ? 0 : (hoverPin || mapHover ? 0 : AUTO_SPEED);
      const delta = dt * (auto + spin);
      if (delta) angle = ((angle + delta + Math.PI) % TAU + TAU) % TAU - Math.PI;
      spin *= Math.exp(-dt / 420);
      if (Math.abs(spin) < 0.0000015) spin = 0;
    }
    layout();
    draw();
    request();
  }

  // Drag-to-rotate. Labels and links are excluded so entries stay clickable.
  map.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.xuhui-pin')) return;
    if (event.pointerType === 'touch') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragging = true;
    drag = { id: event.pointerId, lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
    map.classList.add('is-dragging');
    try { map.setPointerCapture(event.pointerId); } catch {}
    if (event.cancelable) event.preventDefault();
    request();
  });
  map.addEventListener('pointermove', (event) => {
    if (!dragging || !drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.lastX;
    if (!dx) return;
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastTime);
    const change = dx * 0.0036;
    angle = ((angle + change + Math.PI) % TAU + TAU) % TAU - Math.PI;
    drag.velocity = drag.velocity * 0.72 + (change / dt) * 0.28;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    spin = 0;
    if (event.cancelable) event.preventDefault();
    layout();
    draw();
  });
  function endDrag(event) {
    if (!dragging || !drag || (event && event.pointerId !== drag.id)) return;
    dragging = false;
    map.classList.remove('is-dragging');
    if (!reduce.matches) spin = clamp(drag.velocity, -0.00032, 0.00032);
    else spin = 0;
    drag = null;
    request();
  }
  map.addEventListener('pointerup', endDrag);
  map.addEventListener('pointercancel', endDrag);
  map.addEventListener('lostpointercapture', () => endDrag());

  // Explicit touch fallback: some mobile browsers cancel pointer streams once
  // a gesture starts. Intentionally wait for a horizontal first move so a
  // vertical swipe can still scroll the page.
  let touchDrag = null;
  function endTouchDrag() {
    if (!touchDrag) return;
    const wasRotate = touchDrag.mode === 'rotate';
    const velocity = touchDrag.velocity;
    touchDrag = null;
    dragging = false;
    map.classList.remove('is-dragging');
    if (wasRotate && !reduce.matches) spin = clamp(velocity, -0.00055, 0.00055);
    else spin = 0;
    request();
  }
  map.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1 || event.target.closest('.xuhui-pin')) return;
    const touch = event.touches[0];
    touchDrag = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastTime: performance.now(),
      velocity: 0,
      mode: 'pending',
    };
    dragging = true;
    map.classList.add('is-dragging');
    request();
  }, { passive: true });
  map.addEventListener('touchmove', (event) => {
    if (!touchDrag) return;
    const touch = event.touches[0];
    if (!touch) return;
    const totalX = touch.clientX - touchDrag.startX;
    const totalY = touch.clientY - touchDrag.startY;
    if (touchDrag.mode === 'pending') {
      if (Math.hypot(totalX, totalY) < 7) return;
      if (Math.abs(totalX) < Math.abs(totalY) * 0.75) {
        touchDrag = null;
        dragging = false;
        map.classList.remove('is-dragging');
        request();
        return;
      }
      touchDrag.mode = 'rotate';
    }
    if (touchDrag.mode !== 'rotate') return;
    if (event.cancelable) event.preventDefault();
    const dx = touch.clientX - touchDrag.lastX;
    if (!dx) return;
    const now = performance.now();
    const dt = Math.max(1, now - touchDrag.lastTime);
    const change = dx * 0.0036;
    angle = ((angle + change + Math.PI) % TAU + TAU) % TAU - Math.PI;
    touchDrag.velocity = touchDrag.velocity * 0.72 + (change / dt) * 0.28;
    touchDrag.lastX = touch.clientX;
    touchDrag.lastTime = now;
    spin = 0;
    layout();
    draw();
  }, { passive: false });
  map.addEventListener('touchend', endTouchDrag);
  map.addEventListener('touchcancel', endTouchDrag);

  map.tabIndex = 0;
  map.setAttribute('role', 'group');
  function rotateBy(delta) {
    angle = ((angle + delta + Math.PI) % TAU + TAU) % TAU - Math.PI;
    spin = 0;
    layout();
    draw();
  }
  map.addEventListener('keydown', (event) => {
    if (event.target.closest('.xuhui-pin')) return;
    const step = event.shiftKey ? 0.24 : 0.1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      rotateBy(event.key === 'ArrowLeft' ? -step : step);
    } else if (event.key === 'Home' || event.key === '0') {
      event.preventDefault();
      angle = -0.2;
      spin = 0;
      layout();
      draw();
    }
  });
  map.addEventListener('dblclick', (event) => {
    if (event.target.closest('.xuhui-pin')) return;
    angle = -0.2;
    spin = 0;
    layout();
    draw();
  });

  updateLabels();
  resize();
  request();
  requestAnimationFrame(() => map.classList.add('is-ready'));

  // Small diagnostics hook used by local preview checks; no UI surface.
  Object.defineProperty(map, '__xuhuiMap', {
    configurable: true,
    value: {
      get angle() { return angle; },
      setAngle(value) {
        if (!Number.isFinite(value)) return;
        angle = value;
        spin = 0;
        layout();
        draw();
      },
      pause() { spin = 0; },
      get night() { return night; },
      get pinRects() {
        return pins.map((pin) => ({ name: pin.zh, entry: !pin.landmark, ...pin.labelRect }));
      },
    },
  });

  window.addEventListener('resize', resize);
  window.addEventListener('mun-languagechange', updateLabels);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(map);
  if (document.fonts?.ready) document.fonts.ready.then(() => { measureFrame(); measureLabels(); layout(); draw(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      last = 0;
      request();
    }
  });
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame), { once: true });
})();
