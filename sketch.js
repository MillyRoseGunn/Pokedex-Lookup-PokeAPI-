let data = null;      // JSON from PokéAPI
let sprite = null;    // p5.Image
let loading = false;
let errMsg = null;

function setup() {
  const c = createCanvas(900, 520);
  c.parent("canvas-holder");
  textFont("system-ui");

  // UI
  const queryEl = document.getElementById("query");
  document.getElementById("go").addEventListener("click", () => {
    const q = queryEl.value.trim();
    if (q) fetchPokemon(q);
  });

  queryEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("go").click();
  });

  document.getElementById("rand").addEventListener("click", () => {
    const id = floor(random(1, 152)); // Gen 1
    queryEl.value = String(id);
    fetchPokemon(String(id));
  });

  // Initial
  fetchPokemon(queryEl.value.trim());
}

function draw() {
  background(255);

  // panel regions
  stroke(0, 30);
  noFill();
  rect(24, 24, width - 48, height - 48, 12);

  if (loading) {
    drawStatus("Loading…");
    return;
  }
  if (errMsg) {
    drawStatus("Error: " + errMsg);
    return;
  }
  if (!data) {
    drawStatus("No data yet.");
    return;
  }

  drawPokemon(data, sprite);
}

function keyPressed() {
  if (key === "s" || key === "S") saveCanvas("pokeapi-pokedex", "png");
}

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

function drawStatus(msg) {
  noStroke();
  fill(0, 180);
  textSize(16);
  text(msg, 40, 60);
}

async function fetchPokemon(query) {
  loading = true;
  errMsg = null;
  data = null;
  sprite = null;

  const q = query.toLowerCase().trim();
  setStatus(`Fetching "${q}"…`);

  try {
    // main endpoint
    // https://pokeapi.co/api/v2/pokemon/{name or id}
    const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "accept": "application/json" } });

    if (!res.ok) {
      if (res.status === 404) throw new Error("Not found (try another name/ID).");
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    data = json;

    // pokemon sprite: ideally we get the official artwork, fallback to default sprite though if needs be
    const art =
      json?.sprites?.other?.["official-artwork"]?.front_default ||
      json?.sprites?.front_default ||
      null;

    if (art) {
      await new Promise((resolve) => {
        loadImage(
          art,
          (img) => { sprite = img; resolve(); },
          () => { sprite = null; resolve(); }
        );
      });
    }

    setStatus(`Loaded: #${json.id} ${cap(json.name)}`);
  } catch (e) {
    errMsg = e.message;
    setStatus("Error: " + errMsg);
  } finally {
    loading = false;
  }
}

function drawPokemon(p, img) {
  const left = 40;
  const top = 60;

  // on the left: image
  const boxW = 320;
  const boxH = 360;

  stroke(0, 25);
  noFill();
  rect(left, top, boxW, boxH, 10);

  if (img) {
    const fit = fitContain(img.width, img.height, boxW - 24, boxH - 24);
    image(img, left + 12 + fit.x, top + 12 + fit.y, fit.w, fit.h);
  } else {
    noStroke();
    fill(0, 120);
    textSize(14);
    text("No image available", left + 14, top + 28);
  }

  // on the right: text fields
  const rx = left + boxW + 24;
  const rw = width - rx - 40;

  noStroke();
  fill(0);
  textStyle(BOLD);
  textSize(26);
  text(`#${p.id}  ${cap(p.name)}`, rx, top + 24);

  // pokemon types
  textStyle(NORMAL);
  fill(0, 170);
  textSize(14);
  const types = (p.types || [])
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map(t => cap(t.type.name))
    .join(" / ");
  text(`Type: ${types || "—"}`, rx, top + 52);

  // height/weight (PokéAPI uses decimeters/hectograms)
  const heightM = (p.height ?? 0) / 10;
  const weightKg = (p.weight ?? 0) / 10;
  text(`Height: ${heightM} m`, rx, top + 74);
  text(`Weight: ${weightKg} kg`, rx, top + 96);

  // abilities
  const abilities = (p.abilities || [])
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map(a => cap(a.ability.name.replaceAll("-", " ")))
    .join(", ");
  text(`Abilities: ${abilities || "—"}`, rx, top + 124, rw, 80);

  //drawing bar list of stats
  const stats = p.stats || [];
  const baseY = top + 220;

  fill(0);
  textStyle(BOLD);
  textSize(14);
  text("Base stats", rx, baseY - 14);

  textStyle(NORMAL);
  const maxBar = min(320, rw - 120);
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const label = (s.stat?.name || "").toUpperCase();
    const val = s.base_stat ?? 0;

    const y = baseY + i * 32;

    fill(0, 160);
    text(label, rx, y);

    // bar stuff
    noStroke();
    fill(0, 25);
    rect(rx + 120, y - 14, maxBar, 16, 6);
    fill(0, 120);
    const w = constrain(map(val, 0, 200, 0, maxBar), 0, maxBar);
    rect(rx + 120, y - 14, w, 16, 6);

    fill(0, 160);
    text(val, rx + 120 + maxBar + 10, y);
  }
}

function fitContain(srcW, srcH, dstW, dstH) {
  const srcAR = srcW / srcH;
  const dstAR = dstW / dstH;

  let w, h, x, y;
  if (srcAR > dstAR) {
    w = dstW;
    h = dstW / srcAR;
    x = 0;
    y = (dstH - h) / 2;
  } else {
    h = dstH;
    w = dstH * srcAR;
    x = (dstW - w) / 2;
    y = 0;
  }
  return { x, y, w, h };
}

function cap(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
