/**
 * k8sBackground.js - "Living Cloud-Native Galaxy & Interactive Mesh"
 *
 * A playful, fun, high-energy background for KubeCon SLC:
 *  - Floating, buoyant cloud-native Pods & Microservices with orbiting Envoy sidecars
 *  - Dynamic elastic network beams that morph as pods drift
 *  - High-speed neon-green glowing comets (data packets) with sparkling tails
 *  - Microservice fan-out bursts and energetic starburst arrival pops
 *  - Interactive mouse dynamics: cursor acts as a Client Gateway, sending packets to nearby pods
 *  - Click ripple shockwaves sending data packet bursts across the cluster
 *  - Non-blocking pointer events with zero interference on conference UI
 */

export class K8sFunGalaxyBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`[K8sBackground] Canvas #${canvasId} not found.`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;

    // Simulation collections
    this.nodes = [];
    this.packets = [];
    this.particles = [];
    this.shockwaves = [];

    // Configuration
    this.maxDistance = 220; // max connection distance between nodes
    this.maxPackets = 40;
    this.spawnTimer = 0;
    this.fanoutTimer = 0;
    this.lastTime = performance.now();
    this.isRunning = false;

    // Mouse / Client Gateway interaction
    this.mouse = { x: -1000, y: -1000, active: false, clientTetherNodes: [] };
    this.mousePacketTimer = 0;

    // Reduced motion check
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Window-level mouse tracking so background interacts without blocking UI clicks
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.active = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    // Clicking anywhere on the background triggers an energetic cluster ping shockwave
    window.addEventListener('pointerdown', (e) => {
      // Don't trigger if user clicked an interactive control (button, input, link, card)
      const targetTag = e.target.tagName.toLowerCase();
      if (['button', 'input', 'a', 'select', 'textarea'].includes(targetTag) || e.target.closest('button, a, input, .venue-card, .search-dropdown-menu, .schedule-drawer')) {
        return;
      }
      this.triggerShockwave(e.clientX, e.clientY);
    });

    // Tab visibility handling
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

    this.maxDistance = Math.max(170, Math.min(260, this.width * 0.16));
    this.createClusterEcosystem();

    if (this.reducedMotion) {
      this.drawStaticFrame();
    }
  }

  createClusterEcosystem() {
    this.nodes = [];
    this.packets = [];
    this.particles = [];
    this.shockwaves = [];

    const w = this.width;
    const h = this.height;

    // Determine number of buoyant pods based on screen real estate
    const nodeCount = Math.max(16, Math.min(32, Math.floor((w * h) / 45000)));

    const archetypes = [
      {
        type: 'control-plane',
        name: 'K8s Master',
        radius: 20,
        color: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.65)',
        halo: 'rgba(14, 165, 233, 0.25)',
        hasSatellites: 2,
        hasHelm: true
      },
      {
        type: 'service',
        name: 'Microservice Pod',
        radius: 14,
        color: '#818cf8',
        glow: 'rgba(129, 140, 248, 0.60)',
        halo: 'rgba(99, 102, 241, 0.20)',
        hasSatellites: 1,
        hasHelm: false
      },
      {
        type: 'worker',
        name: 'Worker Node',
        radius: 12,
        color: '#34d399',
        glow: 'rgba(52, 211, 153, 0.60)',
        halo: 'rgba(16, 185, 129, 0.20)',
        hasSatellites: 1,
        hasHelm: false
      },
      {
        type: 'database',
        name: 'Stateful Store',
        radius: 15,
        color: '#fb923c',
        glow: 'rgba(251, 146, 60, 0.65)',
        halo: 'rgba(234, 88, 12, 0.20)',
        hasSatellites: 1,
        hasHelm: false
      }
    ];

    // Distribute preferentially towards perimeter and corners (leaving central UI stage open)
    for (let i = 0; i < nodeCount; i++) {
      // Pick archetype
      let arch = archetypes[1]; // default service
      if (i % 5 === 0) arch = archetypes[0]; // K8s master
      else if (i % 4 === 0) arch = archetypes[3]; // Stateful store
      else if (i % 2 === 0) arch = archetypes[2]; // Worker node

      let x, y;
      const margin = 60;

      // 4 Distinct Perimeter Zones: Top-Left, Top-Right, Bottom-Left, Bottom-Right
      const zone = i % 4;
      if (zone === 0) { // Top-Left flank & corner
        x = margin + Math.random() * (w * 0.28 - margin);
        y = margin + Math.random() * (h * 0.45 - margin);
      } else if (zone === 1) { // Top-Right flank & corner
        x = w * 0.72 + Math.random() * (w * 0.28 - margin);
        y = margin + Math.random() * (h * 0.45 - margin);
      } else if (zone === 2) { // Bottom-Left flank & footer
        x = margin + Math.random() * (w * 0.32 - margin);
        y = h * 0.65 + Math.random() * (h * 0.35 - margin);
      } else { // Bottom-Right flank & footer
        x = w * 0.68 + Math.random() * (w * 0.32 - margin);
        y = h * 0.65 + Math.random() * (h * 0.35 - margin);
      }

      this.nodes.push({
        id: `node-${i}`,
        type: arch.type,
        x: x,
        y: y,
        homeX: x,
        homeY: y,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: arch.radius,
        color: arch.color,
        glow: arch.glow,
        halo: arch.halo,
        hasSatellites: arch.hasSatellites,
        hasHelm: arch.hasHelm,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpeed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
        energyLevel: 1.0, // flashes on packet reception
        connections: []
      });
    }

    // Pre-seed some packets in flight
    for (let i = 0; i < 18; i++) {
      const a = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      const b = this.nodes[Math.floor(Math.random() * this.nodes.length)];
      if (a !== b) {
        this.spawnPacket(a, b, Math.random() * 0.9);
      }
    }
  }

  triggerShockwave(x, y) {
    this.shockwaves.push({
      x: x,
      y: y,
      radius: 5,
      maxRadius: 280,
      opacity: 0.95,
      speed: 450
    });

    // Create a burst of energetic sparks at click point
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1.0,
        color: '#00ff88',
        size: 2.5 + Math.random() * 2
      });
    }

    // Ping all nodes within shockwave radius to fire packets
    this.nodes.forEach((node) => {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < 260) {
        node.energyLevel = 2.0;
        // Broadcast packets along all its connections
        node.connections.forEach((target) => {
          this.spawnPacket(node, target, 0);
        });
      }
    });
  }

  spawnPacket(source, target, progress = 0) {
    if (this.packets.length >= this.maxPackets) return;

    const dist = Math.hypot(target.x - source.x, target.y - source.y);
    if (dist <= 0) return;

    // Fast and snappy packet speeds
    const speed = (180 + Math.random() * 120) / dist;

    const packet = {
      from: source,
      to: target,
      progress: progress,
      speed: speed,
      size: 4.5 + Math.random() * 1.5,
      trail: [],
      maxTrail: 8,
      color: '#00ff88',
      core: '#f0fdf4',
      glow: '#22c55e'
    };

    if (progress > 0) {
      const px = source.x + (target.x - source.x) * progress;
      const py = source.y + (target.y - source.y) * progress;
      packet.trail.push({ x: px, y: py });
    }

    this.packets.push(packet);
  }

  update(dt, timestamp) {
    if (this.reducedMotion) return;

    const w = this.width;
    const h = this.height;

    // 1. Update Floating Nodes with buoyant spring physics
    this.nodes.forEach((node) => {
      // Gentle drift
      node.x += node.vx;
      node.y += node.vy;

      // Soft spring tether towards home anchor to maintain balanced distribution
      const dxHome = node.homeX - node.x;
      const dyHome = node.homeY - node.y;
      node.vx += dxHome * 0.00035;
      node.vy += dyHome * 0.00035;

      // Dampen velocity
      node.vx *= 0.99;
      node.vy *= 0.99;

      // Boundary soft bounce
      const pad = 40;
      if (node.x < pad) { node.x = pad; node.vx = Math.abs(node.vx); }
      if (node.x > w - pad) { node.x = w - pad; node.vx = -Math.abs(node.vx); }
      if (node.y < pad) { node.y = pad; node.vy = Math.abs(node.vy); }
      if (node.y > h - pad) { node.y = h - pad; node.vy = -Math.abs(node.vy); }

      // Keep center UI stage (title + venue cards) clear and legible
      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const dxCenter = node.x - centerX;
      const dyCenter = node.y - centerY;
      const distCenter = Math.hypot(dxCenter, dyCenter);
      const minCenterDist = Math.min(w * 0.30, 360);
      if (distCenter < minCenterDist && distCenter > 0) {
        const push = (1 - distCenter / minCenterDist) * 1.6;
        node.vx += (dxCenter / distCenter) * push;
        node.vy += (dyCenter / distCenter) * push;
      }

      // Orbiting Envoy satellites
      node.orbitAngle += node.orbitSpeed;

      // Decay energy pulse back to baseline 1.0
      if (node.energyLevel > 1.0) {
        node.energyLevel = Math.max(1.0, node.energyLevel - dt * 2.2);
      }

      // Mouse gentle repulsion (pods playfully swim away from cursor)
      if (this.mouse.active) {
        const mouseDist = Math.hypot(node.x - this.mouse.x, node.y - this.mouse.y);
        if (mouseDist < 120 && mouseDist > 0) {
          const force = (1 - mouseDist / 120) * 1.8;
          const nx = (node.x - this.mouse.x) / mouseDist;
          const ny = (node.y - this.mouse.y) / mouseDist;
          node.vx += nx * force;
          node.vy += ny * force;
        }
      }
    });

    // 2. Recompute dynamic mesh connections
    this.nodes.forEach((node) => {
      node.connections = [];
    });

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d < this.maxDistance) {
          a.connections.push(b);
          b.connections.push(a);
        }
      }
    }

    // 3. Mouse "Client Gateway" - Find nearest pods to user cursor
    this.mouse.clientTetherNodes = [];
    if (this.mouse.active) {
      const sortedByMouse = [...this.nodes]
        .map((n) => ({ node: n, dist: Math.hypot(n.x - this.mouse.x, n.y - this.mouse.y) }))
        .sort((a, b) => a.dist - b.dist);

      // Tether to the 2 closest pods within 280px
      for (let i = 0; i < Math.min(2, sortedByMouse.length); i++) {
        if (sortedByMouse[i].dist < 280) {
          this.mouse.clientTetherNodes.push(sortedByMouse[i].node);
        }
      }

      // Stream user client request packets to tethered pods!
      if (timestamp - this.mousePacketTimer > 180 && this.mouse.clientTetherNodes.length > 0) {
        const target = this.mouse.clientTetherNodes[Math.floor(Math.random() * this.mouse.clientTetherNodes.length)];
        const virtualClientNode = { x: this.mouse.x, y: this.mouse.y, type: 'client' };
        this.spawnPacket(virtualClientNode, target, 0);
        this.mousePacketTimer = timestamp;
      }
    }

    // 4. Autonomous Packet Spawner
    if (timestamp - this.spawnTimer > 160) {
      // Pick a random node with connections
      const connectedNodes = this.nodes.filter((n) => n.connections.length > 0);
      if (connectedNodes.length > 0) {
        const source = connectedNodes[Math.floor(Math.random() * connectedNodes.length)];
        const target = source.connections[Math.floor(Math.random() * source.connections.length)];
        this.spawnPacket(source, target, 0);
      }
      this.spawnTimer = timestamp;
    }

    // 5. Periodic Microservice Fanout Rush (fun cloud-native burst)
    if (timestamp - this.fanoutTimer > 3200) {
      const masters = this.nodes.filter((n) => n.type === 'control-plane' && n.connections.length >= 2);
      if (masters.length > 0) {
        const master = masters[Math.floor(Math.random() * masters.length)];
        master.energyLevel = 2.4;
        master.connections.forEach((target) => {
          this.spawnPacket(master, target, 0);
        });
      }
      this.fanoutTimer = timestamp;
    }

    // 6. Update Packets
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];
      p.progress += p.speed * dt;

      const px = p.from.x + (p.to.x - p.from.x) * p.progress;
      const py = p.from.y + (p.to.y - p.from.y) * p.progress;

      p.trail.unshift({ x: px, y: py });
      if (p.trail.length > p.maxTrail) {
        p.trail.pop();
      }

      // Check arrival
      if (p.progress >= 1.0) {
        // Trigger arrival starburst & node pulse
        p.to.energyLevel = Math.min(2.5, (p.to.energyLevel || 1.0) + 0.35);

        // Starburst sparks
        const sparkCount = 6;
        for (let s = 0; s < sparkCount; s++) {
          const angle = (Math.PI * 2 * s) / sparkCount + Math.random() * 0.4;
          const spd = 25 + Math.random() * 45;
          this.particles.push({
            x: p.to.x,
            y: p.to.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            alpha: 1.0,
            color: '#00ff88',
            size: 2.0 + Math.random() * 1.5
          });
        }

        this.packets.splice(i, 1);
      }
    }

    // 7. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.alpha -= dt * 2.2;
      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 8. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.opacity -= dt * 1.5;
      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  render(timestamp) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Dynamic Living Mesh Conduits
    this.renderConduits(ctx);

    // 2. Draw Client Gateway Beam to Mouse
    this.renderMouseClientBeam(ctx);

    // 3. Draw Shockwaves
    this.renderShockwaves(ctx);

    // 4. Draw Neon Green Comets (Packets) & Trails
    this.renderPackets(ctx);

    // 5. Draw Arrival Starburst Sparks
    this.renderParticles(ctx);

    // 6. Draw Buoyant Cloud-Native Pods with Orbiting Envoy Sidecars
    this.renderPods(ctx, timestamp);
  }

  renderConduits(ctx) {
    ctx.save();
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (const b of a.connections) {
        if (a.id > b.id) continue; // draw each edge once

        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const alpha = Math.max(0, (1 - dist / this.maxDistance) * 0.38);

        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        // Subtle glowing midpoint signal
        if (dist < this.maxDistance * 0.65) {
          const midX = (a.x + b.x) * 0.5;
          const midY = (a.y + b.y) * 0.5;
          ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 1.4})`;
          ctx.beginPath();
          ctx.arc(midX, midY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  renderMouseClientBeam(ctx) {
    if (!this.mouse.active || this.mouse.clientTetherNodes.length === 0) return;

    ctx.save();
    // Glowing beam from user cursor to tethered pods
    for (const target of this.mouse.clientTetherNodes) {
      const dist = Math.hypot(target.x - this.mouse.x, target.y - this.mouse.y);
      const alpha = Math.max(0, 1 - dist / 280) * 0.65;

      const grad = ctx.createLinearGradient(this.mouse.x, this.mouse.y, target.x, target.y);
      grad.addColorStop(0, `rgba(0, 255, 136, ${alpha})`);
      grad.addColorStop(1, `rgba(56, 189, 248, ${alpha * 0.5})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.mouse.x, this.mouse.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }

    // Client Cursor Hub
    ctx.setLineDash([]);
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.mouse.x, this.mouse.y, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderShockwaves(ctx) {
    if (this.shockwaves.length === 0) return;
    ctx.save();
    for (const sw of this.shockwaves) {
      ctx.strokeStyle = `rgba(0, 255, 136, ${Math.max(0, sw.opacity)})`;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
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

      // Draw sparkling neon-green comet tail
      if (p.trail.length > 1) {
        for (let t = 1; t < p.trail.length; t++) {
          const pt1 = p.trail[t - 1];
          const pt2 = p.trail[t];
          const fade = 1 - t / p.trail.length;

          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.strokeStyle = `rgba(0, 255, 136, ${fade * 0.85})`;
          ctx.lineWidth = p.size * (0.95 - t * 0.08);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      // Neon-green comet head with high bloom
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // White-hot energy core
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.core;
      ctx.beginPath();
      ctx.arc(head.x, head.y, p.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderParticles(ctx) {
    if (this.particles.length === 0) return;
    ctx.save();
    for (const pt of this.particles) {
      ctx.fillStyle = `rgba(0, 255, 136, ${Math.max(0, pt.alpha)})`;
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderPods(ctx, timestamp) {
    for (const node of this.nodes) {
      this.drawPod(ctx, node, timestamp);
    }
  }

  drawPod(ctx, node, timestamp) {
    const { x, y, radius, color, glow, halo, type, hasSatellites, hasHelm, orbitAngle, energyLevel } = node;

    const currentRadius = radius * (1.0 + (energyLevel - 1.0) * 0.25);

    // 1. Soft Ambient Halo
    ctx.save();
    const haloRadius = currentRadius * 2.8 * energyLevel;
    const radial = ctx.createRadialGradient(x, y, 2, x, y, haloRadius);
    radial.addColorStop(0, halo);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Outer Status Pulse Ring
    ctx.save();
    const pulseRing = currentRadius + 6 + 3 * Math.sin(timestamp * 0.003 + node.pulsePhase);
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * energyLevel})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, pulseRing, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Main Pod Body (Hexagon for service/master, circle for worker)
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14 * energyLevel;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'; // deep dark core
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.0;

    if (type === 'control-plane' || type === 'service') {
      this.drawHexagon(ctx, x, y, currentRadius);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 4. Inner Icon / Logo
    if (hasHelm) {
      // Rotating Kubernetes Steering Helm
      this.drawMiniHelm(ctx, x, y, currentRadius * 0.65, timestamp * 0.001);
    } else if (type === 'database') {
      // Cylindrical stateful disk icon
      this.drawDatabaseIcon(ctx, x, y, currentRadius * 0.55);
    } else {
      // Microservice core indicator
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, currentRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 5. Orbiting Envoy Sidecar Proxies
    if (hasSatellites > 0) {
      ctx.save();
      const orbitR = currentRadius + 14;

      for (let s = 0; s < hasSatellites; s++) {
        const ang = orbitAngle + (s * Math.PI * 2) / hasSatellites;
        const satX = x + Math.cos(ang) * orbitR;
        const satY = y + Math.sin(ang) * orbitR;

        // Satellite Envoy Dot
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(satX, satY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(satX, satY, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawHexagon(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  drawMiniHelm(ctx, cx, cy, radius, rotation) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.3;

    const spokes = 7;
    for (let i = 0; i < spokes; i++) {
      const ang = (i * Math.PI * 2) / spokes;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * radius, Math.sin(ang) * radius);
      ctx.stroke();

      // Outer spoke tip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * radius * 1.15, Math.sin(ang) * radius * 1.15, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center hub
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawDatabaseIcon(ctx, cx, cy, radius) {
    ctx.save();
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.4;

    const w = radius * 1.2;
    const h = radius * 0.45;

    // 2 stacked cylinders
    ctx.beginPath();
    ctx.ellipse(cx, cy - h * 0.7, w * 0.6, h * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.7, w * 0.6, h * 0.5, 0, 0, Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.6, cy - h * 0.7);
    ctx.lineTo(cx - w * 0.6, cy + h * 0.7);
    ctx.moveTo(cx + w * 0.6, cy - h * 0.7);
    ctx.lineTo(cx + w * 0.6, cy + h * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  drawStaticFrame() {
    this.render(0);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (now) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

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
  return new K8sFunGalaxyBackground(canvasId);
}

export { K8sFunGalaxyBackground as K8sTopologyBackground };

