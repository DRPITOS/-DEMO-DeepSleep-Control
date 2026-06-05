import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Defines a 4-segment column
interface BedColumn {
    torso: THREE.Group;
    head: THREE.Group;
    thigh: THREE.Group;
    foot: THREE.Group;
}

export class BedScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    // 3 Columns instead of 9 loose segments
    private leftCol!: BedColumn;
    private centerCol!: BedColumn;
    private rightCol!: BedColumn;

    private targetRotations = { h: 0, thigh: 0, f: 0, hug: 0 };
    private currentRotations = { h: 0, thigh: 0, f: 0, hug: 0 };

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupLighting();
        this.build3x4Bed();
        this.adjustCameraForScreen();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.animate();
    }

    private setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffdfb0, 1.2);
        dirLight.position.set(100, 150, 80);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);

        const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -15;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    private build3x4Bed() {
        const mattressMat = new THREE.MeshStandardMaterial({ color: 0x2e3036, roughness: 0.9 });

        // New 4-Row Dimensions (Total length remains 145)
        const w = 32, gap = 1.5, thick = 14;
        const headL = 40, torsoL = 40, thighL = 30, footL = 35;

        // Mathematical Column Generator
        const createColumn = (baseX: number, pivotX: number, meshOffsetX: number): BedColumn => {
            const colGroup = new THREE.Group();
            colGroup.position.set(baseX + pivotX, 0, 0); // Sets the inward hug hinge point

            const torso = new THREE.Group();
            colGroup.add(torso);

            const createMesh = (l: number, offsetZ: number) => {
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(w - gap, thick, l - gap), mattressMat);
                mesh.position.set(meshOffsetX, thick/2, offsetZ);
                mesh.castShadow = true; mesh.receiveShadow = true;
                return mesh;
            };

            // 1. Torso (Fixed Root)
            torso.add(createMesh(torsoL, 0));

            // 2. Head (Hinged at top of Torso)
            const head = new THREE.Group();
            head.position.set(0, 0, -torsoL/2);
            head.add(createMesh(headL, -headL/2));
            torso.add(head);

            // 3. Thigh (Hinged at bottom of Torso)
            const thigh = new THREE.Group();
            thigh.position.set(0, 0, torsoL/2);
            thigh.add(createMesh(thighL, thighL/2));
            torso.add(thigh);

            // 4. Foot/Calf (Hinged at bottom of Thigh - chained movement!)
            const foot = new THREE.Group();
            foot.position.set(0, 0, thighL);
            foot.add(createMesh(footL, footL/2));
            thigh.add(foot);

            this.scene.add(colGroup);
            return { torso, head, thigh, foot };
        };

        // Generate the 3 columns with offset hinges for perfect folding
        this.leftCol = createColumn(-w, w/2, -w/2);
        this.centerCol = createColumn(0, 0, 0);
        this.rightCol = createColumn(w, -w/2, w/2);

        // Base Frame
        const base = new THREE.Mesh(
            new THREE.BoxGeometry((w*3) + 4, 10, headL+torsoL+thighL+footL + 4),
            new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 })
        );
        base.position.set(0, -5, 12.5);
        base.castShadow = true;
        this.scene.add(base);

        // Single Centered Pillow attached to Head
        const pillow = new THREE.Mesh(
            new THREE.BoxGeometry(32, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0xfcecd6, roughness: 1.0 })
        );
        pillow.position.set(0, 17, -28);
        pillow.castShadow = true;
        this.centerCol.head.add(pillow);
    }

    public setRotations(headDeg: number, thighDeg: number, footDeg: number, hugDeg: number) {
        this.targetRotations.h = headDeg * (Math.PI / 180);
        this.targetRotations.thigh = thighDeg * (Math.PI / 180);
        this.targetRotations.f = footDeg * (Math.PI / 180);
        this.targetRotations.hug = hugDeg * (Math.PI / 180);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const lerpSpeed = 0.08;

        this.currentRotations.h += (this.targetRotations.h - this.currentRotations.h) * lerpSpeed;
        this.currentRotations.thigh += (this.targetRotations.thigh - this.currentRotations.thigh) * lerpSpeed;
        this.currentRotations.f += (this.targetRotations.f - this.currentRotations.f) * lerpSpeed;
        this.currentRotations.hug += (this.targetRotations.hug - this.currentRotations.hug) * lerpSpeed;

        const { h, thigh, f, hug } = this.currentRotations;

        // Apply elevations perfectly across all 3 columns
        [this.leftCol, this.centerCol, this.rightCol].forEach(col => {
            col.head.rotation.x = h;
            col.thigh.rotation.x = -thigh; // Negative X tilts UP
            col.foot.rotation.x = f;       // Positive X tilts DOWN relative to Thigh
        });

        // Apply inward Hug
        this.leftCol.torso.rotation.z = -hug;
        this.rightCol.torso.rotation.z = hug;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private adjustCameraForScreen() {
        const aspect = window.innerWidth / window.innerHeight;
        if (aspect < 1) {
            this.camera.fov = 60;
            this.camera.position.set(180, 180, 280);

            // MAGIC NUMBER: Change the middle value to -60 to push the bed up
            this.controls.target.set(-15, -140, 0);
        } else {
            this.camera.fov = 40;
            this.camera.position.set(150, 120, 160);
            this.controls.target.set(0, 0, 0);
        }
        this.controls.update();
        this.camera.updateProjectionMatrix();
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.adjustCameraForScreen();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}