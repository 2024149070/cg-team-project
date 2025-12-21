export function lerp(a, b, t) {
    return a + (b - a) * t;
}
let warningTimer = null;
export function showWarning(message) {
    const warningDiv = document.getElementById('warning-msg');
    if (!warningDiv) return;

    // 🚨 경고 문구 앞에 아이콘을 붙여주면 더 효과적입니다.
    warningDiv.innerHTML = `⚠️ ${message}`;
    warningDiv.style.opacity = '1';
    // 경고는 더 위급해 보이게 약간 커지는 애니메이션 추가 (선택사항)
    warningDiv.style.transform = 'translateX(-50%) scale(1.1)';


    if (warningTimer) clearTimeout(warningTimer);

    // 1.5초 후 빠르게 사라짐
    warningTimer = setTimeout(() => {
        warningDiv.style.opacity = '0';
        warningDiv.style.transform = 'translateX(-50%) scale(1.0)';
    }, 1500);
}