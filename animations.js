import * as TWEEN from '@tweenjs/tween.js'

export function toggleAnimationCallback(model, stateKey, buttonName, animationName) {
    const button = document.getElementById(buttonName);

    button.onclick = () => {
        const animation = model.animations[animationName];
        if (!animation || !(stateKey in model.state)) {
            return;
        }

        if (animation.activeTween) {
            animation.activeTween.stop();
            animation.activeTween = null;
        }

        const state = model.state[stateKey];
        const targetPosition = !state ? animation.toPosition : animation.fromPosition;
        const targetQuaternion = !state ? animation.toQuaternion : animation.fromQuaternion;

        model.state[stateKey] = !model.state[stateKey];

        const position = animation.part.position;

        const totalDistance = animation.fromPosition.distanceTo(animation.toPosition);
        const remainingDistance = position.distanceTo(targetPosition);
        const fraction = totalDistance > 0 ? remainingDistance / totalDistance : 1;
        const duration = animation.milliseconds * Math.max(0, Math.min(1, fraction));

        const rotationProgress = { t: 0 };
        const fromQuaternion = animation.part.quaternion.clone();

        const tween = new TWEEN.Tween(rotationProgress)
            .to({ t: 1 }, duration)
            .onStart(() => {
                new TWEEN.Tween(position).to(targetPosition, duration).start();
            })
            .onUpdate(({ t }) => {
                animation.part.quaternion.slerpQuaternions(fromQuaternion, targetQuaternion, t);
            })
            .onComplete(() => {
                animation.activeTween = null;
            })

        animation.activeTween = tween;
        tween.start();
    };
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
