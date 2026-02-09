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

    // Create satellites
    const satellites = [
      createSatellite(7, 0.5, 0x4CAF50),
      createSatellite(8, 0.4, 0x2196F3),
      createSatellite(9, 0.6, 0xFF9800),
      createSatellite(7.5, 0.45, 0x9C27B0),
      createSatellite(8.5, 0.55, 0xF44336)
    ];

    satellites.forEach(sat => scene.add(sat.group));

    let debris = [];

    // Scroll-based animation
    let scrollProgress = 0;
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = window.scrollY / scrollHeight;
    };

    window.addEventListener('scroll', handleScroll);

    // Animation loop
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;

      // Earth rotation
      earth.rotation.y += 0.001 + scrollProgress * 0.002;
      atmosphere.rotation.y += 0.001 + scrollProgress * 0.002;

      // Camera movement based on scroll
      const cameraDistance = 25 - scrollProgress * 10;
      camera.position.z = cameraDistance * Math.cos(scrollProgress * 0.5);
      camera.position.y = scrollProgress * 5;
      camera.position.x = cameraDistance * Math.sin(scrollProgress * 0.5);
      camera.lookAt(0, 0, 0);

      // Satellite orbits
      satellites.forEach((sat, index) => {
        sat.angle += sat.speed * 0.01 * (1 + scrollProgress);
        
        const x = Math.cos(sat.angle) * sat.orbitRadius;
        const z = Math.sin(sat.angle) * sat.orbitRadius;
        const y = Math.sin(sat.angle + sat.inclination) * 2;

        sat.group.position.set(x, y, z);
        sat.group.rotation.y += 0.02;
        sat.group.lookAt(0, 0, 0);
      });

      // Trigger collision at scroll threshold
      if (scrollProgress > 0.6 && debris.length === 0) {
        debris = createDebris(150);
      }

      // Animate debris
      debris.forEach(d => {
        d.angle += d.speed * 0.01;
        
        const x = Math.cos(d.angle) * d.orbitRadius;
        const z = Math.sin(d.angle) * d.orbitRadius;
        const y = Math.sin(d.angle + d.inclination) * 3;

        d.mesh.position.set(x, y, z);
        d.mesh.rotation.x += d.rotationSpeed.x;
        d.mesh.rotation.y += d.rotationSpeed.y;
        d.mesh.rotation.z += d.rotationSpeed.z;
      });

      // Fade in debris based on scroll
      if (scrollProgress > 0.6) {
        const debrisFade = Math.min(1, (scrollProgress - 0.6) / 0.1);
        debris.forEach(d => {
          d.mesh.material.opacity = debrisFade;
          d.mesh.material.transparent = true;
        });
      }

      renderer.render(scene, camera);
    };

    animate();

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
        <div className="section">
          <div className="content">
            <h1>ASTRAL</h1>
            <p>Satellite Collision Prediction & Avoidance System</p>
            <p>Scroll to explore the growing threat in Earth's orbit</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>The Problem</h2>
            <p className="stat">36,000+</p>
            <p>tracked debris objects are currently in orbit around Earth.</p>
            <p>Space is getting increasingly crowded with satellites and debris from past collisions and tests.</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>Active Satellites</h2>
            <p>Thousands of operational satellites orbit Earth, providing critical services:</p>
            <p>• GPS and navigation</p>
            <p>• Weather monitoring</p>
            <p>• Communications</p>
            <p>• Scientific research</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2 className="warning">Collision Risk</h2>
            <p>Any collision can destroy valuable assets and generate more debris, leading to more collisions.</p>
            <p>This cascading effect is called <strong>Kessler Syndrome</strong>.</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2 className="warning">Kessler Syndrome</h2>
            <p>A chain reaction of collisions that could make Earth's orbit unusable for generations.</p>
            <p><strong>2007:</strong> Chinese ASAT test increased debris by 25%</p>
            <p><strong>2009:</strong> Iridium-Cosmos collision created 2,000+ fragments</p>
            <p><strong>2021:</strong> Russian ASAT test forced ISS to take shelter</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>ASTRAL Solution</h2>
            <p>Our system uses machine learning and real-time orbital data to:</p>
            <p>✓ Predict potential collisions</p>
            <p>✓ Analyze trajectory intersections</p>
            <p>✓ Visualize collision risks</p>
            <p>✓ Recommend avoidance maneuvers</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h2>Technology</h2>
            <p>ML Models trained on orbital behavior patterns</p>
            <p>Real-time TLE data from Space-Track.org</p>
            <p>Physics-based trajectory calculations</p>
            <p>3D visualization with Three.js</p>
          </div>
        </div>

        <div className="section">
          <div className="content">
            <h1>Protecting Our Orbital Future</h1>
            <p>Together, we can prevent Kessler Syndrome and keep space accessible for future generations.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;