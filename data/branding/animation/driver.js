(() => {
  const params = new URLSearchParams(location.search);
  const job = params.get('job');
  if (!job) return;

  let now = 0;
  const queue = [];
  window.requestAnimationFrame = (callback) => {
    queue.push(callback);
    return queue.length;
  };
  window.cancelAnimationFrame = () => {};
  performance.now = () => now;

  const report = (text) => fetch('/log', { method: 'POST', body: `${job}: ${text}` });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const tick = (time) => {
    now = time;
    queue.splice(0).forEach((callback) => {
      try {
        callback(time);
      } catch (error) {
        report(`callback failed ${error}`);
      }
    });
  };

  const frames = Number(params.get('frames') || 1);
  const step = Number(params.get('step') || 0);
  const size = Number(params.get('size') || 720);
  const ground = params.get('ground') !== '0';
  const margin = 0.94;
  const still = params.get('still');
  const aspect = Number(params.get('aspect') || 1);

  const fitTo = (stage, box) => {
    const THREE = stage._THREE;
    const camera = stage._camera;
    const controls = stage._controls;
    const center = box.getCenter(new THREE.Vector3());
    const corners = [];
    for (let index = 0; index < 8; index += 1) {
      corners.push(
        new THREE.Vector3(index & 1 ? box.max.x : box.min.x, index & 2 ? box.max.y : box.min.y, index & 4 ? box.max.z : box.min.z),
      );
    }
    const direction = camera.position.clone().sub(controls.target).normalize();
    const projected = new THREE.Vector3();
    const fits = (distance) => {
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.lookAt(center);
      camera.updateMatrixWorld(true);
      return corners.every((corner) => {
        projected.copy(corner).project(camera);
        return Math.abs(projected.x) <= margin && Math.abs(projected.y) <= margin && projected.z < 1;
      });
    };
    let low = 0.05;
    let high = 20;
    for (let index = 0; index < 28; index += 1) {
      const middle = (low + high) / 2;
      if (fits(middle)) high = middle;
      else low = middle;
    }
    fits(high);
    controls.target.copy(center);
    controls.update();
  };

  const send = (canvas, index) =>
    new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        await fetch(`/frame/${job}/${index}`, { method: 'POST', body: blob });
        resolve();
      }, 'image/png');
    });

  const run = async () => {
    const stage = document.querySelector('three-d-stage');
    for (let attempt = 0; attempt < 400 && !(stage._object && stage._renderer); attempt += 1) {
      await sleep(50);
      tick(0);
    }
    if (!stage._object) {
      await report('scene never appeared');
      return fetch(`/done/${job}`, { method: 'POST' });
    }
    await document.fonts.load('italic 900 150px "Barlow Condensed"');
    await document.fonts.ready;
    await sleep(400);
    tick(0);

    const THREE = stage._THREE;
    const renderer = stage._renderer;
    const camera = stage._camera;
    const scene = stage._scene;
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(size * aspect), size, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    scene.background = null;
    stage._ground.visible = ground;

    if (still) {
      const ball = scene.getObjectByName('football');
      const label = scene.getObjectByName('name_band');
      stage._object.children.forEach((child) => {
        child.visible = child === ball;
      });
      ball.position.set(0, 0.11, 0);
      ball.scale.setScalar(1);
      label.visible = still === 'named';
      window.__cgPause = true;
      fitTo(stage, new THREE.Box3().setFromObject(ball));
      camera.updateMatrixWorld(true);
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.12);
      ball.quaternion.copy(camera.quaternion).multiply(tilt).multiply(label.quaternion.clone().invert());
      renderer.render(scene, camera);
      await send(renderer.domElement, 0);
      await report('still done');
      return fetch(`/done/${job}`, { method: 'POST' });
    }

    for (let index = 0; index < frames; index += 1) {
      tick(index * step);
      renderer.render(scene, camera);
      await send(renderer.domElement, index);
    }
    await report(`sent ${frames} frames`);
    return fetch(`/done/${job}`, { method: 'POST' });
  };

  window.addEventListener('load', () => {
    run().catch((error) => report(`failed ${error && error.stack ? error.stack : error}`).then(() => fetch(`/done/${job}`, { method: 'POST' })));
  });
})();
