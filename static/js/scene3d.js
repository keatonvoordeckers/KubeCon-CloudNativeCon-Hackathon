// Interactive 3D Floor Plan using Three.js (Salt Palace Level 2)

export class FloorPlan3D {
  constructor(containerElement, onRoomSelected) {
    this.container = containerElement;
    this.onRoomSelected = onRoomSelected;
    this.rooms = {};
    this.labels = {};
    this.roomData = [
      { id: '250 A-C', name: '250 A-C', x: -13, z: -6, w: 7.5, d: 5.5, h: 2.5 },
      { id: '250 D-F', name: '250 D-F', x: -13, z: 3, w: 7.5, d: 5.5, h: 2.5 },
      { id: '251 A-C', name: '251 A-C', x: -4, z: -6, w: 7.5, d: 5.5, h: 2.5 },
      { id: '251 D-F', name: '251 D-F', x: -4, z: 3, w: 7.5, d: 5.5, h: 2.5 },
      { id: '254', name: '254', x: 5, z: -6, w: 6.5, d: 5.5, h: 2.5 },
      { id: '255 A', name: '255 A', x: 13.5, z: -7.5, w: 5.5, d: 3.8, h: 2.5 },
      { id: '255 BC', name: '255 BC', x: 13.5, z: -2.8, w: 5.5, d: 4.8, h: 2.5 },
      { id: '255 D', name: '255 D', x: 13.5, z: 2.7, w: 5.5, d: 3.8, h: 2.5 },
      { id: '255 EF', name: '255 EF', x: 13.5, z: 7.5, w: 5.5, d: 4.8, h: 2.5 },
      // Quiet Rooms (Merge Forward track)
      { id: '260A', name: 'Quiet Room 260A', x: 5, z: 2, w: 4, d: 3.5, h: 2, isQuietRoom: true },
      { id: '260B', name: 'Quiet Room 260B', x: 5, z: 6.5, w: 4, d: 3.5, h: 2, isQuietRoom: true },
    ];

    this.selectedRoomId = null;
    this.hoveredRoomId = null;
    this.isAutoRotating = true;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep modern slate background

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 32, 28);
    this.camera.lookAt(0, 0, 0);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(20, 40, 20);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x6366f1, 1.2, 50);
    fillLight.position.set(-15, 15, -10);
    this.scene.add(fillLight);

    // 4. Ground Floor & Grid
    const floorGeo = new THREE.PlaneGeometry(42, 26);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(42, 28, 0x334155, 0x1e293b);
    grid.position.y = 0;
    this.scene.add(grid);

    // 5. Build Room Meshes
    this.buildRooms();

    // 6. Event Listeners
    this.setupEvents();

    // 7. Render Loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildRooms() {
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.roomData.forEach(info => {
      const geo = new THREE.BoxGeometry(info.w, info.h, info.d);
      
      let baseColor = 0x334155;
      let emissive = 0x000000;
      let roughness = 0.4;

      if (info.isQuietRoom) {
        baseColor = 0x059669; // Emerald green
        emissive = 0x047857;
        roughness = 0.2;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: roughness,
        metalness: 0.1,
        emissive: emissive,
        emissiveIntensity: info.isQuietRoom ? 0.3 : 0.05,
        transparent: true,
        opacity: 0.92
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(info.x, info.h / 2, info.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { ...info, count: 0, initialY: info.h / 2 };

      // Room border outline
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: info.isQuietRoom ? 0x34d399 : 0x64748b, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      mesh.add(wireframe);

      // Create floating 2D canvas sprite label
      const sprite = this.createRoomSprite(info.name, 0, info.isQuietRoom);
      sprite.position.set(0, info.h / 2 + 1.2, 0);
      mesh.add(sprite);

      this.rooms[info.id] = mesh;
      this.labels[info.id] = sprite;
      this.roomGroup.add(mesh);
    });
  }

  createRoomSprite(roomName, count, isQuietRoom = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    this.drawSpriteCanvas(ctx, roomName, count, isQuietRoom);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(4.5, 2.25, 1);
    sprite.userData = { canvas, ctx, texture, roomName, isQuietRoom };
    return sprite;
  }

  drawSpriteCanvas(ctx, roomName, count, isQuietRoom) {
    ctx.clearRect(0, 0, 256, 128);

    // Pill background
    ctx.fillStyle = isQuietRoom ? 'rgba(6, 78, 59, 0.9)' : 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = isQuietRoom ? '#34d399' : '#60a5fa';
    ctx.lineWidth = 4;

    const x = 8, y = 8, w = 240, h = 112, r = 20;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text: Room Name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(roomName, 128, 48);

    // Text: Count / Status
    if (isQuietRoom) {
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Sensory Space', 128, 86);
    } else {
      ctx.fillStyle = count > 0 ? '#38bdf8' : '#94a3b8';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText(`${count} ${count === 1 ? 'talk' : 'talks'}`, 128, 86);
    }
  }

  updateHeatmap(roomCounts = {}) {
    Object.keys(this.rooms).forEach(roomId => {
      const mesh = this.rooms[roomId];
      const count = roomCounts[roomId] || 0;
      mesh.userData.count = count;

      if (!mesh.userData.isQuietRoom) {
        let color = 0x334155; // 0 talks: slate
        let emissive = 0x000000;
        let intensity = 0.05;

        if (count >= 14) {
          color = 0xa855f7; // 14+: Radiant Purple
          emissive = 0x7e22ce;
          intensity = 0.35;
        } else if (count >= 7) {
          color = 0x6366f1; // 7-13: Electric Indigo
          emissive = 0x4338ca;
          intensity = 0.25;
        } else if (count > 0) {
          color = 0x0284c7; // 1-6: Sky Cyan
          emissive = 0x0369a1;
          intensity = 0.2;
        }

        mesh.material.color.setHex(color);
        mesh.material.emissive.setHex(emissive);
        mesh.material.emissiveIntensity = intensity;
      }

      // Update Sprite Text
      const sprite = this.labels[roomId];
      if (sprite && sprite.userData) {
        const { ctx, texture, roomName, isQuietRoom } = sprite.userData;
        this.drawSpriteCanvas(ctx, roomName, count, isQuietRoom);
        texture.needsUpdate = true;
      }
    });
  }

  selectRoom(roomId) {
    this.selectedRoomId = roomId;
    Object.keys(this.rooms).forEach(id => {
      const mesh = this.rooms[id];
      if (id === roomId) {
        mesh.position.y = mesh.userData.initialY + 0.8;
      } else {
        mesh.position.y = mesh.userData.initialY;
      }
    });
  }

  setupEvents() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    this.container.addEventListener('mousedown', e => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.container.addEventListener('mousemove', e => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        this.isAutoRotating = false;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        this.roomGroup.rotation.y += deltaX * 0.008;
        this.camera.position.y = Math.max(10, Math.min(50, this.camera.position.y - deltaY * 0.05));
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    });

    this.container.addEventListener('click', e => {
      if (this.hoveredRoomId) {
        this.selectRoom(this.hoveredRoomId);
        if (this.onRoomSelected) {
          this.onRoomSelected(this.hoveredRoomId);
        }
      }
    });

    window.addEventListener('resize', () => {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 500;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Idle subtle floating
    if (this.isAutoRotating && this.roomGroup) {
      this.roomGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.12;
      this.roomGroup.position.y = Math.sin(elapsed * 1.2) * 0.15;
    }

    // Raycast hover check
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Object.values(this.rooms);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const roomId = hit.userData.id;
      if (this.hoveredRoomId !== roomId) {
        this.hoveredRoomId = roomId;
        this.container.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredRoomId) {
        this.hoveredRoomId = null;
        this.container.style.cursor = 'default';
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  resetView() {
    this.isAutoRotating = true;
    this.selectedRoomId = null;
    if (this.roomGroup) {
      this.roomGroup.rotation.set(0, 0, 0);
      this.roomGroup.position.set(0, 0, 0);
    }
    this.camera.position.set(0, 32, 28);
    this.camera.lookAt(0, 0, 0);
    Object.values(this.rooms).forEach(mesh => {
      mesh.position.y = mesh.userData.initialY;
    });
  }
}
