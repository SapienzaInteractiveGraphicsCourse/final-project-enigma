import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { Settings } from './settings.js';
import { playSfx } from './audio.js';

const hoverSwap = new Map();
let hoveredPart = null;

function animatePartTo(part, targetPosition, targetQuaternion, duration, onCompleteCallback = null) {
    if (part.userData.activeTween) {
        part.userData.activeTween.stop();
        part.userData.activeTween = null;
    }

    const startPosition = part.position.clone();
    const startQuaternion = part.quaternion.clone();
    const progress = { t: 0 };

    const tween = new TWEEN.Tween(progress)
        .to({ t: 1 }, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ t }) => {
            part.position.lerpVectors(startPosition, targetPosition, t);
            part.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, t);
        })
        .onComplete(() => {
            part.userData.activeTween = null;
            if (onCompleteCallback) onCompleteCallback();
        });

    part.userData.activeTween = tween;
    tween.start();
}

export function setSwitchAngle(model, partName, targetAngleDegrees) {
    const part = model.root?.getObjectByName(partName);
    if (!part) return;

    if (!part.userData.restQuaternion) {
        part.userData.restQuaternion = part.quaternion.clone();
    }

    const axis = new THREE.Vector3(0, 0, 1);
    const qDelta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(targetAngleDegrees));
    const targetQuaternion = part.userData.restQuaternion.clone().multiply(qDelta);

    animatePartTo(part, part.position, targetQuaternion, 250);
}

export function setAnimationState(model, animationName, targetState, triggerUiEvent = false) {
    const animation = model.animations[animationName];
    if (!animation || !animation.part) return;

    const stateKey = animation.stateKey;
    if (!(stateKey in model.state)) {
        model.state[stateKey] = false;
    }

    const targetPosition = targetState ? animation.toPosition : animation.fromPosition;
    const targetQuaternion = targetState ? animation.toQuaternion : animation.fromQuaternion;

    if (
        model.state[stateKey] === targetState &&
        !animation.part.userData.activeTween &&
        animation.part.position.distanceToSquared(targetPosition) < 0.000001 &&
        animation.part.quaternion.angleTo(targetQuaternion) < 0.001
    ) {
        return;
    }

    model.state[stateKey] = targetState;
    const isOpening = targetState;

    if (isOpening && animation.sounds?.open) {
        playSfx(animation.sounds.open);
    }

    const posDist = animation.fromPosition.distanceTo(animation.toPosition);
    let fraction = 1;

    if (posDist > 0.0001) {
        const remaining = animation.part.position.distanceTo(targetPosition);
        fraction = remaining / posDist;
    } else {
        const rotAngle = animation.fromQuaternion.angleTo(animation.toQuaternion);
        if (rotAngle > 0.0001) {
            const remainingAngle = animation.part.quaternion.angleTo(targetQuaternion);
            fraction = remainingAngle / rotAngle;
        }
    }

    const duration = animation.milliseconds * Math.max(0, Math.min(1, fraction));

    animatePartTo(animation.part, targetPosition, targetQuaternion, duration, () => {
        if (!isOpening && animation.sounds?.close) {
            playSfx(animation.sounds.close);
        }
    });

    if (animation.uiId) {
        const uiElement = document.getElementById(animation.uiId);
        if (uiElement) {
            uiElement.checked = targetState;
            if (triggerUiEvent) {
                uiElement.dispatchEvent(new Event('change'));
            }
        }
    }
}

export function toggleAnimation(model, animationName) {
    const animation = model.animations[animationName];
    if (!animation) return;

    const currentState = model.state[animation.stateKey] || false;
    setAnimationState(model, animationName, !currentState, true);
}

export function animatePartToState(model, animationName, targetState) {
    setAnimationState(model, animationName, targetState, false);
}

function pickAnimationFromHits(model, hits) {
    let best = null;

    for (const hit of hits) {
        let hitObj = hit.object;

        for (const [name, anim] of Object.entries(model.animations)) {
            if (!anim.clickable || !anim?.part) continue;

            let o = hitObj;
            let stepsUp = 0;
            while (o) {
                if (o === anim.part) {
                    if (
                        !best ||
                        stepsUp > best.stepsUp ||
                        (stepsUp === best.stepsUp && hit.distance < best.hitDistance)
                    ) {
                        best = { name, part: anim.part, stepsUp, hitDistance: hit.distance };
                    }
                    break;
                }
                o = o.parent;
                stepsUp++;
            }
        }
    }

    return best ? { name: best.name, part: best.part } : null;
}

function getRayHits(renderer, camera, mouse, raycaster, raycastRoot, event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const targets = raycastRoot.children ?? [raycastRoot];
    return raycaster.intersectObjects(targets, true);
}

function applyHoverHighlight(renderer, root) {
    if (!root) {
        return;
    }

    if (hoveredPart === root) {
        return;
    }

    if (hoveredPart) {
        clearHoverHighlight(renderer);
    }

    hoveredPart = root;

    const meshes = [];
    root.traverse((node) => {
        if (node.isMesh) {
            meshes.push(node);
        }
    });

    for (const mesh of meshes) {
        let entry = hoverSwap.get(mesh.uuid);
        if (!entry) {
            const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const hoverMaterials = originalMaterials.map((mat) => {
                const emissive_material = mat.clone();
                if ('emissive' in emissive_material) {
                    emissive_material.emissive = new THREE.Color(0x00aaff);
                    emissive_material.emissiveIntensity = 5;
                }
                emissive_material.color = new THREE.Color(0x00aaff);
                return emissive_material;
            });
            entry = { originalMaterials, hoverMaterials, wasArray: Array.isArray(mesh.material) };
            hoverSwap.set(mesh.uuid, entry);
        }

        mesh.material = entry.wasArray ? entry.hoverMaterials : entry.hoverMaterials[0];
    }

    renderer.domElement.style.cursor = 'pointer';
}

function clearHoverHighlight(renderer) {
    if (!hoveredPart) {
        return;
    }

    hoveredPart.traverse((node) => {
        if (!node.isMesh) {
            return;
        }

        const entry = hoverSwap.get(node.uuid);
        if (!entry) {
            return;
        }

        node.material = entry.wasArray ? entry.originalMaterials : entry.originalMaterials[0];
    });

    hoveredPart = null;
    renderer.domElement.style.cursor = 'default';
}

export function enableClickToAnimate(scene, camera, renderer, model) {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const raycastRoot = model.root ?? scene;

    let lastHoverCheck = 0;
    
    let pointerDownPos = { x: 0, y: 0 };

    renderer.domElement.addEventListener('pointerdown', (e) => {
        pointerDownPos.x = e.clientX;
        pointerDownPos.y = e.clientY;
    });

    renderer.domElement.addEventListener('pointermove', (e) => {
        const { clickablesHoverColor } = Settings.get();
        if (clickablesHoverColor) {
            const now = performance.now();
            if (now - lastHoverCheck < 33) {
                return;
            }
            lastHoverCheck = now;

            const hits = getRayHits(renderer, camera, mouse, raycaster, raycastRoot, e);
            const animation = hits.length ? pickAnimationFromHits(model, hits) : null;

            if (!animation) {
                clearHoverHighlight(renderer);
                return;
            }

            applyHoverHighlight(renderer, animation.part);
        }
    });

    renderer.domElement.addEventListener('click', (e) => {
        if (e.button !== 0) {
            return;
        }

        const dx = e.clientX - pointerDownPos.x;
        const dy = e.clientY - pointerDownPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            return;
        }

        const hits = getRayHits(renderer, camera, mouse, raycaster, raycastRoot, e);
        const animation = hits.length ? pickAnimationFromHits(model, hits) : null;
        if (animation) {
            toggleAnimation(model, animation.name);
        }
    });
}

export function toggleAnimationCallback(model, buttonName, animationName) {
    const button = document.getElementById(buttonName);
    button.onclick = () => { toggleAnimation(model, animationName); };
}

export function continuousAnimationController({
    model,
    stateKey,
    applyValue,
    input = 0,
    speed = 1.0,
    clamp = [-1, 1],
}) {
    if (!(stateKey in model.state)) {
        model.state[stateKey] = 0;
    }

    let target = input;

    return {
        setInput: (v) => { target = v; },
        update: (dt) => {
            const [min, max] = clamp;
            const current = model.state[stateKey];
            const next = current + (target - current) * Math.min(1, speed * dt);

            const value = Math.max(min, Math.min(max, next));
            model.state[stateKey] = value;
            applyValue(model, value, dt);
        }
    };
}