import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  TextureLoader,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

const FIELD_OF_VIEW = 32;
const CAMERA_DISTANCE = 10;
const MAXIMUM_PIXEL_RATIO = 2;
const NARROW_WIDTH = 700;
const VISIBILITY_MARGIN = 240;

const VOLT = '#c8ff2e';
const INK = '#05070a';
const FINISHES = [
  { light: '#ffe9a6', base: '#f3c653', deep: '#a8741a', ink: '#2a1a02' },
  { light: '#b9d4ff', base: '#5b9bff', deep: '#1d3faf', ink: '#04102e' },
];

const BALL_RISE = 2.7;
const BALL_SPIN = 0.32;
const PENTAGON_DISTANCE = 2.32744;
const HEXAGON_DISTANCE = 2.26728;

const CARD_WIDTH = 0.66;
const CARD_HEIGHT = 0.86;
const CARD_TEXTURE_WIDTH = 330;
const CARD_TEXTURE_HEIGHT = 430;
const WIDE_LAYOUT = { cards: 12, orbit: [1.6, 1.85], span: 4.3 };
const NARROW_LAYOUT = { cards: 8, orbit: [1.4, 1.65], span: 3.9 };

const PHONE_SHARE = 0.94;
const PHONE_WIDTH = 0.5;
const PHONE_DEPTH = 0.04;
const SCREEN_WIDTH = 0.462;
const SCREEN_HEIGHT = 0.944;
const FLIP_SECONDS = 0.75;

const DUST_COUNT = 220;

const BALL_VERTEX = `
  varying vec3 vLocal;
  varying vec3 vNormalView;
  void main() {
    vLocal = position;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BALL_FRAGMENT = `
  uniform vec3 uNormals[32];
  uniform float uDistances[32];
  uniform sampler2D uBand;
  varying vec3 vLocal;
  varying vec3 vNormalView;

  void main() {
    vec3 point = normalize(vLocal);
    float best = -1.0;
    float second = -1.0;
    int panel = 0;
    for (int i = 0; i < 32; i++) {
      float reach = dot(point, uNormals[i]) / uDistances[i];
      if (reach > best) {
        second = best;
        best = reach;
        panel = i;
      } else if (reach > second) {
        second = reach;
      }
    }
    float seam = smoothstep(0.0, 0.0045, best - second);
    vec3 leather = panel < 12 ? vec3(0.045, 0.055, 0.075) : vec3(0.93, 0.95, 0.97);
    vec3 surface = mix(vec3(0.015, 0.02, 0.03), leather, seam);

    float latitude = asin(clamp(point.y, -1.0, 1.0));
    float halfBand = 0.21;
    float inBand = 1.0 - smoothstep(halfBand - 0.012, halfBand, abs(latitude));
    float around = atan(point.z, point.x) / 6.2831853 + 0.5;
    vec3 band = texture2D(uBand, vec2(1.0 - around * 2.0, latitude / (2.0 * halfBand) + 0.5)).rgb;
    surface = mix(surface, band, inBand);

    vec3 normal = normalize(vNormalView);
    vec3 light = normalize(vec3(-0.55, 0.75, 0.65));
    float diffuse = max(dot(normal, light), 0.0);
    float shine = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 42.0);
    float rim = pow(1.0 - max(normal.z, 0.0), 2.6);
    vec3 color = surface * (0.3 + 0.9 * diffuse) + vec3(1.0) * shine * 0.28 + vec3(0.784, 1.0, 0.18) * rim * 0.42;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

function canvasOf(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function textureOf(canvas, renderer) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function glowTexture(renderer, color) {
  const size = 256;
  const canvas = canvasOf(size, size);
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return textureOf(canvas, renderer);
}

function bandTexture(renderer) {
  const canvas = canvasOf(1024, 160);
  const context = canvas.getContext('2d');
  context.fillStyle = '#0a0d12';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = VOLT;
  context.fillRect(0, 0, canvas.width, 7);
  context.fillRect(0, canvas.height - 7, canvas.width, 7);
  context.font = 'italic 800 108px "Barlow Condensed", "Arial Narrow", sans-serif';
  context.textBaseline = 'middle';
  const first = 'CHALLENGE';
  const second = 'GOAL';
  const width = context.measureText(first + second).width;
  const start = (canvas.width - width) / 2;
  context.fillStyle = '#f6f8fb';
  context.fillText(first, start, canvas.height / 2 + 6);
  context.fillStyle = VOLT;
  context.fillText(second, start + context.measureText(first).width, canvas.height / 2 + 6);
  const texture = textureOf(canvas, renderer);
  texture.wrapS = RepeatWrapping;
  return texture;
}

function panelNormals() {
  const positions = new IcosahedronGeometry(1, 0).getAttribute('position');
  const corners = new Map();
  const centers = [];
  for (let face = 0; face < positions.count; face += 3) {
    const center = new Vector3();
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = new Vector3().fromBufferAttribute(positions, face + corner);
      center.add(vertex);
      corners.set(vertex.toArray().map((value) => value.toFixed(3)).join(','), vertex.normalize());
    }
    centers.push(center.normalize());
  }
  return [...corners.values(), ...centers];
}

function createBall(renderer) {
  const group = new Group();
  const spin = new Group();
  spin.rotation.set(0.28, 0, 0.24);
  const normals = panelNormals();
  const ball = new Mesh(
    new SphereGeometry(1, 72, 48),
    new ShaderMaterial({
      vertexShader: BALL_VERTEX,
      fragmentShader: BALL_FRAGMENT,
      uniforms: {
        uNormals: { value: normals },
        uDistances: { value: normals.map((_, index) => (index < 12 ? PENTAGON_DISTANCE : HEXAGON_DISTANCE)) },
        uBand: { value: bandTexture(renderer) },
      },
    }),
  );
  spin.add(ball);

  const rings = [
    { radius: 1.44, tube: 0.013, opacity: 0.95, tilt: [1.22, 0.2, 0] },
    { radius: 1.66, tube: 0.006, opacity: 0.4, tilt: [1.42, -0.5, 0] },
  ].map(({ radius, tube, opacity, tilt }) => {
    const ring = new Mesh(
      new TorusGeometry(radius, tube, 10, 140),
      new MeshBasicMaterial({ color: VOLT, transparent: true, opacity, toneMapped: false }),
    );
    ring.rotation.set(...tilt);
    return ring;
  });

  const glow = new Mesh(
    new PlaneGeometry(5.4, 5.4),
    new MeshBasicMaterial({
      map: glowTexture(renderer, VOLT),
      transparent: true,
      opacity: 0.32,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.z = -1.2;
  glow.renderOrder = -1;

  group.add(glow, spin, ...rings);
  return { group, spin, ball, rings, cards: [] };
}

function cutCornerPath(context, width, height, radius, cut) {
  context.beginPath();
  context.moveTo(radius, 0);
  context.lineTo(width - cut, 0);
  context.lineTo(width, cut);
  context.lineTo(width, height - radius);
  context.quadraticCurveTo(width, height, width - radius, height);
  context.lineTo(radius, height);
  context.quadraticCurveTo(0, height, 0, height - radius);
  context.lineTo(0, radius);
  context.quadraticCurveTo(0, 0, radius, 0);
  context.closePath();
}

function shortName(name) {
  return name.split(/\s+/).at(-1);
}

function cardTexture(renderer, card, role, portrait, finish) {
  const width = CARD_TEXTURE_WIDTH;
  const height = CARD_TEXTURE_HEIGHT;
  const canvas = canvasOf(width, height);
  const context = canvas.getContext('2d');
  context.save();
  cutCornerPath(context, width, height, 26, 44);
  context.clip();

  const fill = context.createLinearGradient(0, 0, width, height);
  fill.addColorStop(0, finish.light);
  fill.addColorStop(0.42, finish.base);
  fill.addColorStop(1, finish.deep);
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.16;
  context.fillStyle = '#ffffff';
  for (let stripe = -height; stripe < width; stripe += 74) {
    context.beginPath();
    context.moveTo(stripe, height);
    context.lineTo(stripe + 30, height);
    context.lineTo(stripe + 30 + height * 0.55, 0);
    context.lineTo(stripe + height * 0.55, 0);
    context.closePath();
    context.fill();
  }
  context.globalAlpha = 1;

  if (portrait) {
    const size = width * 0.86;
    context.drawImage(portrait, width - size + 14, 20, size, size);
  }

  const plate = context.createLinearGradient(0, height * 0.62, 0, height);
  plate.addColorStop(0, 'rgba(5, 7, 10, 0)');
  plate.addColorStop(0.28, 'rgba(5, 7, 10, 0.62)');
  plate.addColorStop(1, 'rgba(5, 7, 10, 0.86)');
  context.fillStyle = plate;
  context.fillRect(0, height * 0.62, width, height * 0.38);

  context.fillStyle = finish.ink;
  context.font = 'italic 800 78px "Barlow Condensed", "Arial Narrow", sans-serif';
  context.textBaseline = 'top';
  context.fillText(role, 20, 10);

  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  let fontSize = 56;
  const label = shortName(card.name);
  do {
    context.font = `700 ${fontSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;
    fontSize -= 3;
  } while (context.measureText(label).width > width - 36 && fontSize > 26);
  context.fillText(label, width / 2, height - 52);
  context.restore();

  context.lineWidth = 5;
  context.strokeStyle = finish.light;
  cutCornerPath(context, width, height, 26, 44);
  context.stroke();
  return textureOf(canvas, renderer);
}

function loadImage(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function addCards(renderer, ball, data, invalidate) {
  await Promise.all([
    document.fonts.load('italic 800 78px "Barlow Condensed"'),
    document.fonts.load('700 56px "Barlow Condensed"'),
  ]).catch(() => undefined);
  const band = ball.ball.material.uniforms.uBand;
  band.value.dispose();
  band.value = bandTexture(renderer);
  const portraits = await Promise.all(data.cards.map((card) => loadImage(`/img/cards/${card.slug}.webp`)));
  const geometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
  data.cards.forEach((card, index) => {
    const mesh = new Mesh(
      geometry,
      new MeshBasicMaterial({
        map: cardTexture(renderer, card, data.roles[card.position] ?? card.position, portraits[index], FINISHES[index % 2]),
        alphaTest: 0.5,
        alphaToCoverage: true,
        toneMapped: false,
      }),
    );
    mesh.userData = { index, appear: 0 };
    ball.group.add(mesh);
    ball.cards.push(mesh);
  });
  invalidate();
}

function roundedShape(width, height, radius) {
  const shape = new Shape();
  const left = -width / 2;
  const bottom = -height / 2;
  shape.moveTo(left + radius, bottom);
  shape.lineTo(left + width - radius, bottom);
  shape.quadraticCurveTo(left + width, bottom, left + width, bottom + radius);
  shape.lineTo(left + width, bottom + height - radius);
  shape.quadraticCurveTo(left + width, bottom + height, left + width - radius, bottom + height);
  shape.lineTo(left + radius, bottom + height);
  shape.quadraticCurveTo(left, bottom + height, left, bottom + height - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  return shape;
}

function screenGeometry() {
  const geometry = new ShapeGeometry(roundedShape(SCREEN_WIDTH, SCREEN_HEIGHT, 0.045), 10);
  const positions = geometry.getAttribute('position');
  const coordinates = new Float32Array(positions.count * 2);
  for (let index = 0; index < positions.count; index += 1) {
    coordinates[index * 2] = positions.getX(index) / SCREEN_WIDTH + 0.5;
    coordinates[index * 2 + 1] = positions.getY(index) / SCREEN_HEIGHT + 0.5;
  }
  geometry.setAttribute('uv', new BufferAttribute(coordinates, 2));
  return geometry;
}

function createPhone(renderer) {
  const group = new Group();
  const turn = new Group();
  const bevel = 0.012;
  const body = new Mesh(
    new ExtrudeGeometry(roundedShape(PHONE_WIDTH - bevel * 2, 1 - bevel * 2, 0.06), {
      depth: PHONE_DEPTH,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 12,
    }),
    new MeshStandardMaterial({ color: '#1b2430', metalness: 0.35, roughness: 0.45 }),
  );
  body.position.z = -PHONE_DEPTH / 2;
  const screen = new Mesh(screenGeometry(), new MeshBasicMaterial({ color: INK, toneMapped: false }));
  screen.position.z = PHONE_DEPTH / 2 + bevel + 0.002;

  const glow = new Mesh(
    new PlaneGeometry(1.7, 1.9),
    new MeshBasicMaterial({
      map: glowTexture(renderer, '#5b9bff'),
      transparent: true,
      opacity: 0.3,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.z = -0.5;
  glow.renderOrder = -1;

  turn.add(body, screen);
  group.add(glow, turn);
  return { group, turn, screen, flip: null };
}

function createDust(renderer) {
  const positions = new Float32Array(DUST_COUNT * 3);
  for (let index = 0; index < DUST_COUNT; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 16;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[index * 3 + 2] = -5 + Math.random() * 7;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return new Points(
    geometry,
    new PointsMaterial({
      map: glowTexture(renderer, '#e9ffb0'),
      size: 0.09,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

function easeInOut(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}

export async function start({ data, screen, onScreen, paused, onMotion }) {
  const canvas = document.getElementById('stage');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 60);
  camera.position.z = CAMERA_DISTANCE;
  scene.add(new AmbientLight(0xffffff, 1.1));
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(2, 3, 6);
  const rim = new DirectionalLight(0xc8ff2e, 1.6);
  rim.position.set(-5, 1, -3);
  scene.add(key, rim);

  const ball = createBall(renderer);
  const phone = createPhone(renderer);
  const dust = createDust(renderer);
  scene.add(dust, ball.group, phone.group);

  const anchors = {
    ball: document.querySelector('[data-anchor="ball"]'),
    phone: document.querySelector('[data-anchor="phone"]'),
  };
  const loader = new TextureLoader();
  const screens = new Map();
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let unitsPerPixel = 1;
  let layout = WIDE_LAYOUT;
  let time = 0;
  let last = performance.now();
  let dirty = true;

  const invalidate = () => {
    dirty = true;
  };

  function screenTexture(name) {
    if (!screens.has(name)) {
      const texture = loader.load(`/img/screens/${data.screens}/${name}.webp`, invalidate);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      screens.set(name, texture);
    }
    return screens.get(name);
  }

  function applyScreen(name) {
    phone.screen.material.map = screenTexture(name);
    phone.screen.material.color.set('#ffffff');
    phone.screen.material.needsUpdate = true;
    invalidate();
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    layout = width < NARROW_WIDTH ? NARROW_LAYOUT : WIDE_LAYOUT;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAXIMUM_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    unitsPerPixel = (2 * Math.tan((FIELD_OF_VIEW * Math.PI) / 360) * CAMERA_DISTANCE) / height;
    invalidate();
  }

  function place(group, element, sizeOf) {
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.bottom > -VISIBILITY_MARGIN && rect.top < window.innerHeight + VISIBILITY_MARGIN;
    group.visible = visible;
    if (visible) {
      group.position.x = (rect.left + rect.width / 2 - window.innerWidth / 2) * unitsPerPixel;
      group.position.y = -(rect.top + rect.height / 2 - window.innerHeight / 2) * unitsPerPixel;
      group.scale.setScalar(sizeOf(rect) * unitsPerPixel);
    }
    return visible;
  }

  function updateBall(delta) {
    ball.spin.rotation.y = time * BALL_SPIN;
    ball.rings[0].rotation.z = time * 0.5;
    ball.rings[1].rotation.z = -time * 0.3;
    ball.group.rotation.y = pointer.x * 0.22;
    ball.group.rotation.x = -pointer.y * 0.14;
    const shown = layout.cards;
    for (const card of ball.cards) {
      const { index } = card.userData;
      card.visible = index < shown;
      if (!card.visible) {
        continue;
      }
      card.userData.appear = Math.min(1, card.userData.appear + delta * 1.4);
      const tier = index % 2;
      const angle = (index / shown) * Math.PI * 2 + time * (tier ? 0.16 : 0.22);
      const radius = layout.orbit[tier];
      const depth = Math.sin(angle);
      card.position.set(
        Math.cos(angle) * radius,
        (tier ? 0.62 : -0.56) + Math.sin(time * 0.9 + index * 1.7) * 0.07,
        depth * radius * 0.72,
      );
      card.rotation.set(0, Math.cos(angle) * -0.42, Math.sin(time * 0.6 + index) * 0.05 + (tier ? 0.05 : -0.05));
      card.scale.setScalar(easeInOut(card.userData.appear) * (0.92 + depth * 0.1));
    }
  }

  function updatePhone(delta) {
    let flipTurn = 0;
    if (phone.flip) {
      phone.flip.progress = Math.min(1, phone.flip.progress + delta / FLIP_SECONDS);
      if (phone.flip.progress >= 0.5 && !phone.flip.swapped) {
        phone.flip.swapped = true;
        applyScreen(phone.flip.name);
      }
      flipTurn = easeInOut(phone.flip.progress) * Math.PI * 2;
      if (phone.flip.progress >= 1) {
        phone.flip = null;
      }
    }
    phone.turn.rotation.y = -0.34 + pointer.x * 0.26 + Math.sin(time * 0.7) * 0.07 + flipTurn;
    phone.turn.rotation.x = 0.06 - pointer.y * 0.12;
    phone.turn.rotation.z = 0.03;
    phone.turn.position.y = Math.sin(time * 0.9) * 0.012;
  }

  function updateDust() {
    dust.position.y = (time * 0.05 + window.scrollY * unitsPerPixel * 0.12) % 4;
    dust.rotation.z = Math.sin(time * 0.05) * 0.04;
  }

  function frame(now) {
    window.requestAnimationFrame(frame);
    const delta = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden) {
      return;
    }
    const still = paused();
    if (still && !dirty && !phone.flip) {
      return;
    }
    if (!still) {
      time += delta;
    }
    pointer.x += (pointer.targetX - pointer.x) * Math.min(1, delta * 4);
    pointer.y += (pointer.targetY - pointer.y) * Math.min(1, delta * 4);

    const ballVisible = place(ball.group, anchors.ball, (rect) => Math.min(rect.width / layout.span, rect.height / BALL_RISE));
    const phoneVisible = place(phone.group, anchors.phone, (rect) => rect.height * PHONE_SHARE);
    const active = ballVisible || phoneVisible;
    if (!active && !dirty) {
      return;
    }
    dirty = false;
    if (ballVisible) {
      updateBall(still ? 1 : delta);
    }
    if (phoneVisible) {
      updatePhone(delta);
    }
    updateDust();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || paused()) {
      return;
    }
    pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    invalidate();
  });
  onMotion(invalidate);
  onScreen((name) => {
    if (paused()) {
      applyScreen(name);
      return;
    }
    phone.flip = { name, progress: 0, swapped: false };
    screenTexture(name);
  });

  resize();
  applyScreen(screen());
  void addCards(renderer, ball, data, invalidate);
  window.requestAnimationFrame(frame);
}
