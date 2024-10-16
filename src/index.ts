/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

//import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Text } from 'troika-three-text';
import { XR_BUTTONS } from 'gamepad-wrapper';
import { gsap } from 'gsap';
import { init } from './init';

const bullets: { [key: string]: THREE.Mesh } = {};
const forwardVector = new THREE.Vector3(0, 0, -1);
const bulletSpeed = 10;
const bulletTimeToLive = 1;

const blasterGroup = new THREE.Group();
const targets: THREE.Object3D[] = [];
let laserSound: THREE.PositionalAudio;
let scoreSound: THREE.PositionalAudio;

// Global array to store the spheres
const spheres: THREE.Mesh[] = [];
const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });


let score = 0;
const scoreText = new Text();
scoreText.fontSize = 0.52;
scoreText.font = 'assets/SpaceMono-Bold.ttf';
scoreText.position.z = -2;
scoreText.color = 0xffa276;
scoreText.anchorX = 'center';
scoreText.anchorY = 'middle';

function updateScoreDisplay() {
	const clampedScore = Math.max(0, Math.min(9999, score));
	const displayScore = clampedScore.toString().padStart(4, '0');
	scoreText.text = displayScore;
	scoreText.sync();
}


function setupScene({
	scene,
	camera,
	renderer,
	player,
	controllers,
					}: {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	player: THREE.Group;
	controllers: { left: any; right: any };
}) {
	const gltfLoader = new GLTFLoader();

	gltfLoader.load('assets/spacestation.glb', (gltf) => {
		scene.add(gltf.scene);
	});

	gltfLoader.load('assets/blaster.glb', (gltf) => {
		blasterGroup.add(gltf.scene);
	});

	gltfLoader.load('assets/target.glb', (gltf) => {
		for (let i = 0; i < 3; i++) {
			const target = gltf.scene.clone();
			target.position.set(
				Math.random() * 10 - 5,
				i * 2 + 1,
				-Math.random() * 5 - 5,
			);
			scene.add(target);
			targets.push(target);
		}
	});

	scene.add(scoreText);
	scoreText.position.set(0, 0.67, -1.44);
	scoreText.rotateX(-Math.PI / 3.3);
	updateScoreDisplay();


	for (let i = 0; i < 5; i++) {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.2, 32, 32),
			sphereMaterial,
		);
		sphere.position.set(
			Math.random() * 10 - 5,
			Math.random() * 3 + 1,
			-Math.random() * 5 - 5,
		);
		scene.add(sphere);
		spheres.push(sphere);

		// If this is not the first sphere, create a line connecting to the previous sphere
		if (i > 0) {
			const points = [];
			points.push(spheres[i - 1].position);
			points.push(sphere.position);
			const geometry = new THREE.BufferGeometry().setFromPoints(points);
			const line = new THREE.Line(geometry, lineMaterial);
			scene.add(line);
		}
	}


	// Load and set up positional audio
	const listener = new THREE.AudioListener();
	camera.add(listener);

	const audioLoader = new THREE.AudioLoader();
	laserSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/laser.ogg', (buffer) => {
		laserSound.setBuffer(buffer);
		blasterGroup.add(laserSound);
	});

	scoreSound = new THREE.PositionalAudio(listener);
	audioLoader.load('assets/score.ogg', (buffer) => {
		scoreSound.setBuffer(buffer);
		scoreText.add(scoreSound);
	});
}

// Function to add a new sphere and connect it to the last one
function addNewSphere(scene: THREE.Scene) {
	const newSphere = new THREE.Mesh(
		new THREE.SphereGeometry(0.2, 32, 32),
		sphereMaterial,
	);
	newSphere.position.set(
		Math.random() * 10 - 5, // Random position for the new sphere
		Math.random() * 3 + 1,
		-Math.random() * 5 - 5,
	);
	scene.add(newSphere);
	spheres.push(newSphere);

	// Create a line connecting the new sphere to the last one in the spheres array
	if (spheres.length > 1) {
		const points: THREE.Vector3[] = [];
		points.push(spheres[spheres.length - 2].position); // Previous sphere position
		points.push(newSphere.position); // New sphere position
		const geometry = new THREE.BufferGeometry().setFromPoints(points);
		const line = new THREE.Line(geometry, lineMaterial);
		scene.add(line);
	}
}

function onFrame(
	delta: number,
	time: number,
	{
		scene,
		camera,
		renderer,
		player,
		controllers,
	}: {
		scene: THREE.Scene;
		camera: THREE.PerspectiveCamera;
		renderer: THREE.WebGLRenderer;
		player: THREE.Group;
		controllers: { left: any; right: any };
	}
) {
	if (controllers.right) {
		const { gamepad, raySpace, mesh } = controllers.right;
		if (!raySpace.children.includes(blasterGroup)) {
			raySpace.add(blasterGroup);
			mesh.visible = false;
		}
		if (gamepad.getButtonClick(XR_BUTTONS.TRIGGER)) {
			try {
				gamepad.getHapticActuator(0).pulse(0.6, 100);
			} catch {
				// do nothing
			}

			// Play laser sound
			if (laserSound.isPlaying) laserSound.stop();
			laserSound.play();

			const bulletPrototype = blasterGroup.getObjectByName('bullet') as THREE.Mesh; // Ensure it's a Mesh
			if (bulletPrototype) {
				const bullet = bulletPrototype.clone();
				scene.add(bullet);
				bulletPrototype.getWorldPosition(bullet.position);
				bulletPrototype.getWorldQuaternion(bullet.quaternion);

				const directionVector = forwardVector
					.clone()
					.applyQuaternion(bullet.quaternion);
				bullet.userData = {
					velocity: directionVector.multiplyScalar(bulletSpeed),
					timeToLive: bulletTimeToLive,
				};
				bullets[bullet.uuid] = bullet;
			}
		}
	}

	Object.values(bullets).forEach((bullet) => {
		if (bullet.userData.timeToLive < 0) {
			delete bullets[bullet.uuid];
			scene.remove(bullet);
			return;
		}
		const deltaVec = bullet.userData.velocity.clone().multiplyScalar(delta);
		bullet.position.add(deltaVec);
		bullet.userData.timeToLive -= delta;

		targets
			.filter((target) => target.visible)
			.forEach((target) => {
				const distance = target.position.distanceTo(bullet.position);
				if (distance < 1) {
					delete bullets[bullet.uuid];
					scene.remove(bullet);

					gsap.to(target.scale, {
						duration: 0.3,
						x: 0,
						y: 0,
						z: 0,
						onComplete: () => {
							target.visible = false;
							setTimeout(() => {
								target.visible = true;
								target.position.x = Math.random() * 10 - 5;
								target.position.z = -Math.random() * 5 - 5;

								// Scale back up the target
								gsap.to(target.scale, {
									duration: 0.3,
									x: 1,
									y: 1,
									z: 1,
								});
							}, 1000);
						},
					});

					score += 10;
					updateScoreDisplay();
					if (scoreSound.isPlaying) scoreSound.stop();
					scoreSound.play();

					// Add a new sphere and connect it to the existing ones
					addNewSphere(scene);

				}
			});
	});
	// @ts-expect-error This is in the example code of the meta tutorial template
	gsap.ticker.tick(delta);
}

init(setupScene, onFrame);
