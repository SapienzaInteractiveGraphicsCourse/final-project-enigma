import * as THREE from 'three';

export function CubeMapReflections(car, scene, renderer) {
    let carRoot = null;
    if (car) {
        carRoot = car.scene ? car.scene : car;
    }

    if (!carRoot) return;

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, { 
        format: THREE.RGBAFormat, 
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
    });
    
    const cubeCamera = new THREE.CubeCamera(0.5, 40, cubeRenderTarget);
    scene.add(cubeCamera);
    
    const worldPosition = new THREE.Vector3(); 
    let frameCounter = 0;
    let isStatic = false;
    let forceNextFrame = false;

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

    const renderCubeMap = () => {
        carRoot.getWorldPosition(worldPosition);
        cubeCamera.position.copy(worldPosition);
        cubeCamera.position.y += 0.8;
        
        carRoot.visible = false;
        
        const oldShadowMap = renderer.shadowMap.enabled;
        renderer.shadowMap.enabled = false;
        
        cubeCamera.update(renderer, scene);
        
        renderer.shadowMap.enabled = oldShadowMap;
        carRoot.visible = true;
    };

    return {
        camera: cubeCamera,
        setStaticMode: (staticState) => {
            isStatic = staticState;
            if (isStatic) {
                forceNextFrame = true;
            }
        },
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
            if (isStatic && !forceNextFrame) return;

            frameCounter++;
        
            if (forceNextFrame || frameCounter % 3 === 0) {
                renderCubeMap();
                forceNextFrame = false;
            }
        }
    };
}