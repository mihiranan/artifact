"use client";

import { useEffect, useRef } from "react";

type RGB = [number, number, number];

type Agent = {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  baseSize: number;
  size: number;
  seed: number;
  driftSpeed: number;
  opacity: number;
  mouseInfluence: number;
  edgeFade: number;
  culture: number[];
  currentColor: RGB;
  wanderAngle: number;
  wanderSpeed: number;
  wanderTurnRate: number;
  homeX: number;
  homeY: number;
};

const AXELROD = {
  F: 6,
  Q: 4,
  noiseRate: 0.0,
  neighborRadius: 0.016,
  agentSpeed: 0.35,
  repulsionThreshold: 0.03,
  mouseRadius: 0.1,
  mousePush: 0.008,
};

const COLOR_SHARPNESS = 10;
const SUN_CYCLE_MS = 60000;
const AGENT_COUNT = 4000;

export function HumansAndLogo({
  className = "",
  onPaletteChange,
}: {
  className?: string;
  onPaletteChange?: (color: [number, number, number]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteCallbackRef = useRef(onPaletteChange);

  useEffect(() => {
    paletteCallbackRef.current = onPaletteChange;
  }, [onPaletteChange]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    if (!canvas) return;
    const host = canvas.parentElement!;
    if (!host) return;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    if (!ctx) return;

    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let running = true;
    let raf = 0;
    let frameCount = 0;
    let maskLoaded = false;
    let size = { width: 0, height: 0 };
    let aspectRatio = 1;
    let maskImageData: ImageData | null = null;
    let insideMask: Uint8Array | null = null;
    let maskBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    let maskFit = { scale: 1, offsetX: 0, offsetY: 0, drawW: 1, drawH: 1 };
    let agents: Agent[] = [];
    let spatialHash: Record<string, Agent[]> = {};
    const mouse = { x: -10, y: -10, targetX: -10, targetY: -10 };

    const powerLookup = new Array(AXELROD.Q)
      .fill(0)
      .map((_, i) => Math.pow(i + 0.1, COLOR_SHARPNESS));

    const colorPalettes: Record<"day" | "golden" | "sunset", RGB[]> = {
      day: [
        [110, 145, 190],
        [100, 140, 65],
        [70, 105, 145],
        [55, 90, 45],
        [160, 140, 120],
        [140, 150, 170],
      ],
      golden: [
        [195, 140, 85],
        [135, 125, 55],
        [130, 90, 100],
        [75, 85, 45],
        [170, 120, 80],
        [185, 155, 125],
      ],
      sunset: [
        [190, 65, 50],
        [95, 75, 45],
        [95, 45, 75],
        [50, 55, 40],
        [140, 70, 60],
        [185, 115, 85],
      ],
    };

    const maskImage = new Image();
    maskImage.src = "/humans-logo.svg";

    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
    if (!maskCtx) return;

    function setupCanvas() {
      const rect = host.getBoundingClientRect();
      size = {
        width: Math.max(10, Math.floor(rect.width)),
        height: Math.max(10, Math.floor(rect.height)),
      };
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.width = Math.floor(size.width * dpr);
      canvas.height = Math.floor(size.height * dpr);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      aspectRatio = size.width / Math.max(1, size.height);
    }

    function setupMaskCanvas() {
      if (!maskLoaded) return;
      maskCanvas.width = Math.floor(size.width * dpr);
      maskCanvas.height = Math.floor(size.height * dpr);
      maskCtx.setTransform(1, 0, 0, 1, 0, 0);
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.scale(dpr, dpr);
      maskCtx.drawImage(maskImage, 0, 0, size.width, size.height);
      maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

      const { data, width, height } = maskImageData;
      const nextInside = new Uint8Array(width * height);

      // Estimate background color from border pixels, then segment text pixels.
      let bgR = 0;
      let bgG = 0;
      let bgB = 0;
      let bgCount = 0;
      const borderStep = 4;

      for (let x = 0; x < width; x += borderStep) {
        const topIdx = x * 4;
        const bottomIdx = ((height - 1) * width + x) * 4;
        bgR += data[topIdx] + data[bottomIdx];
        bgG += data[topIdx + 1] + data[bottomIdx + 1];
        bgB += data[topIdx + 2] + data[bottomIdx + 2];
        bgCount += 2;
      }
      for (let y = 1; y < height - 1; y += borderStep) {
        const leftIdx = (y * width) * 4;
        const rightIdx = (y * width + (width - 1)) * 4;
        bgR += data[leftIdx] + data[rightIdx];
        bgG += data[leftIdx + 1] + data[rightIdx + 1];
        bgB += data[leftIdx + 2] + data[rightIdx + 2];
        bgCount += 2;
      }

      const avgBgR = bgR / Math.max(1, bgCount);
      const avgBgG = bgG / Math.max(1, bgCount);
      const avgBgB = bgB / Math.max(1, bgCount);

      for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
          const i = py * width + px;
          const idx = i * 4;
          const a = data[idx + 3];
          if (a < 8) continue;

          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const saturation = maxC - minC;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const distFromBg = Math.sqrt(
            (r - avgBgR) * (r - avgBgR) +
              (g - avgBgG) * (g - avgBgG) +
              (b - avgBgB) * (b - avgBgB)
          );

          if ((distFromBg > 32 && saturation > 16) || luma < 145) {
            nextInside[i] = 1;
          }
        }
      }

      // Remove isolated noise pixels so the whole rectangle is never treated as shape.
      const cleaned = new Uint8Array(width * height);
      for (let py = 1; py < height - 1; py += 1) {
        for (let px = 1; px < width - 1; px += 1) {
          const i = py * width + px;
          if (!nextInside[i]) continue;

          let neighborCount = 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue;
              if (nextInside[(py + oy) * width + (px + ox)]) neighborCount += 1;
            }
          }
          if (neighborCount >= 3) cleaned[i] = 1;
        }
      }
      insideMask = cleaned;

      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      let found = false;
      for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
          if (!cleaned[py * width + px]) continue;
          found = true;
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        }
      }
      if (found) {
        const padX = Math.max(2, Math.floor((maxX - minX) * 0.02));
        const padY = Math.max(2, Math.floor((maxY - minY) * 0.03));
        maskBounds = {
          minX: Math.max(0, minX - padX),
          minY: Math.max(0, minY - padY),
          maxX: Math.min(width - 1, maxX + padX),
          maxY: Math.min(height - 1, maxY + padY),
        };
      } else {
        maskBounds = { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
      }

      // Fit the detected glyph bounds into host canvas without warping aspect ratio.
      const boundsW = Math.max(1, maskBounds.maxX - maskBounds.minX + 1);
      const boundsH = Math.max(1, maskBounds.maxY - maskBounds.minY + 1);
      const hostW = Math.max(1, maskCanvas.width);
      const hostH = Math.max(1, maskCanvas.height);
      const scale = Math.min(hostW / boundsW, hostH / boundsH);
      const drawW = boundsW * scale;
      const drawH = boundsH * scale;
      maskFit = {
        scale,
        offsetX: (hostW - drawW) * 0.5,
        offsetY: (hostH - drawH) * 0.5,
        drawW,
        drawH,
      };
    }

    function isInsideShape(x: number, y: number) {
      if (!maskImageData || !insideMask) return false;
      const px = x * dpr;
      const py = y * dpr;
      if (px < 0 || px >= maskCanvas.width || py < 0 || py >= maskCanvas.height) return false;

      if (
        px < maskFit.offsetX ||
        py < maskFit.offsetY ||
        px >= maskFit.offsetX + maskFit.drawW ||
        py >= maskFit.offsetY + maskFit.drawH
      ) {
        return false;
      }

      const localX = (px - maskFit.offsetX) / Math.max(1e-6, maskFit.scale);
      const localY = (py - maskFit.offsetY) / Math.max(1e-6, maskFit.scale);
      const mx = Math.floor(maskBounds.minX + localX);
      const my = Math.floor(maskBounds.minY + localY);
      if (mx < 0 || mx >= maskCanvas.width || my < 0 || my >= maskCanvas.height) return false;
      return insideMask[my * maskCanvas.width + mx] === 1;
    }

    function isInsideFrac(fracX: number, fracY: number) {
      return isInsideShape(fracX * size.width, fracY * size.height);
    }

    function getCellSizeBase() {
      return AXELROD.neighborRadius * 1.2;
    }

    function buildSpatialHash() {
      spatialHash = {};
      const cellSizeBase = getCellSizeBase();
      const cellSizeX = cellSizeBase / aspectRatio;
      const cellSizeY = cellSizeBase;
      for (let i = 0; i < agents.length; i += 1) {
        const a = agents[i];
        const cellX = Math.floor(a.x / cellSizeX);
        const cellY = Math.floor(a.y / cellSizeY);
        const key = `${cellX},${cellY}`;
        if (!spatialHash[key]) spatialHash[key] = [];
        spatialHash[key].push(a);
      }
    }

    function getNeighbors(agent: Agent, radius: number) {
      const neighbors: Array<{ agent: Agent; distance: number }> = [];
      const cellSizeBase = getCellSizeBase();
      const cellSizeX = cellSizeBase / aspectRatio;
      const cellSizeY = cellSizeBase;
      const cellRadius = Math.ceil(radius / cellSizeBase);
      const cx = Math.floor(agent.x / cellSizeX);
      const cy = Math.floor(agent.y / cellSizeY);

      for (let dx = -cellRadius; dx <= cellRadius; dx += 1) {
        for (let dy = -cellRadius; dy <= cellRadius; dy += 1) {
          const cell = spatialHash[`${cx + dx},${cy + dy}`];
          if (!cell) continue;
          for (let i = 0; i < cell.length; i += 1) {
            const other = cell[i];
            if (other === agent) continue;
            const distX = (other.x - agent.x) * aspectRatio;
            const distY = other.y - agent.y;
            const dist = Math.sqrt(distX * distX + distY * distY);
            if (dist < radius) neighbors.push({ agent: other, distance: dist });
          }
        }
      }
      return neighbors;
    }

    function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
      return [
        c1[0] + (c2[0] - c1[0]) * t,
        c1[1] + (c2[1] - c1[1]) * t,
        c1[2] + (c2[2] - c1[2]) * t,
      ];
    }

    function getCurrentPalette(progress: number): RGB[] {
      const times: Array<"day" | "golden" | "sunset"> = ["day", "golden", "sunset"];
      const idx = Math.floor(progress * 3) % 3;
      const nextIdx = (idx + 1) % 3;
      const t = (progress * 3) % 1;
      const p1 = colorPalettes[times[idx]];
      const p2 = colorPalettes[times[nextIdx]];
      return p1.map((c, i) => lerpColor(c, p2[i], t));
    }

    function getColorForCulture(culture: number[], palette: RGB[]): RGB {
      let totalWeight = 0;
      const weights = new Array(culture.length).fill(0);
      for (let i = 0; i < culture.length; i += 1) {
        const w = powerLookup[culture[i]];
        weights[i] = w;
        totalWeight += w;
      }
      const out: RGB = [0, 0, 0];
      for (let i = 0; i < culture.length; i += 1) {
        const weight = weights[i] / Math.max(1e-6, totalWeight);
        out[0] += palette[i % palette.length][0] * weight;
        out[1] += palette[i % palette.length][1] * weight;
        out[2] += palette[i % palette.length][2] * weight;
      }
      return out;
    }

    function axelrodUpdate(agent: Agent, dtScale: number) {
      if (dtScale < 1 && Math.random() > dtScale) return;
      const effectiveScale = Math.max(1, dtScale);
      const neighbors = getNeighbors(agent, AXELROD.neighborRadius);
      if (!neighbors.length) return;

      let totalWeight = 0;
      const weights = neighbors.map(({ distance }) => {
        const w = 1 / (distance + 1);
        totalWeight += w;
        return w;
      });
      let r = Math.random() * totalWeight;
      let selected: Agent | null = null;
      for (let i = 0; i < neighbors.length; i += 1) {
        r -= weights[i];
        if (r <= 0) {
          selected = neighbors[i].agent;
          break;
        }
      }
      if (!selected) return;

      let matches = 0;
      const differing: number[] = [];
      const matching: number[] = [];
      for (let i = 0; i < AXELROD.F; i += 1) {
        if (agent.culture[i] === selected.culture[i]) {
          matches += 1;
          matching.push(i);
        } else {
          differing.push(i);
        }
      }
      const similarity = matches / AXELROD.F;

      if (similarity >= AXELROD.repulsionThreshold) {
        if (Math.random() < similarity * effectiveScale && differing.length > 0) {
          const idx = differing[Math.floor(Math.random() * differing.length)];
          agent.culture[idx] = selected.culture[idx];
        }
      } else if (Math.random() < (1 - similarity) * effectiveScale && matching.length > 0) {
        const idx = matching[Math.floor(Math.random() * matching.length)];
        const neighborValue = selected.culture[idx];
        let newValue = neighborValue;
        while (newValue === neighborValue && AXELROD.Q > 1) {
          newValue = Math.floor(Math.random() * AXELROD.Q);
        }
        agent.culture[idx] = newValue;
      }

      if (Math.random() < AXELROD.noiseRate * effectiveScale) {
        const traitIdx = Math.floor(Math.random() * AXELROD.F);
        agent.culture[traitIdx] = Math.floor(Math.random() * AXELROD.Q);
      }
    }

    function updateAgent(agent: Agent, time: number, palette: RGB[], dtScale: number) {
      const speedMult = AXELROD.agentSpeed;
      agent.wanderAngle += (Math.random() - 0.5) * agent.wanderTurnRate * 2 * speedMult * dtScale;

      const nextX = agent.anchorX + Math.cos(agent.wanderAngle) * agent.wanderSpeed * speedMult * dtScale;
      const nextY = agent.anchorY + Math.sin(agent.wanderAngle) * agent.wanderSpeed * speedMult * dtScale;
      if (isInsideFrac(nextX, nextY)) {
        agent.anchorX = nextX;
        agent.anchorY = nextY;
      } else {
        agent.wanderAngle += Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.5;
      }

      const homeDistX = agent.homeX - agent.anchorX;
      const homeDistY = agent.homeY - agent.anchorY;
      const homeDist = Math.sqrt(homeDistX * homeDistX + homeDistY * homeDistY);
      if (homeDist > 0.4) {
        agent.anchorX += homeDistX * 0.001 * dtScale;
        agent.anchorY += homeDistY * 0.001 * dtScale;
      }

      agent.x = agent.anchorX;
      agent.y = agent.anchorY;

      const dxRaw = agent.x - mouse.x;
      const dyRaw = agent.y - mouse.y;
      const dxScaled = dxRaw * aspectRatio;
      const dist = Math.sqrt(dxScaled * dxScaled + dyRaw * dyRaw);

      const upLerp = 1 - Math.pow(0.85, dtScale);
      const downLerp = 1 - Math.pow(0.9, dtScale);
      if (dist < AXELROD.mouseRadius) {
        const influence = 1 - dist / AXELROD.mouseRadius;
        agent.mouseInfluence += (influence - agent.mouseInfluence) * upLerp;
        if (dist > 0) {
          const pushMag = influence * AXELROD.mousePush * dtScale;
          agent.x += (dxScaled / dist) * pushMag / aspectRatio;
          agent.y += (dyRaw / dist) * pushMag;
        }
      } else {
        agent.mouseInfluence += (0 - agent.mouseInfluence) * downLerp;
      }

      if (agent.mouseInfluence > 0.05 && Math.random() < agent.mouseInfluence * 0.02 * dtScale) {
        const traitIdx = Math.floor(Math.random() * AXELROD.F);
        const currentVal = agent.culture[traitIdx];
        const shift = Math.floor(Math.random() * 3) - 1;
        agent.culture[traitIdx] = Math.max(0, Math.min(AXELROD.Q - 1, currentVal + shift));
      }

      const targetColor = getColorForCulture(agent.culture, palette);
      const colorLerp = 1 - Math.pow(0.985, dtScale);
      for (let i = 0; i < 3; i += 1) {
        agent.currentColor[i] += (targetColor[i] - agent.currentColor[i]) * colorLerp;
      }

      const sizeLerp = 1 - Math.pow(0.97, dtScale);
      const targetSize = agent.baseSize * (1 + agent.mouseInfluence * 0.5);
      agent.size += (targetSize - agent.size) * sizeLerp;

    }

    function drawAgent(agent: Agent) {
      if (!isInsideFrac(agent.anchorX, agent.anchorY)) return;
      const checkDist = 0.008;
      const checkDistX = checkDist / aspectRatio;
      let insideCount = 1;
      if (isInsideFrac(agent.x + checkDistX, agent.y)) insideCount += 1;
      if (isInsideFrac(agent.x - checkDistX, agent.y)) insideCount += 1;
      if (isInsideFrac(agent.x, agent.y + checkDist)) insideCount += 1;
      if (isInsideFrac(agent.x, agent.y - checkDist)) insideCount += 1;
      const targetEdgeScale = insideCount / 5;
      agent.edgeFade += (targetEdgeScale - agent.edgeFade) * 0.02;

      const drawX = agent.x * size.width;
      const drawY = agent.y * size.height;
      const avgSize = (size.width + size.height) / 2;
      const drawSize = agent.size * avgSize * 0.58 * agent.edgeFade;
      let [r, g, b] = agent.currentColor.map((v) => Math.floor(v));
      const maxChan = Math.max(r, g, b);
      if (maxChan > 185) {
        const scale = 185 / maxChan;
        r = Math.floor(r * scale);
        g = Math.floor(g * scale);
        b = Math.floor(b * scale);
      }
      const alpha = Math.min(1, agent.opacity + agent.mouseInfluence * 0.3);

      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(drawX, drawY, drawSize, 0, Math.PI * 2);
      ctx.fill();
    }

    function generateAgents() {
      const nextAgents: Agent[] = [];
      if (!maskLoaded || !maskImageData) return nextAgents;

      let created = 0;
      let attempts = 0;
      const palette = colorPalettes.day;
      while (created < AGENT_COUNT && attempts < AGENT_COUNT * 8) {
        const x = Math.random();
        const y = Math.random();
        attempts += 1;
        if (!isInsideFrac(x, y)) continue;
        const culture = new Array(AXELROD.F).fill(0).map(() => Math.floor(Math.random() * AXELROD.Q));
        nextAgents.push({
          anchorX: x,
          anchorY: y,
          x,
          y,
          baseSize: 0.012 + Math.random() * 0.008,
          size: 0.012 + Math.random() * 0.008,
          seed: Math.random() * 1000,
          driftSpeed: 0.2 + Math.random() * 0.3,
          opacity: 0.5 + Math.random() * 0.3,
          mouseInfluence: 0,
          edgeFade: 1,
          culture,
          currentColor: getColorForCulture(culture, palette),
          wanderAngle: Math.random() * Math.PI * 2,
          wanderSpeed: 0.0004 + Math.random() * 0.0016,
          wanderTurnRate: 0.02 + Math.random() * 0.03,
          homeX: x,
          homeY: y,
        });
        created += 1;
      }
      return nextAgents;
    }

    function animate(time: number) {
      if (!running) return;
      frameCount += 1;
      const progress = (time % SUN_CYCLE_MS) / SUN_CYCLE_MS;
      const palette = getCurrentPalette(progress);

      if (frameCount % 20 === 0 && paletteCallbackRef.current) {
        const avg: RGB = [0, 0, 0];
        for (const c of palette) {
          avg[0] += c[0];
          avg[1] += c[1];
          avg[2] += c[2];
        }
        const len = palette.length;
        paletteCallbackRef.current([avg[0] / len, avg[1] / len, avg[2] / len]);
      }

      const dtScale = 1;
      const mouseLerp = 1 - Math.pow(0.85, dtScale);
      mouse.x += (mouse.targetX - mouse.x) * mouseLerp;
      mouse.y += (mouse.targetY - mouse.y) * mouseLerp;

      ctx.clearRect(0, 0, size.width, size.height);
      if (frameCount % 4 === 0) {
        buildSpatialHash();
        for (let i = 0; i < agents.length; i += 1) {
          axelrodUpdate(agents[i], dtScale);
        }
      }
      for (let i = 0; i < agents.length; i += 1) {
        updateAgent(agents[i], time, palette, dtScale);
        drawAgent(agents[i]);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(animate);
    }

    function buildAll() {
      setupCanvas();
      if (!maskLoaded) return;
      setupMaskCanvas();
      agents = generateAgents();
    }

    const ro = new ResizeObserver(() => buildAll());

    function onPointerMove(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) / Math.max(1, rect.width);
      mouse.targetY = (e.clientY - rect.top) / Math.max(1, rect.height);
    }

    function onPointerLeave() {
      mouse.targetX = -10;
      mouse.targetY = -10;
    }

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);

    maskImage.onload = () => {
      maskLoaded = true;
      buildAll();
      if (!raf) raf = requestAnimationFrame(animate);
    };

    maskImage.onerror = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    buildAll();
    ro.observe(host);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <span
      className={`inline-block align-baseline h-[0.92em] w-[2.9em] max-w-full ${className}`}
      aria-label="Humans and logo"
      role="img"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </span>
  );
}
