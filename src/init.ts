/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

import { XRDevice, metaQuest3 } from 'iwer';

import { DevUI } from '@iwer/devui';
import { GamepadWrapper } from 'gamepad-wrapper';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory';

type Controller = {
	raySpace: THREE.Group;
	gripSpace: THREE.Group;
	mesh: THREE.Object3D;
	gamepad?: GamepadWrapper; // Optional, as not all controllers will have gamepads
};

export async function init(setupScene: (args: { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; player: THREE.Group; controllers: { left: any; right: any } }) => void, onFrame: (delta: number, time: number, globals: any) => void) {
	// iwer setup
	let nativeWebXRSupport = false;
	if (navigator.xr) {
		nativeWebXRSupport = await navigator.xr.isSessionSupported('immersive-vr');
	}
	if (!nativeWebXRSupport) {
		const xrDevice = new XRDevice(metaQuest3);
		xrDevice.installRuntime();
		xrDevice.fovy = (75 / 180) * Math.PI;
		xrDevice.ipd = 0;

		window.xrdevice = xrDevice;
		if (xrDevice?.controllers?.right) {
			// Safe to access right controller
			xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
			xrDevice.controllers.right.quaternion.set(
				0.14766305685043335,
				0.02471366710960865,
				-0.0037767395842820406,
				0.9887216687202454,
			);
		}
		if (xrDevice?.controllers?.left) {
			xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
			xrDevice.controllers.left.quaternion.set(
				0.14766305685043335,
				0.02471366710960865,
				-0.0037767395842820406,
				0.9887216687202454,
			);
		}
		new DevUI(xrDevice);
	}

	const container = document.createElement('div');
	document.body.appendChild(container);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x808080);

	const camera = new THREE.PerspectiveCamera(
		50,
		window.innerWidth / window.innerHeight,
		0.1,
		100,
	);
	camera.position.set(0, 1.6, 3);

	const controls = new OrbitControls(camera, container);
	controls.target.set(0, 1.6, 0);
	controls.update();

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	container.appendChild(renderer.domElement);

	const environment = new RoomEnvironment(renderer);
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	scene.environment = pmremGenerator.fromScene(environment).texture;

	const player = new THREE.Group();
	scene.add(player);
	player.add(camera);

	const controllerModelFactory = new XRControllerModelFactory();
	const controllers: {
		left: Controller | null;
		right: Controller | null;
	} = {
		left: null,
		right: null,
	};
	for (let i = 0; i < 2; i++) {
		const raySpace = renderer.xr.getController(i);
		const gripSpace = renderer.xr.getControllerGrip(i);
		const mesh = controllerModelFactory.createControllerModel(gripSpace);
		gripSpace.add(mesh);
		player.add(raySpace, gripSpace);
		raySpace.visible = false;
		gripSpace.visible = false;
		gripSpace.addEventListener('connected', (e) => {
			raySpace.visible = true;
			gripSpace.visible = true;
			const handedness: 'left' | 'right' | "none" = e.data.handedness;
			if (handedness === 'left' || handedness === 'right') {
				controllers[handedness] = {
					raySpace,
					gripSpace,
					mesh,
					gamepad: e.data.gamepad ? new GamepadWrapper(e.data.gamepad) : undefined,
				};
			}
		});
		gripSpace.addEventListener('disconnected', (e) => {
			raySpace.visible = false;
			gripSpace.visible = false;
			const handedness: 'left' | 'right' | "none" = e.data.handedness;
			if (handedness === 'left' || handedness === 'right') {
				controllers[handedness] = null;
			}
		});
	}

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	window.addEventListener('resize', onWindowResize);

	const globals = {
		scene,
		camera,
		renderer,
		player,
		controllers,
	};

	setupScene(globals);

	const clock = new THREE.Clock();
	function animate() {
		const delta = clock.getDelta();
		const time = clock.getElapsedTime();
		Object.values(controllers).forEach((controller) => {
			if (controller?.gamepad) {
				controller.gamepad.update();
			}
		});
		onFrame(delta, time, globals);
		renderer.render(scene, camera);
	}

	renderer.setAnimationLoop(animate);

	document.body.appendChild(VRButton.createButton(renderer));
}
