import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

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

function clickedAnimationName(model, hitObj) {
    for (const [name, anim] of Object.entries(model.animations)) {
        if (!anim.clickable || !anim?.part) {
            continue;
        }

        let o = hitObj;
        while (o) {
            if (o === anim.part) {
                return name;
            }
            o = o.parent;
        }
    }
    return null;
}

export function enableClickToAnimate(scene, camera, renderer, model) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const raycastRoot = model.root ?? scene;
    renderer.domElement.addEventListener('click', (e) => {
        if (e.button !== 0) {
            return;
        }

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(raycastRoot.children ?? [raycastRoot], true);
        if (hits.length === 0) {
            return;
        }

        const hitObject = hits[0].object;
        const animationName = clickedAnimationName(model, hitObject);
        if (animationName) {
            toggleAnimation(model, animationName);
        }
    })
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
            applyValue(model, value);
        }
    };
}
