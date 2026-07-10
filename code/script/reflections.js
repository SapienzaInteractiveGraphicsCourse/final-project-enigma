import * as THREE from 'three';

export function CubeMapReflections(car, scene, renderer) {
    let carRoot = null;
    if (car) {
        carRoot = car.scene ? car.scene : car;
    }

    if (!carRoot) {
        return;
    }

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(64, { 
        format: THREE.RGBAFormat, 
        generateMipmaps: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);
    scene.add(cubeCamera);
    
    const worldPosition = new THREE.Vector3(); 

    const performUpdate = () => {
        carRoot.visible = false;
        cubeCamera.update(renderer, scene);
        carRoot.visible = true;
    };

    requestAnimationFrame(() => {
        carRoot.getWorldPosition(worldPosition);
        cubeCamera.position.copy(worldPosition);
        cubeCamera.position.y += 0.8;
        
        performUpdate();
        
        carRoot.traverse((child) => {
            if (child.isMesh && child.material) {
                if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
                    child.material.envMap = cubeRenderTarget.texture;
                    child.material.userData.baseEnvIntensity = 2.0; 
                    child.material.envMapIntensity = 2.0; 
                    child.material.needsUpdate = true;
                }
            }
        });
    });

    return {
        camera: cubeCamera,
        updateIntensity: (factor) => {
            if (!carRoot) return;
            carRoot.traverse((child) => {
                if (child.isMesh && child.material && child.material.userData.baseEnvIntensity !== undefined) {
                    const minIntensity = 0.5; 
                    child.material.envMapIntensity = minIntensity + (child.material.userData.baseEnvIntensity - minIntensity) * factor;
                }
            });
        },
        update: () => {
            carRoot.getWorldPosition(worldPosition);
            cubeCamera.position.copy(worldPosition);
            cubeCamera.position.y += 0.8;
            performUpdate();
        }
    };
}