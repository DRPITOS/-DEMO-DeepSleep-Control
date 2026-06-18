import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

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

    // Master group for full bed tilt
    private masterBedGroup: THREE.Group;

    // Single column (4x1 model)
    private bed!: BedColumn;

    // Removed hug, kept tilt
    private targetRotations = {h: 0, thigh: 0, f: 0, tilt: 0};
    private currentRotations = {h: 0, thigh: 0, f: 0, tilt: 0};

    constructor(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) throw new Error(`Container #${containerId} not found`);

        this.scene = new THREE.Scene();
        this.masterBedGroup = new THREE.Group();
        this.scene.add(this.masterBedGroup);

        this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.setupLighting();
        this.build1x4Bed(); // Call the new 4x1 model builder
        this.adjustCameraForScreen();

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const height = entry.contentRect.height;

                if (width > 0 && height > 0) {
                    this.camera.aspect = width / height;
                    this.adjustCameraForScreen();
                    this.renderer.setSize(width, height);
                    this.controls.update();
                    this.renderer.render(this.scene, this.camera);
                }
            }
        });

        resizeObserver.observe(container);
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

        const floorMat = new THREE.ShadowMaterial({opacity: 0.3});
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -15;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    private build1x4Bed() {
        const mattressMat = new THREE.MeshStandardMaterial({color: 0x2e3036, roughness: 0.9});

        // 4x1 Dimensions: Made the bed 96 units wide to match the old total width
        const w = 96, gap = 1.5, thick = 14;
        const headL = 40, torsoL = 40, thighL = 30, footL = 35;

        const colGroup = new THREE.Group();
        const torso = new THREE.Group();
        colGroup.add(torso);

        const createMesh = (l: number, offsetZ: number) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w - gap, thick, l - gap), mattressMat);
            mesh.position.set(0, thick / 2, offsetZ);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        };

        torso.add(createMesh(torsoL, 0));

        const head = new THREE.Group();
        head.position.set(0, 0, -torsoL / 2);
        head.add(createMesh(headL, -headL / 2));
        torso.add(head);

        const thigh = new THREE.Group();
        thigh.position.set(0, 0, torsoL / 2);
        thigh.add(createMesh(thighL, thighL / 2));
        torso.add(thigh);

        const foot = new THREE.Group();
        foot.position.set(0, 0, thighL);
        foot.add(createMesh(footL, footL / 2));
        thigh.add(foot);

        this.masterBedGroup.add(colGroup);
        this.bed = {torso, head, thigh, foot};

        // Solid Base
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(w + 4, 10, headL + torsoL + thighL + footL + 4),
            new THREE.MeshStandardMaterial({color: 0x5d4037, roughness: 0.6})
        );
        base.position.set(0, -5, 12.5);
        base.castShadow = true;
        this.masterBedGroup.add(base);

        // Single Wide Pillow
        const pillow = new THREE.Mesh(
            new THREE.BoxGeometry(32, 5, 14),
            new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 1.0})
        );
        pillow.position.set(0, 17, -28);
        pillow.castShadow = true;
        this.bed.head.add(pillow);
    }

    public setRotations(headDeg: number, thighDeg: number, footDeg: number) {
        this.targetRotations.h = headDeg * (Math.PI / 180);
        this.targetRotations.thigh = thighDeg * (Math.PI / 180);
        this.targetRotations.f = -footDeg * (Math.PI / 180);
    }

    public updateTilt(angleInDegrees: number) {
        this.targetRotations.tilt = angleInDegrees * (Math.PI / 180);
    }

    private animate = () => {
        requestAnimationFrame(this.animate);
        const lerpSpeed = 0.08;

        this.currentRotations.h += (this.targetRotations.h - this.currentRotations.h) * lerpSpeed;
        this.currentRotations.thigh += (this.targetRotations.thigh - this.currentRotations.thigh) * lerpSpeed;
        this.currentRotations.f += (this.targetRotations.f - this.currentRotations.f) * lerpSpeed;
        this.currentRotations.tilt += (this.targetRotations.tilt - this.currentRotations.tilt) * lerpSpeed;

        const {h, thigh, f, tilt} = this.currentRotations;

        // Apply elevations directly to the single bed
        this.bed.head.rotation.x = h;
        this.bed.thigh.rotation.x = -thigh;
        this.bed.foot.rotation.x = f;

        // Apply tilt to the entire bed assembly
        this.masterBedGroup.rotation.z = tilt;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    public resetCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const targetPos = new THREE.Vector3();
        const targetFocus = new THREE.Vector3();

        if (aspect < 1) {
            this.camera.fov = 60;
            targetPos.set(150, 120, 200);
            targetFocus.set(-10, -50, 12.5); // Fixed Bed Center
        } else {
            this.camera.fov = 40;
            targetPos.set(150, 120, 160);
            targetFocus.set(0, -15, 12.5); // Fixed Bed Center
        }

        const startPos = this.camera.position.clone();
        const startFocus = this.controls.target.clone();
        let progress = 0;

        const smoothMove = () => {
            progress += 0.03;
            if (progress < 1) {
                const ease = 1 - Math.pow(1 - progress, 3);
                this.camera.position.lerpVectors(startPos, targetPos, ease);
                this.controls.target.lerpVectors(startFocus, targetFocus, ease);
                this.controls.update();
                requestAnimationFrame(smoothMove);
            } else {
                this.camera.position.copy(targetPos);
                this.controls.target.copy(targetFocus);
                this.controls.update();
            }
        };
        smoothMove();
    }

    private adjustCameraForScreen() {
        const aspect = this.camera.aspect;

        if (aspect < 1) {           // Mobile
            this.camera.fov = 60;
            this.camera.position.set(150, 120, 200);
            this.controls.target.set(-10, -50, 12.5);
        } else {
            this.camera.fov = 40;   // Website
            this.camera.position.set(150, 120, 160);
            this.controls.target.set(0, -15, 12.5);
        }
        this.controls.update();
        this.camera.updateProjectionMatrix();
    }
}