<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>导航栏示例</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <button class="toggle-button" onclick="toggleMode()">切换模式</button>
    <nav>
        <a href="#home">首页</a>
        <a href="#blog">博客</a>
        <a href="#gallery">图集</a>
        <a href="#friends">友链</a>
    </nav>

    <script>
        function toggleMode() {
            document.body.classList.toggle('dark-mode');
            const button = document.querySelector('.toggle-button');
            if (document.body.classList.contains('dark-mode')) {
                button.classList.add('dark-mode');
                button.textContent = '切换到浅色模式';
            } else {
                button.classList.remove('dark-mode');
                button.textContent = '切换到深色模式';
            }
        }
    </script>
</body>
</html>
