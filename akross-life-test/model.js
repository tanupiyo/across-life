import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { MTLLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";

const container = document.getElementById("pet3d");

if (container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(280, 280);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.DirectionalLight(0xffffff, 0.7));
  const keyLight = scene.children[0];
  keyLight.position.set(2, 3, 4);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));

  let bird = null;
  let modelLoadStarted = false;
  let jumpPower = 0;
  let isJumping = false;
  let singingUntil = 0;
  let pettingUntil = 0;

  // 音符は一度だけ生成し、遊ぶアクション中だけ表示します。
  const musicNotes = [];
  ["♪", "♫", "♬"].forEach((symbol) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    context.font = "bold 90px sans-serif";
    context.fillStyle = "#e6b84f";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(symbol, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const note = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    }));
    note.scale.set(0.35, 0.35, 1);
    note.visible = false;
    scene.add(note);
    musicNotes.push(note);
  });

  function loadMejiroModel() {
    if (modelLoadStarted) return;
    modelLoadStarted = true;

    const mtlLoader = new MTLLoader();
    mtlLoader.setPath("./models/");
    mtlLoader.load(
      "mejirou_new.mtl",
      (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath("./models/");
        objLoader.load(
          "mejiro_new.obj",
          (object) => {
            bird = object;
            bird.traverse((child) => {
              if (!child.isMesh) return;
              const materialsToUpdate = Array.isArray(child.material)
                ? child.material
                : [child.material];

              materialsToUpdate.forEach((material) => {
                // 元のテクスチャを維持し、光沢だけを控えめにします。
                if (material.specular) material.specular.set("#111111");
                if (material.shininess !== undefined) material.shininess = 1;
                material.needsUpdate = true;
              });
            });

            const bounds = new THREE.Box3().setFromObject(bird);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());
            bird.position.sub(center);
            const maxSize = Math.max(size.x, size.y, size.z);
            if (maxSize > 0) bird.scale.setScalar(1.9 / maxSize);

            scene.add(bird);
            container.classList.add("model-loaded");
            console.info("あくろすLIFE：3Dめじろうを読み込みました。");
          },
          undefined,
          (error) => {
            modelLoadStarted = false;
            console.error("3Dモデル（OBJ）の読み込みに失敗しました。", error);
          }
        );
      },
      undefined,
      (error) => {
        modelLoadStarted = false;
        console.error("3Dモデル（MTL）の読み込みに失敗しました。", error);
      }
    );
  }

  function checkGrowthStage() {
    const visits = Number(localStorage.getItem("visits")) || 0;
    // 20回来館で大人になったら、現在用意されている3Dモデルを表示します。
    if (visits >= 20) loadMejiroModel();
  }

  window.addEventListener("mejiroCheckin", checkGrowthStage);
  checkGrowthStage();

  window.addEventListener("mejiroAction", (event) => {
    if (event.detail === "feed") {
      jumpPower = 0.12;
      isJumping = true;
    } else if (event.detail === "play") {
      singingUntil = Date.now() + 2500;
    }
  });

  window.addEventListener("mejiroPet", () => {
    pettingUntil = Date.now() + 1200;
  });

  function resizeRenderer() {
    // 表示枠に合わせて描画サイズを調整します（カメラの画角とモデル倍率は維持）。
    const width = Math.max(1, container.clientWidth || 280);
    const height = Math.max(1, container.clientHeight || 280);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(container);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }
  resizeRenderer();

  function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();

    musicNotes.forEach((note, index) => {
      const singing = now < singingUntil && Boolean(bird);
      note.visible = singing;
      if (singing) {
        const time = now * 0.003 + index * 2;
        note.position.set(
          Math.sin(time) * 0.65,
          0.4 + Math.sin(time * 1.5) * 0.25 + index * 0.15,
          0
        );
      }
    });

    if (bird) {
      const idleY = -0.35 + Math.sin(now * 0.002) * 0.025;
      if (isJumping) {
        bird.position.y = idleY + jumpPower;
        jumpPower -= 0.006;
        if (jumpPower <= 0) {
          jumpPower = 0;
          isJumping = false;
        }
      } else {
        bird.position.y = idleY;
      }

      bird.rotation.y = Math.sin(now * 0.001) * 0.05;
      const singing = now < singingUntil;
      const petting = now < pettingUntil;

      // 歌う・なでる動きを合成し、片方がもう片方を打ち消さないようにします。
      bird.rotation.x = singing ? Math.sin(now * 0.012) * 0.07 : 0;
      bird.rotation.z = singing ? Math.sin(now * 0.006) * 0.07 : 0;
      if (petting) {
        const reaction = Math.sin(now * 0.015);
        bird.position.y += Math.abs(reaction) * 0.08;
        bird.rotation.z += reaction * 0.08;
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}
