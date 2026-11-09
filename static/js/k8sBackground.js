/**
 * k8sBackground.js
 * Renders an interactive animated Kubernetes cluster topology on a 2D canvas in the website background.
 * Features:
 *  - Interconnected Kubernetes master nodes (isometric glowing blue cubes with K8s helm logo)
 *  - Peripheral worker/etcd nodes (isometric glowing orange cubes with minimalist lock emblems)
 *  - Network conduits connecting intra-cluster nodes and inter-cluster backbones
 *  - Pre-seeded and continuous animated neon-green glowing "packets" traversing connections
 *  - Dynamic packet motion trails, arrival ripple animations, and node glow breathing
 *  - DPI-aware, responsive resizing, and battery-friendly tab visibility handling
 */

export class K8sTopologyBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`[K8sBackground] Canvas with id "${canvasId}" not found.`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;

    this.clusters = [];
    this.nodes = [];
    this.edges = [];
    this.packets = [];
    this.ripples = [];

    this.maxPackets = 30;
    this.lastSpawnTime = 0;
    this.spawnInterval = 180; // ms between random packet spawns
    this.lastFrameTime = performance.now();
    this.animationFrameId = null;
    this.isRunning = false;

    // Check prefers-reduced-motion
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Pause when page is hidden to save GPU/battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.start();
  }

  resize() {
    const rect = this.canvas.parentElement
      ? this.canvas.parentElement.getBoundingClientRect()
      : { width: window.innerWidth, height: window.innerHeight };

    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.buildTopology();

    if (this.reducedMotion) {
      this.drawStaticFrame();
    }
  }

  buildTopology() {
    this.clusters = [];
    this.nodes = [];
    this.edges = [];
    this.packets = [];
    this.ripples = [];

    const w = this.width;
    const h = this.height;

    // Responsive scale factor for node sizes and spacing
    const scale = Math.max(0.75, Math.min(1.25, Math.min(w / 1440, h / 900)));

    // 4 Cluster Hub locations placed strategically in quadrants to frame central UI
    const clusterPositions = [
      { rx: 0.16, ry: 0.23, id: 'cluster-west-1' },    // Top-Left
      { rx: 0.84, ry: 0.20, id: 'cluster-east-1' },    // Top-Right
      { rx: 0.15, ry: 0.82, id: 'cluster-west-2' },    // Bottom-Left
      { rx: 0.84, ry: 0.80, id: 'cluster-east-2' }     // Bottom-Right
    ];

    // If screen is wide enough, add a subtle central-bottom micro-cluster
    if (w > 1200) {
      clusterPositions.push({ rx: 0.50, ry: 0.88, id: 'cluster-core-slc' });
    }

    // Peripheral offset templates in isometric projection angles
    const workerOffsetTemplates = [
      { dx: -70, dy: -36 },
      { dx: 72, dy: -34 },
      { dx: 76, dy: 38 },
      { dx: -68, dy: 44 },
      { dx: 0, dy: -70 },
      { dx: 0, dy: 68 }
    ];

    clusterPositions.forEach((cp, cIndex) => {
      const masterX = Math.round(w * cp.rx);
      const masterY = Math.round(h * cp.ry);

      // Central Kubernetes Master Node
      const masterNode = {
        id: `master-${cIndex}`,
        clusterIndex: cIndex,
        type: 'master',
        x: masterX,
        y: masterY,
        size: Math.round(25 * scale),
        height: Math.round(28 * scale),
        pulseOffset: Math.random() * Math.PI * 2,
        colors: {
          top: '#60a5fa',
          left: '#2563eb',
          right: '#1d4ed8',
          stroke: 'rgba(191, 219, 254, 0.95)',
          glow: 'rgba(37, 99, 235, 0.55)'
        }
      };
      this.nodes.push(masterNode);

      // Peripheral Worker/etcd nodes (4 to 5 per cluster)
      const workerCount = cIndex === 4 ? 3 : 4 + (cIndex % 2);
      const clusterWorkers = [];

      for (let i = 0; i < workerCount; i++) {
        const offset = workerOffsetTemplates[i % workerOffsetTemplates.length];
        const workerX = Math.round(masterX + offset.dx * scale);
        const workerY = Math.round(masterY + offset.dy * scale);

        const workerNode = {
          id: `worker-${cIndex}-${i}`,
          clusterIndex: cIndex,
          type: 'worker',
          x: workerX,
          y: workerY,
          size: Math.round(16 * scale),
          height: Math.round(18 * scale),
          pulseOffset: Math.random() * Math.PI * 2,
          colors: {
            top: '#fb923c',
            left: '#f97316',
            right: '#ea580c',
            stroke: 'rgba(254, 215, 170, 0.95)',
            glow: 'rgba(249, 115, 22, 0.50)'
          }
        };
        this.nodes.push(workerNode);
        clusterWorkers.push(workerNode);

        // Intra-cluster edge: Master <-> Worker
        this.edges.push({
          from: masterNode,
          to: workerNode,
          type: 'intra',
          length: Math.hypot(workerX - masterX, workerY - masterY)
        });
      }

      this.clusters.push({
        master: masterNode,
        workers: clusterWorkers
      });
    });

    // Inter-cluster backbone edges (connecting the clusters into an interconnected mesh)
    if (this.clusters.length >= 2) {
      // Connect adjacent clusters
      this.addEdgeBetween(this.clusters[0].master, this.clusters[1].master, 'backbone');
      if (this.clusters[2]) {
        this.addEdgeBetween(this.clusters[0].master, this.clusters[2].master, 'backbone');
      }
      if (this.clusters[3]) {
        this.addEdgeBetween(this.clusters[1].master, this.clusters[3].master, 'backbone');
      }
      if (this.clusters[2] && this.clusters[3]) {
        this.addEdgeBetween(this.clusters[2].master, this.clusters[3].master, 'backbone');
      }

      // Connect peripheral worker bridge links for cross-cluster realism
      if (this.clusters[0].workers[1] && this.clusters[1].workers[0]) {
        this.addEdgeBetween(this.clusters[0].workers[1], this.clusters[1].workers[0], 'bridge');
      }
      if (this.clusters[2] && this.clusters[3] && this.clusters[2].workers[1] && this.clusters[3].workers[0]) {
        this.addEdgeBetween(this.clusters[2].workers[1], this.clusters[3].workers[0], 'bridge');
      }

      // If central micro-cluster exists, connect it to left and right lower clusters
      if (this.clusters[4]) {
        if (this.clusters[2]) this.addEdgeBetween(this.clusters[4].master, this.clusters[2].master, 'backbone');
        if (this.clusters[3]) this.addEdgeBetween(this.clusters[4].master, this.clusters[3].master, 'backbone');
      }
    }

    // Pre-seed 16 active packets distributed mid-flight so background is immediately bustling
    if (!this.reducedMotion && this.edges.length > 0) {
      for (let i = 0; i < 16; i++) {
        this.spawnPacket(0.1 + Math.random() * 0.8);
      }
    }
  }

  addEdgeBetween(nodeA, nodeB, type = 'backbone') {
    if (!nodeA || !nodeB) return;
    this.edges.push({
      from: nodeA,
      to: nodeB,
      type: type,
      length: Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y)
    });
  }

  spawnPacket(initialProgress = 0) {
    if (this.edges.length === 0 || this.packets.length >= this.maxPackets) return;

    // Pick a random edge
    const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
    // Randomize direction
    const reverse = Math.random() > 0.5;
    const from = reverse ? edge.to : edge.from;
    const to = reverse ? edge.from : edge.to;

    // Packets travel at a speed proportional to distance (faster on long backbone lines)
    const baseSpeed = edge.type === 'backbone' ? 0.32 : 0.50;
    const speed = baseSpeed + Math.random() * 0.28;
    const isBackbone = edge.type === 'backbone';

    const p = {
      from: from,
      to: to,
      progress: initialProgress,
      speed: speed,
      size: isBackbone ? 5.2 + Math.random() * 1.5 : 3.8 + Math.random() * 1.2,
      trail: [],
      maxTrail: isBackbone ? 10 : 7,
      color: '#22c55e',
      coreColor: '#f0fdf4',
      glowColor: '#00ff88',
      type: edge.type
    };

    // If pre-seeded with progress, set initial position and trail points
    if (initialProgress > 0) {
      const initX = from.x + (to.x - from.x) * initialProgress;
      const initY = from.y + (to.y - from.y) * initialProgress;
      const dx = (to.x - from.x) * 0.03;
      const dy = (to.y - from.y) * 0.03;
      for (let t = 0; t < 5; t++) {
        p.trail.push({ x: initX - dx * t, y: initY - dy * t });
      }
    }

    this.packets.push(p);
  }

  update(dt, timestamp) {
    if (this.reducedMotion) return;

    // Packet Spawner
    if (timestamp - this.lastSpawnTime > this.spawnInterval) {
      this.spawnPacket(0);
      this.lastSpawnTime = timestamp;
      // Slight jitter in next spawn interval for organic rhythm
      this.spawnInterval = 140 + Math.random() * 220;
    }

    // Update Packets
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.progress += p.speed * dt;

      // Current position
      const currX = p.from.x + (p.to.x - p.from.x) * p.progress;
      const currY = p.from.y + (p.to.y - p.from.y) * p.progress;

      // Store trail history
      p.trail.unshift({ x: currX, y: currY });
      if (p.trail.length > p.maxTrail) {
        p.trail.pop();
      }

      // Check arrival
      if (p.progress >= 1.0) {
        // Trigger arrival ripple
        this.ripples.push({
          x: p.to.x,
          y: p.to.y,
          radius: 3,
          maxRadius: p.to.type === 'master' ? 24 : 16,
          alpha: 0.95,
          color: '#22c55e'
        });

        this.packets.splice(i, 1);
      }
    }

    // Update Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += dt * 42;
      r.alpha -= dt * 2.0;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  render(timestamp) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Network Conduits / Connections
    this.renderEdges(ctx);

    // 2. Draw Ripples
    this.renderRipples(ctx);

    // 3. Draw Active Neon Green Packets
    this.renderPackets(ctx);

    // 4. Draw Glowing Isometric Cubes & K8s Emblem
    this.renderNodes(ctx, timestamp);
  }

  renderEdges(ctx) {
    ctx.save();
    for (const edge of this.edges) {
      ctx.beginPath();
      ctx.moveTo(edge.from.x, edge.from.y);
      ctx.lineTo(edge.to.x, edge.to.y);

      if (edge.type === 'backbone') {
        // Inter-cluster trunk lines: slightly brighter cyan/blue conduit
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.42)';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([8, 6]);
      } else if (edge.type === 'bridge') {
        // Secondary cross-links
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.30)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
      } else {
        // Intra-cluster links: solid subtle conduit
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([]);
      }
      ctx.stroke();

      // Draw subtle terminal dots at edge midpoint for cybernetic circuit feel
      if (edge.type === 'backbone') {
        const midX = (edge.from.x + edge.to.x) * 0.5;
        const midY = (edge.from.y + edge.to.y) * 0.5;
        ctx.fillStyle = 'rgba(96, 165, 250, 0.55)';
        ctx.beginPath();
        ctx.arc(midX, midY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  renderRipples(ctx) {
    if (this.ripples.length === 0) return;
    ctx.save();
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(34, 197, 94, ${Math.max(0, r.alpha)})`;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderPackets(ctx) {
    if (this.packets.length === 0) return;
    ctx.save();

    for (const p of this.packets) {
      if (p.trail.length === 0) continue;

      const head = p.trail[0];

      // Draw neon green motion trail behind packet
      if (p.trail.length > 1) {
        for (let i = 1; i < p.trail.length; i++) {
          const t1 = p.trail[i - 1];
          const t2 = p.trail[i];
          const fade = 1 - (i / p.trail.length);

          ctx.beginPath();
          ctx.moveTo(t1.x, t1.y);
          ctx.lineTo(t2.x, t2.y);
          ctx.strokeStyle = `rgba(0, 255, 136, ${fade * 0.75})`;
          ctx.lineWidth = p.size * (1.0 - i * 0.07);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Draw Neon Green Packet Glow & Head
      ctx.shadowColor = p.glowColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // White-hot center core for high-energy look
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.coreColor;
      ctx.beginPath();
      ctx.arc(head.x, head.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderNodes(ctx, timestamp) {
    // Sort nodes so workers render before masters, giving clean layering
    const sortedNodes = [...this.nodes].sort((a, b) => {
      if (a.type === 'worker' && b.type === 'master') return -1;
      if (a.type === 'master' && b.type === 'worker') return 1;
      return a.y - b.y;
    });

    for (const node of sortedNodes) {
      // Gentle breathing glow oscillation
      const breath = 0.85 + 0.15 * Math.sin(timestamp * 0.0018 + node.pulseOffset);
      this.drawIsometricCube(ctx, node, breath);
    }
  }

  drawIsometricCube(ctx, node, breath = 1.0) {
    const { x, y, size, height, colors, type } = node;
    const w = size;
    const h = height;
    const isoH = size * 0.52; // isometric angle compression

    // 1. Soft radial bloom glow underneath/around the cube
    ctx.save();
    const glowRadius = Math.max(w, h) * (type === 'master' ? 2.6 : 2.1) * breath;
    const radial = ctx.createRadialGradient(x, y, 2, x, y, glowRadius);
    radial.addColorStop(0, colors.glow);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Left Face (parallelogram)
    ctx.save();
    ctx.fillStyle = colors.left;
    ctx.beginPath();
    ctx.moveTo(x - w, y - isoH);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w, y + h - isoH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 3. Right Face (parallelogram)
    ctx.save();
    ctx.fillStyle = colors.right;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y - isoH);
    ctx.lineTo(x + w, y + h - isoH);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 4. Top Face (rhombus)
    ctx.save();
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(x, y - isoH * 2);
    ctx.lineTo(x + w, y - isoH);
    ctx.lineTo(x, y);
    ctx.lineTo(x - w, y - isoH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // 5. Front Emblems: K8s Helm for master, padlock for worker/etcd
    if (type === 'master') {
      this.drawKubernetesHelm(ctx, x - w * 0.48, y + h * 0.46 - isoH * 0.5, size * 0.44);
    } else {
      this.drawPadlock(ctx, x - w * 0.48, y + h * 0.46 - isoH * 0.5, size * 0.28);
    }
  }

  drawKubernetesHelm(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    // Skew to align naturally with the isometric left plane
    ctx.transform(1, 0.5, 0, 1, 0, 0);

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 8;

    const spokes = 7;
    const step = (Math.PI * 2) / spokes;
    const outerR = radius;
    const innerR = radius * 0.50;
    const spokeR = radius * 1.25;

    // 7 Spoke handles radiating outward
    for (let i = 0; i < spokes; i++) {
      const angle = i * step - Math.PI / 2;
      const x1 = Math.cos(angle) * (outerR * 0.65);
      const y1 = Math.sin(angle) * (outerR * 0.65);
      const x2 = Math.cos(angle) * spokeR;
      const y2 = Math.sin(angle) * spokeR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Tiny round handle tip
      ctx.beginPath();
      ctx.arc(x2, y2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer wheel heptagon rim
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const angle = (i % spokes) * step - Math.PI / 2;
      const px = Math.cos(angle) * outerR;
      const py = Math.sin(angle) * outerR;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner hub circle
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawPadlock(ctx, cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.transform(1, 0.5, 0, 1, 0, 0); // isometric skew

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#fb923c';
    ctx.shadowBlur = 5;

    const w = radius * 1.3;
    const h = radius * 1.1;

    // Shackle (arch)
    ctx.beginPath();
    ctx.arc(0, -h * 0.42, w * 0.36, Math.PI, 0, false);
    ctx.stroke();

    // Lock body
    ctx.fillRect(-w * 0.5, -h * 0.38, w, h);

    // Keyhole
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(0, -h * 0.05, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-w * 0.07, -h * 0.05, w * 0.14, h * 0.28);

    ctx.restore();
  }

  drawStaticFrame() {
    this.render(0);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (now) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1); // clamp delta
      this.lastFrameTime = now;

      this.update(dt, now);
      this.render(now);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

/**
 * Convenience helper to initialize and bind the background canvas
 */
export function initK8sBackground(canvasId = 'k8s-topology-canvas') {
  return new K8sTopologyBackground(canvasId);
}
