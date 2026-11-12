/* 全站通用脚本：主题切换、标题淡入、开场遮罩收尾 */
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;

    /* ---------- 主题切换（页面上存在 .theme-toggle 时才启用） ---------- */
    const toggleButton = document.querySelector('.theme-toggle');
    if (toggleButton) {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

        const applyTheme = (dark) => {
            body.classList.toggle('dark-mode', dark);
            toggleButton.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            toggleButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
            toggleButton.setAttribute('aria-pressed', String(dark));
        };

        applyTheme(isDark);

        toggleButton.addEventListener('click', () => {
            const dark = !body.classList.contains('dark-mode');
            applyTheme(dark);
            localStorage.setItem('theme', dark ? 'dark' : 'light');
        });
    }

    /* ---------- 文案淡入 + 开场遮罩收尾 ---------- */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intro = window.DGT_INTRO || { key: 'dgt:intro:last', ttl: 86400000, skip: false };
    const overlay = document.querySelector('.opening-overlay');
    const reveal = () => {
        document.querySelectorAll('.fadetext').forEach((el) => el.classList.add('active'));
    };

    const finishOpening = () => {
        if (overlay && overlay.isConnected) overlay.remove();
        body.classList.add('animation-complete');
        reveal();
    };

    if (!overlay || reduceMotion || intro.skip) {
        // 没有开场动画 / 用户偏好少动效 / 距上次不足间隔：直接展示内容
        if (overlay) overlay.remove();
        body.classList.add('animation-complete');
        reveal();
        return;
    }

    // 记录这次播放的时间，作为下次判断的依据
    try {
        localStorage.setItem(intro.key, String(Date.now()));
    } catch (e) {
        /* 存储不可用时忽略 */
    }

    let finished = false;
    const onOverlayAnimationEnd = (event) => {
        // 遮罩内的子元素动画也会冒泡上来，这里只认遮罩自身的淡出
        if (finished || event.target !== overlay) return;
        finished = true;
        finishOpening();
    };

    overlay.addEventListener('animationend', onOverlayAnimationEnd);
    // 兜底：动画事件未触发（如标签页在后台）时也能解锁页面
    setTimeout(() => {
        if (finished) return;
        finished = true;
        finishOpening();
    }, 2500);
});
