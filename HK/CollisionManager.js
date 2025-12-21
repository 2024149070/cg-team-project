
import { showWarning } from "./utils.js";
// 모든 type에 대해 동일한 함수 호출을 할 수 있도록, 파라미터를 동일하게 가져감. 
export const CollisionHandlers = {
    "floor": (player, object, isOrtho, isCollision) => {
        if (isCollision) {
            resolveCollision(player, object, isOrtho);
        }
    },
    "obstacle": (player, object, isOrtho, isCollision) => {
        if (isCollision) {
            resolveCollision(player, object, isOrtho);
        }

    },
    "traffic_zone": (player, object, isOrtho, isCollision) => {
        if (!isOrtho && isCollision) {
            resolveLeftBarrierCollision(player,object,isOrtho);
            showWarning("빨간불! 건널 수 없습니다!");
        }
    },
    "step": (player, object, isOrtho, isCollision) => {
        if (!isCollision) {
            object.material.color.copy(object.userData.originalColor);
            object.userData.pressed = false;
            return;
        }
        const pair = object.userData.pair;
        const targetWall = object.userData.target;

        if (isCollision) {
            object.material.color.set(0x7CFC00);
            object.userData.pressed = true;
        }
        if (object.userData.pressed && pair.userData.pressed) {
            if (targetWall && !targetWall.userData.raised) {
                targetWall.userData.raised = true;
                targetWall.position.y += 1.8;
                targetWall.updateMatrixWorld();
                targetWall.bbox.setFromObject(targetWall);
            }
        }
    },
    "goal": (player, object, isOrtho, isCollision) => {
        if (isCollision && player.userData.finish) player.userData.finish();
    },
    "ramp": (player, object, isOrtho, isCollision) => {
        if (!isCollision) return;
        const data = object.userData;
        const playerX = player.position.x;
        let t = (playerX - data.startX) / data.lengthX;
        t = Math.max(0, Math.min(1, t));
        const targetY = data.baseY + (t * (data.topY - data.baseY));
        const playerFeetY = player.bbox.min.y;

        if (playerFeetY <= targetY - 0.20) {
            resolveCollision(player, object, isOrtho)
        }
        else if (playerFeetY <= targetY + 0.01) {
            player.position.y = targetY + (player.bbox.max.y - player.bbox.min.y) / 2;

            if (player.userData.land) {
                player.userData.land(object, isOrtho);
            } else {
                player.userData.isGrounded = true;
                // if (velocity.y < 0) velocity.y = 0; // velocity not accessible here directly unless passed or on player.velocity
                if (player.velocity && player.velocity.y < 0) player.velocity.y = 0;
            }
            player.updateMatrixWorld();
            player.bbox.setFromObject(player);
        }
    },
    "inv": (player, object, isOrtho, isCollision) => {
        const characterPos = player.position
        const dx = Math.abs(characterPos.x - object.position.x);
        const dy = Math.abs(characterPos.y - object.position.y);
        let dz = Math.abs(characterPos.z - object.position.z);

        if (isOrtho) {
            dz = 0; // Ignore Z distance in Ortho mode
        }

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const FADE_START = 8.0; // Start fading in at 8 units
        const FADE_FULL = 4.0;  // Fully visible at 4 units

        let intensity = 0;
        if (distance <= FADE_FULL) {
            intensity = 1;
        } else if (distance <= FADE_START) {
            intensity = 1 - (distance - FADE_FULL) / (FADE_START - FADE_FULL);
        }

        if (intensity < 0) intensity = 0;
        if (intensity > 1) intensity = 1;

        object.material.opacity = intensity;
        if (isCollision) {
            resolveCollision(player, object, isOrtho);

        }
    }
}

//캐릭터가 오브젝트를 통과하지 못하게 튕겨내는 함수.
function resolveCollision(playerMesh, objectMesh, isOrtho) {

    const playerBox = playerMesh.bbox;
    const objectBox = objectMesh.bbox;

    // 3. 각 축별 겹침 정도(Overlap) 계산
    const overlapX = Math.min(playerBox.max.x, objectBox.max.x) - Math.max(playerBox.min.x, objectBox.min.x);
    const overlapY = Math.min(playerBox.max.y, objectBox.max.y) - Math.max(playerBox.min.y, objectBox.min.y);
    let overlapZ = Math.min(playerBox.max.z, objectBox.max.z) - Math.max(playerBox.min.z, objectBox.min.z);
    overlapZ = isOrtho ? Infinity : overlapZ;

    // 4. 가장 적게 겹친 축을 찾아 그 방향으로 밀어내기
    const minOverlap = Math.min(overlapX, overlapY, overlapZ);

    if (minOverlap === overlapX) {
        playerMesh.position.x += (playerMesh.position.x < objectMesh.position.x) ? -overlapX : overlapX;

    } else if (minOverlap === overlapY) {
        playerMesh.position.y += (playerMesh.position.y < objectMesh.position.y) ? -overlapY : overlapY;
        if (playerMesh.userData.land) playerMesh.userData.land(objectMesh, isOrtho);
    } else if (minOverlap === overlapZ) {
        playerMesh.position.z += (playerMesh.position.z < objectMesh.position.z) ? -overlapZ : overlapZ;
    }
    playerMesh.updateMatrixWorld();
    playerMesh.bbox.setFromObject(playerMesh);
}

function resolveLeftBarrierCollision(playerMesh, objectMesh, isOrtho) {
    const playerBox = playerMesh.bbox;
    const objectBox = objectMesh.bbox;

    // 1. 플레이어의 X축 반지름(절반 크기) 계산
    // (플레이어 중심을 object.min.x에 두면 몸 절반이 파묻히므로, 반지름만큼 더 빼줘야 함)
    const playerRadiusX = (playerBox.max.x - playerBox.min.x) / 2;

    // 2. 겹침 계산 (기존과 동일)
    const overlapX = Math.min(playerBox.max.x, objectBox.max.x) - Math.max(playerBox.min.x, objectBox.min.x);
    const overlapY = Math.min(playerBox.max.y, objectBox.max.y) - Math.max(playerBox.min.y, objectBox.min.y);
    let overlapZ = Math.min(playerBox.max.z, objectBox.max.z) - Math.max(playerBox.min.z, objectBox.min.z);
    overlapZ = isOrtho ? Infinity : overlapZ;

    const minOverlap = Math.min(overlapX, overlapY, overlapZ);

    playerMesh.position.x = objectBox.min.x - playerRadiusX - 0.01;
        
        // 관성 제거 (벽에 박았으니 X축 속도가 죽어야 자연스러움)
    if(playerMesh.momentumX) playerMesh.momentumX = 0; // momentumX 변수가 있다면


    // 위치 변경 후 BBox 갱신 필수
    playerMesh.updateMatrixWorld();
    playerMesh.bbox.setFromObject(playerMesh);
}
