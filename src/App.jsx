import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function App() {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 0, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      sizeAttenuation: true
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Realistic Earth
    const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
    
    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
      () => setLoading(false)
    );
    
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 5,
      specular: new THREE.Color(0x333333)
    });

    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    scene.add(earth);

    // Atmospheric glow
    const atmosphereGeometry = new THREE.SphereGeometry(5.1, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Directional sunlight
    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(50, 20, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    // Create realistic satellite
    const createSatellite = (orbitRadius, speed, color = 0xcccccc) => {
      const satelliteGroup = new THREE.Group();

      // Main satellite body
      const bodyGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.2);
      const bodyMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        specular: 0x555555
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.castShadow = true;
      satelliteGroup.add(body);

      // Solar panels
      const panelGeometry = new THREE.BoxGeometry(0.4, 0.02, 0.25);
      const panelMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a4a,
        shininess: 100,
        specular: 0x4444ff,
        emissive: 0x000044
      });

      const leftPanel = new THREE.Mesh(panelGeometry, panelMaterial);
      leftPanel.position.x = -0.3;
      leftPanel.castShadow = true;
      satelliteGroup.add(leftPanel);

      const rightPanel = new THREE.Mesh(panelGeometry, panelMaterial);
      rightPanel.position.x = 0.3;
      rightPanel.castShadow = true;
      satelliteGroup.add(rightPanel);

      // Antenna
      const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8);
      const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.y = 0.2;
      satelliteGroup.add(antenna);

      return {
        group: satelliteGroup,
        orbitRadius,
        speed,
        angle: Math.random() * Math.PI * 2,
        inclination: Math.random() * Math.PI / 4
      };
    };

    // Create debris pieces
    const createDebris = (count) => {
      const debrisArray = [];
      for (let i = 0; i < count; i++) {
        const size = 0.02 + Math.random() * 0.05;
        const geometry = Math.random() > 0.5 
          ? new THREE.BoxGeometry(size, size, size)
          : new THREE.SphereGeometry(size / 2, 6, 6);
        
        const material = new THREE.MeshPhongMaterial({
          color: 0x888888,
          shininess: 30
        });

        const debris = new THREE.Mesh(geometry, material);
        debris.castShadow = true;

        const orbitRadius = 6 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const inclination = Math.random() * Math.PI;

        debrisArray.push({
          mesh: debris,
          orbitRadius,
          angle,
          inclination,
          speed: 0.3 + Math.random() * 0.5,
          rotationSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
          )
        });

        scene.add(debris);
      }
      return debrisArray;
    };

    // Create satellites - Chapter 1: Normal satellites
    const normalSatellites = [
      createSatellite(7, 0.5, 0x4CAF50),
      createSatellite(8.5, 0.4, 0x2196F3),
      createSatellite(9.5, 0.35, 0xFF9800)
    ];

    // Chapter 2: Congestion satellites (many more)
    const congestionSatellites = [];
    for (let i = 0; i < 95; i++) {
      const radius = 6 + Math.random() * 5;
      const speed = 0.3 + Math.random() * 0.4;
      const color = Math.random() > 0.5 ? 0x888888 : 0x666666;
      congestionSatellites.push(createSatellite(radius, speed, color));
    }

    // Chapter 3: Active satellites (highlighted subset)
    const activeSatellites = [
      createSatellite(7.5, 0.45, 0x00ff00),
      createSatellite(8, 0.5, 0x00ff00),
      createSatellite(6, 0.4, 0x00ff00),
      createSatellite(7, 0.3, 0x00ff00),
      createSatellite(9, 0.4, 0x00ff00)
    ];

    // Chapter 4: Collision satellites
    const collisionSat1 = createSatellite(7.5, 0.6, 0xff0000);
    const collisionSat2 = createSatellite(8.5, 0.5, 0xff0000);
    const collisionSat1BaseOrbit = collisionSat1.orbitRadius;
    const collisionSat2BaseOrbit = collisionSat2.orbitRadius;

    // Combine all satellites
    const satellites = [
      ...normalSatellites,
      ...congestionSatellites,
      ...activeSatellites,
      collisionSat1,
      collisionSat2
    ];

    satellites.forEach(sat => {
      scene.add(sat.group);
      sat.group.visible = false; // Start hidden, show based on chapter
    });

    let debris = [];

    // Create all debris upfront (hidden initially)
    debris = createDebris(700);
    debris.forEach(d => {
      d.mesh.material.transparent = true;
      d.mesh.material.opacity = 0;
    });

    // Scroll-based animation state
    let timeProgress = 0;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      timeProgress = Math.max(0, Math.min(1, window.scrollY / scrollHeight));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initialize

    // Pure render function - continuous world with smooth chapter influences
    const render = () => {
      requestAnimationFrame(render);

      // Global time - continuous across all chapters
      const globalTime = timeProgress * 100;

      // Earth rotation - continuous, never snaps
      earth.rotation.y = globalTime * 0.04;
      atmosphere.rotation.y = globalTime * 0.04;

      // === CONTINUOUS CAMERA SYSTEM ===
      // Base camera trajectory (always active)
      const baseCameraDistance = 25;
      const baseCameraHeight = 0;
      const baseCameraAngle = globalTime * 0.005;

      // Chapter influences (smooth blending, no snapping)
      let distanceDelta = 0;
      let heightDelta = 0;
      let angleDelta = 0;

      // Chapter 1: Normal Orbit (0.00 - 0.20)
      if (timeProgress < 0.20) {
        const chapterProgress = timeProgress / 0.20;
        distanceDelta = -5 * chapterProgress; // Zoom in slightly
        heightDelta = 3 * chapterProgress;
      }

      // Chapter 2: The Problem (0.20 - 0.40)
      if (timeProgress >= 0.20 && timeProgress < 0.40) {
        const chapterProgress = (timeProgress - 0.20) / 0.20;
        distanceDelta = -5 + 8 * chapterProgress; // Pull back gradually
        heightDelta = 3 + 5 * chapterProgress;
        angleDelta = 0.1 * chapterProgress;
      }

      // Chapter 3: Active Satellites (0.40 - 0.55)
      if (timeProgress >= 0.40 && timeProgress < 0.55) {
        const chapterProgress = (timeProgress - 0.40) / 0.15;
        distanceDelta = 3 - 1 * chapterProgress; // Adjust smoothly
        heightDelta = 8 - 2 * chapterProgress;
        angleDelta = 0.1 + 0.05 * chapterProgress;
      }

      // Chapter 4: Collision Risk (0.55 - 0.75)
      if (timeProgress >= 0.55 && timeProgress < 0.75) {
        const chapterProgress = (timeProgress - 0.55) / 0.20;
        distanceDelta = 2 - 7 * chapterProgress; // Zoom in to collision
        heightDelta = 6 - 4 * chapterProgress;
        angleDelta = 0.15;
      }

      // Chapter 5: Predict & Prevent (0.75 - 1.00)
      if (timeProgress >= 0.75) {
        const chapterProgress = (timeProgress - 0.75) / 0.25;
        distanceDelta = -5 + 15 * chapterProgress; // Pull back to overview
        heightDelta = 2 + 13 * chapterProgress;
        angleDelta = 0.15 + 0.1 * chapterProgress;
      }

      // Apply continuous camera position
      const cameraDistance = baseCameraDistance + distanceDelta;
      const cameraAngle = baseCameraAngle + angleDelta;
      const cameraHeight = baseCameraHeight + heightDelta;

      camera.position.x = cameraDistance * Math.sin(cameraAngle);
      camera.position.y = cameraHeight;
      camera.position.z = cameraDistance * Math.cos(cameraAngle);
      camera.lookAt(0, 0, 0);

      // === CONTINUOUS SATELLITE SYSTEM ===
      // Compute satellite positions based on global time (never reset angles)
      
      // Normal satellites - always compute, visibility controls display
      normalSatellites.forEach((sat, index) => {
        const angle = sat.angle + globalTime * sat.speed * 0.2;
        const x = Math.cos(angle) * sat.orbitRadius;
        const z = Math.sin(angle) * sat.orbitRadius;
        const y = Math.sin(angle + sat.inclination) * 2;
        
        sat.group.position.set(x, y, z);
        sat.group.rotation.y = globalTime * 0.02;
        sat.group.lookAt(0, 0, 0);

        // Chapter-based visibility (fade, don't snap)
        let targetOpacity = 0;
        let emissiveIntensity = 0;
        let emissiveColor = new THREE.Color(0x000000);

        if (timeProgress < 0.20) {
          // Chapter 1: Visible
          targetOpacity = 1;
        } else if (timeProgress >= 0.75) {
          // Chapter 5: Visible with green glow
          targetOpacity = 1;
          const pulseIntensity = 0.2 + Math.sin(globalTime * 0.3 + index) * 0.1;
          emissiveIntensity = pulseIntensity;
          emissiveColor = new THREE.Color(0x00ff88);
        }

        sat.group.visible = targetOpacity > 0;
        sat.group.children.forEach(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = targetOpacity;
            child.material.emissive = emissiveColor;
            child.material.emissiveIntensity = emissiveIntensity;
          }
        });
      });

      // Congestion satellites - continuous orbit
      congestionSatellites.forEach((sat, index) => {
        const angle = sat.angle + globalTime * sat.speed * 0.2;
        const x = Math.cos(angle) * sat.orbitRadius;
        const z = Math.sin(angle) * sat.orbitRadius;
        const y = Math.sin(angle + sat.inclination) * 2;
        
        sat.group.position.set(x, y, z);
        sat.group.rotation.y = globalTime * 0.02;
        sat.group.lookAt(0, 0, 0);

        // Gradual appearance in Chapter 2, 3
        let targetOpacity = 0;
        
        if (timeProgress >= 0.20 && timeProgress < 0.55) {
          const appearStart = 0.20;
          const appearEnd = 0.35;
          const appearProgress = Math.min(1, Math.max(0, (timeProgress - appearStart) / (appearEnd - appearStart)));
          const staggerDelay = index * 0.03;
          const individualProgress = Math.max(0, Math.min(1, (appearProgress - staggerDelay) * 5));
          targetOpacity = individualProgress;

          // Dim in Chapter 3
          if (timeProgress >= 0.40) {
            const dimProgress = (timeProgress - 0.40) / 0.15;
            targetOpacity = individualProgress * (1 - dimProgress * 0.7);
          }
        }

        sat.group.visible = targetOpacity > 0.05;
        sat.group.children.forEach(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = targetOpacity;
          }
        });
      });

      // Active satellites - continuous orbit with glow
      activeSatellites.forEach((sat, index) => {
        const angle = sat.angle + globalTime * sat.speed * 0.2;
        const x = Math.cos(angle) * sat.orbitRadius;
        const z = Math.sin(angle) * sat.orbitRadius;
        const y = Math.sin(angle + sat.inclination) * 2;
        
        sat.group.position.set(x, y, z);
        sat.group.rotation.y = globalTime * 0.02;
        sat.group.lookAt(0, 0, 0);

        // Only visible in Chapter 3
        let targetOpacity = 0;
        let scale = 1;
        let emissiveIntensity = 0;

        if (timeProgress >= 0.40 && timeProgress < 0.55) {
          const chapterProgress = (timeProgress - 0.40) / 0.15;
          targetOpacity = Math.min(1, chapterProgress * 3);
          scale = 1 + chapterProgress * 0.5;
          const glowIntensity = 0.3 + Math.sin(globalTime * 0.4 + index) * 0.2;
          emissiveIntensity = glowIntensity * targetOpacity;
        }

        sat.group.visible = targetOpacity > 0.05;
        sat.group.scale.set(scale, scale, scale);
        sat.group.children.forEach(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = targetOpacity;
            child.material.emissive = new THREE.Color(0x00ff00);
            child.material.emissiveIntensity = emissiveIntensity;
          }
        });
      });

      // Collision satellites - continuous convergence
      const collisionActive = timeProgress >= 0.55 && timeProgress < 0.75;
      const collisionChapterProgress = collisionActive ? (timeProgress - 0.55) / 0.20 : 0;
      const collisionTime = 0.5; // 50% through chapter 4

      if (collisionActive && collisionChapterProgress < collisionTime) {
        // Before collision - satellites converge
        const convergenceProgress = collisionChapterProgress / collisionTime;
        const targetOrbit = (collisionSat1BaseOrbit + collisionSat2BaseOrbit) / 2;

        // Satellite 1
        const orbit1 = collisionSat1BaseOrbit + (targetOrbit - collisionSat1BaseOrbit) * convergenceProgress;
        const angle1 = collisionSat1.angle + globalTime * collisionSat1.speed * 0.25;
        const x1 = Math.cos(angle1) * orbit1;
        const z1 = Math.sin(angle1) * orbit1;
        
        collisionSat1.group.position.set(x1, 0, z1);
        collisionSat1.group.rotation.y = globalTime * 0.02;
        collisionSat1.group.lookAt(0, 0, 0);
        collisionSat1.group.visible = true;

        // Satellite 2
        const orbit2 = collisionSat2BaseOrbit + (targetOrbit - collisionSat2BaseOrbit) * convergenceProgress;
        const angle2 = collisionSat2.angle + globalTime * collisionSat2.speed * 0.25 + Math.PI;
        const x2 = Math.cos(angle2) * orbit2;
        const z2 = Math.sin(angle2) * orbit2;
        
        collisionSat2.group.position.set(x2, 0, z2);
        collisionSat2.group.rotation.y = globalTime * 0.02;
        collisionSat2.group.lookAt(0, 0, 0);
        collisionSat2.group.visible = true;

        // Increase glow as they approach
        const approachIntensity = convergenceProgress * 0.5;
        [collisionSat1, collisionSat2].forEach(sat => {
          sat.group.children.forEach(child => {
            if (child.material) {
              child.material.emissive = new THREE.Color(0xff0000);
              child.material.emissiveIntensity = approachIntensity;
            }
          });
        });

        // Hide debris before collision
        debris.forEach(d => {
          d.mesh.visible = false;
          d.mesh.material.opacity = 0;
        });

      } else if (collisionActive && collisionChapterProgress >= collisionTime) {
        // After collision - show debris
        collisionSat1.group.visible = false;
        collisionSat2.group.visible = false;

        const debrisProgress = (collisionChapterProgress - collisionTime) / (1 - collisionTime);
        const fadeProgress = Math.min(1, debrisProgress * 3);

        debris.forEach(d => {
          const angle = d.angle + globalTime * d.speed * 0.15;
          const x = Math.cos(angle) * d.orbitRadius;
          const z = Math.sin(angle) * d.orbitRadius;
          const y = Math.sin(angle + d.inclination) * 3;

          d.mesh.position.set(x, y, z);
          d.mesh.rotation.x = globalTime * d.rotationSpeed.x * 0.5;
          d.mesh.rotation.y = globalTime * d.rotationSpeed.y * 0.5;
          d.mesh.rotation.z = globalTime * d.rotationSpeed.z * 0.5;

          d.mesh.material.opacity = fadeProgress;
          d.mesh.visible = fadeProgress > 0;
        });

      } else {
        // Outside Chapter 4 - hide collision satellites and debris
        collisionSat1.group.visible = false;
        collisionSat2.group.visible = false;

        // Chapter 5: Debris fades out
        if (timeProgress >= 0.75) {
          const chapterProgress = (timeProgress - 0.75) / 0.25;
          const debrisFadeOut = Math.max(0, 1 - chapterProgress * 0.7);

          debris.forEach(d => {
            const angle = d.angle + globalTime * d.speed * 0.15;
            const x = Math.cos(angle) * d.orbitRadius;
            const z = Math.sin(angle) * d.orbitRadius;
            const y = Math.sin(angle + d.inclination) * 3;

            d.mesh.position.set(x, y, z);
            d.mesh.rotation.x = globalTime * d.rotationSpeed.x * 0.5;
            d.mesh.rotation.y = globalTime * d.rotationSpeed.y * 0.5;
            d.mesh.rotation.z = globalTime * d.rotationSpeed.z * 0.5;

            d.mesh.material.opacity = debrisFadeOut * 0.5;
            d.mesh.visible = debrisFadeOut > 0.05;
          });
        } else {
          debris.forEach(d => {
            d.mesh.visible = false;
            d.mesh.material.opacity = 0;
          });
        }
      }

      renderer.render(scene, camera);
    };

    render();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      {loading && <div className="loading">Loading Earth Textures...</div>}
      <div ref={mountRef} />
      <div className="scroll-container">
        {/* CHAPTER 1: Normal Orbit (0.00 - 0.20) */}
        <div className="section">
          <div className="content">
            <h1>ASTRAL</h1>
            <p>Satellite Collision Prediction & Avoidance System</p>
            <p style={{marginTop: '20px', opacity: 0.8}}>Scroll to explore the orbital environment</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>Normal Orbital Motion</h2>
            <p>In ideal conditions, satellites orbit Earth in well-defined, predictable paths.</p>
            <p>Each satellite maintains its designated orbital slot, providing essential services:</p>
            <p>• Global positioning and navigation</p>
            <p>• Weather forecasting</p>
            <p>• Communications infrastructure</p>
          </div>
        </div>

        {/* CHAPTER 2: The Problem (0.20 - 0.40) */}
        <div className="section">
          <div className="content">
            <h2 className="warning">The Problem: Orbital Congestion</h2>
            <p className="stat">36,000+</p>
            <p>tracked objects currently orbit Earth</p>
            <p style={{marginTop: '20px'}}>The orbital environment is becoming increasingly crowded with satellites, rocket bodies, and debris fragments.</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2 className="warning">Overcrowded Orbits</h2>
            <p>With the rise of mega-constellations and commercial space ventures, thousands of new satellites are being launched each year.</p>
            <p>Managing this traffic is becoming exponentially more complex.</p>
            <p><strong>Visualize:</strong> Each dot represents a real object in space.</p>
          </div>
        </div>

        {/* CHAPTER 3: Active Satellites (0.40 - 0.55) */}
        <div className="section">
          <div className="content">
            <h2>Active Satellites</h2>
            <p>Not all objects in orbit are equal. Active satellites (highlighted in green) are operational spacecraft providing critical services.</p>
            <p>These assets are worth millions of dollars and are irreplaceable.</p>
            <p style={{marginTop: '20px', fontSize: '0.9rem', opacity: 0.8}}>These must be protected at all costs.</p>
          </div>
        </div>

        {/* CHAPTER 4: Collision Risk (0.55 - 0.75) */}
        <div className="section">
          <div className="content">
            <h2 className="warning">Collision Risk Detected</h2>
            <p>When trajectories intersect, satellites are on a collision course.</p>
            <p>Watch as two satellites converge...</p>
            <p style={{fontSize: '0.9rem', opacity: 0.7}}>Relative velocity: ~15 km/s</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2 className="warning">Impact Event</h2>
            <p>⚠️ COLLISION</p>
            <p>At orbital velocities, even small objects have devastating kinetic energy.</p>
            <p>A single collision instantly creates hundreds of debris fragments.</p>
            <p style={{marginTop: '20px', fontSize: '0.9rem', fontStyle: 'italic'}}>Scroll back to replay the collision sequence</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2 className="warning">Kessler Syndrome</h2>
            <p>Each fragment becomes a high-speed projectile capable of causing more collisions.</p>
            <p><strong>Historical precedents:</strong></p>
            <p>2007: Chinese ASAT test — 25% increase in debris</p>
            <p>2009: Iridium-Cosmos collision — 2,000+ fragments</p>
            <p>2021: Russian ASAT test — ISS crew took shelter</p>
          </div>
        </div>

        {/* CHAPTER 5: Predict & Prevent (0.75 - 1.00) */}
        <div className="section">
          <div className="content">
            <h2>Predict & Prevent</h2>
            <p>ASTRAL uses machine learning to predict collision risks before they occur.</p>
            <p>By analyzing orbital trajectories in real-time, we can:</p>
            <p>✓ Identify high-risk conjunctions</p>
            <p>✓ Calculate avoidance maneuvers</p>
            <p>✓ Prevent cascading collisions</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>Our Solution</h2>
            <p><strong>Real-time monitoring:</strong> TLE data from Space-Track.org</p>
            <p><strong>ML prediction:</strong> Trained on historical conjunction data</p>
            <p><strong>Physics simulation:</strong> Orbital mechanics calculations</p>
            <p><strong>Visualization:</strong> 3D risk assessment</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h1>Protecting Our Orbital Future</h1>
            <p>Through predictive analytics and automated monitoring, we can maintain safe operations in Earth's orbit.</p>
            <p style={{marginTop: '30px'}}>The future of space depends on intelligent collision avoidance.</p>
            <p style={{marginTop: '20px', fontSize: '0.9rem', opacity: 0.7}}>ASTRAL — Predict. Prevent. Preserve.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;