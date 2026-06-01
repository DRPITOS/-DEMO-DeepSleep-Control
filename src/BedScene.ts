import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class BedScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    // Bed segments we need to animate
    private hc!: THREE.Group; private hl!: THREE.Group; private hr!: THREE.Group;
    private fc!: THREE.Group; private fl!: THREE.Group; private fr!: THREE.Group;
    private ml!: THREE.Group; private mr!: THREE.Group;

    // Animation states
    private targetRotations = { h: 0, t: 0, hug: 0 };
    private currentRotations = { h: 0, t: 0, hug: 0 };

    private adjustCameraForScreen() {
        const aspect = window.innerWidth / window.innerHeight;

        if (aspect < 1) {
            // Mobile (Portrait Mode): Wider FOV and pulled back further
            this.camera.fov = 60;
            this.camera.position.set(250, 220, 320);
        } else {
            // Desktop (Landscape Mode): Standard FOV and closer
            this.camera.fov = 40;
            this.camera.position.set(150, 120, 160);
        }

        this.camera.updateProjectionMatrix();
    }

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container #${containerId} not found`);

        // Basic Setup
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.adjustCameraForScreen();

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupLighting();
        this.buildBed();

        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start render loop
        this.animate();
    }

    private setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const dirLight = new THREE.DirectionalLight(0xffdfb0, 1.2);
        dirLight.position.set(100, 150, 80);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        this.scene.add(dirLight);

        const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -15;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    private buildBed() {
        const mattressMat = new THREE.MeshStandardMaterial({ color: 0x2e3036, roughness: 0.9 });
        const w = 32, hL = 45, tL = 55, fL = 45, thick = 14, gap = 1.5;

        const createSeg = (width: number, length: number, groupX: number, groupZ: number, meshOffsetX: number, meshOffsetZ: number) => {
            const group = new THREE.Group();
            group.position.set(groupX, 0, groupZ);
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(width - gap, thick, length - gap), mattressMat);
            mesh.position.set(meshOffsetX, thick/2, meshOffsetZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            this.scene.add(group);
            return group;
        };

        this.ml = createSeg(w, tL, -w/2, 0, -w/2, 0);
        createSeg(w, tL, 0, 0, 0, 0);
        this.mr = createSeg(w, tL, w/2, 0, w/2, 0);

        this.hl = createSeg(w, hL, -w/2, -tL/2, -w/2, -hL/2);
        this.hc = createSeg(w, hL, 0, -tL/2, 0, -hL/2);
        this.hr = createSeg(w, hL, w/2, -tL/2, w/2, -hL/2);

        this.fl = createSeg(w, fL, -w/2, tL/2, -w/2, fL/2);
        this.fc = createSeg(w, fL, 0, tL/2, 0, fL/2);
        this.fr = createSeg(w, fL, w/2, tL/2, w/2, fL/2);

        const baseMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
        const base = new THREE.Mesh(new THREE.BoxGeometry((w*3) + 4, 10, hL+tL+fL + 4), baseMat);
        base.position.set(0, -5, 0);
        base.castShadow = true;
        this.scene.add(base);

        const pillowMat = new THREE.MeshStandardMaterial({ color: 0xfcecd6, roughness: 1.0 });
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(32, 6, 16), pillowMat);
        pillow.position.set(0, thick + 2, -30);
        pillow.castShadow = true;
        this.hc.add(pillow);
    }

    public setRotations(headDeg: number, toeDeg: number, hugDeg: number) {
        this.targetRotations.h = headDeg * (Math.PI / 180);
        this.targetRotations.t = toeDeg * (Math.PI / 180);
        this.targetRotations.hug = hugDeg * (Math.PI / 180);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const lerpSpeed = 0.08;

        this.currentRotations.h += (this.targetRotations.h - this.currentRotations.h) * lerpSpeed;
        this.currentRotations.t += (this.targetRotations.t - this.currentRotations.t) * lerpSpeed;
        this.currentRotations.hug += (this.targetRotations.hug - this.currentRotations.hug) * lerpSpeed;

        this.hc.rotation.x = this.hl.rotation.x = this.hr.rotation.x = this.currentRotations.h;
        this.fc.rotation.x = this.fl.rotation.x = this.fr.rotation.x = -this.currentRotations.t;

        this.ml.rotation.z = this.hl.rotation.z = this.fl.rotation.z = -this.currentRotations.hug;
        this.mr.rotation.z = this.hr.rotation.z = this.fr.rotation.z = this.currentRotations.hug;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.adjustCameraForScreen();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}