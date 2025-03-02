document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.querySelector('.theme-toggle');
    const body = document.body;

    // 检查本地存储和系统偏好
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        body.classList.add('dark-mode');
        toggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // 显示太阳图标
    } else {
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // 显示月亮图标
    }

    // 切换按钮事件
    toggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        
        // 更新图标
        toggleButton.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // 保存用户偏好到本地存储
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });