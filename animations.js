import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { Settings } from './settings.js';

const hoverSwap = new Map();
let hoveredPart = null;
const uiBindings = new Map();

function toggleAnimation(model, animationName) {
    const animation = model.animations[animationName];
    if (!animation) {
        return;
    }

    const stateKey = animation.stateKey;
    if (!(stateKey in model.state)) {
        model.state[stateKey] = false;
    }

    if (animation.activeTween) {
        animation.activeTween.stop();
        animation.activeTween = null;
    }

    const state = model.state[stateKey];
    const targetPosition = !state ? animation.toPosition : animation.fromPosition;
    const targetQuaternion = !state ? animation.toQuaternion : animation.fromQuaternion;

    model.state[stateKey] = !model.state[stateKey];

    const boundCheckbox = uiBindings.get(animationName);
    if (boundCheckbox) {
        boundCheckbox.checked = model.state[stateKey];
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

    const progress = { t: 0 };
    const startPosition = animation.part.position.clone();
    const startQuaternion = animation.part.quaternion.clone();

    const tween = new TWEEN.Tween(progress)
        .to({ t: 1 }, duration)
        .onUpdate(({ t }) => {
            animation.part.position.lerpVectors(startPosition, targetPosition, t);
            animation.part.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, t);
        })
        .onComplete(() => {
            animation.activeTween = null;
        });

    animation.activeTween = tween;
    tween.start();
}

function clickedAnimation(model, hitObj) {
    for (const [name, anim] of Object.entries(model.animations)) {
        if (!anim.clickable || !anim?.part) {
            continue;
        }

        let o = hitObj;
        while (o) {
            if (o === anim.part) {
                return { name, part: anim.part };
            }
            o = o.parent;
        }
    }
    return null;
}

function applyHoverHighlight(renderer, mesh) {
    if (!mesh || !mesh.isMesh || hoveredPart === mesh) {
        return;
    }

    if (hoveredPart) clearHoverHighlight(renderer);

    hoveredPart = mesh;

    let entry = hoverSwap.get(mesh.uuid);
    if (!entry) {
        const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const hoverMaterials = originalMaterials.map((mat) => {
            const emissive_material = mat.clone();
            if ('emissive' in emissive_material) {
                emissive_material.emissive = new THREE.Color(0x00aaff);
                emissive_material.emissiveIntensity = 5;
            }
            return emissive_material;
        });
        entry = { originalMaterials, hoverMaterials, wasArray: Array.isArray(mesh.material) };
        hoverSwap.set(mesh.uuid, entry);
    }

    mesh.material = entry.wasArray ? entry.hoverMaterials : entry.hoverMaterials[0];
    renderer.domElement.style.cursor = 'pointer';
}

function clearHoverHighlight(renderer) {
    if (!hoveredPart) {
        return;
    }

    const entry = hoverSwap.get(hoveredPart.uuid);
    if (entry) {
        hoveredPart.material = entry.wasArray
            ? entry.originalMaterials
            : entry.originalMaterials[0];
    }

    hoveredPart = null;
    renderer.domElement.style.cursor = 'default';
}

function raycastForPartHit(renderer, camera, mouse, raycaster, raycastRoot, event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(raycastRoot.children ?? [raycastRoot], true);
    if (hits.length === 0) {
        return null;
    }

    return hits[0].object;
}

export function enableClickToAnimate(scene, camera, renderer, model) {
    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const raycastRoot = model.root ?? scene;

    let lastHoverCheck = 0;
    renderer.domElement.addEventListener('pointermove', (e) => {
        const { clickablesHoverColor } = Settings.get();
        if (clickablesHoverColor) {
            const now = performance.now();
            if (now - lastHoverCheck < 33) {
                return;
            }
            lastHoverCheck = now;

            const hitObject = raycastForPartHit(renderer, camera, mouse, raycaster, raycastRoot, e);
            if (!hitObject || !hitObject.isMesh) {
                clearHoverHighlight(renderer);
                return;
            }

            const animation = clickedAnimation(model, hitObject);
            if (!animation) {
                clearHoverHighlight(renderer);
                return;
            }

            applyHoverHighlight(renderer, hitObject);
        }
    });

    renderer.domElement.addEventListener('click', (e) => {
        if (e.button !== 0) {
            return;
        }

        const hitObject = raycastForPartHit(renderer, camera, mouse, raycaster, raycastRoot, e);
        if (!hitObject) {
            return;
        }

        const animation = clickedAnimation(model, hitObject);
        if (animation) {
            toggleAnimation(model, animation.name);
        }
    })
}

export function toggleAnimationCallback(model, buttonName, animationName) {
    const button = document.getElementById(buttonName);
    if (!button) return;

    uiBindings.set(animationName, button);

    button.addEventListener('change', (e) => {
        const animation = model.animations[animationName];
        
        if (model.state[animation.stateKey] !== e.target.checked) {
            toggleAnimation(model, animationName);
        }
    });
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
            applyValue(model, value);
        }
    };
}
