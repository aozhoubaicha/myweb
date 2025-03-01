const element = document.querySelector('.floatbox');
    
element.addEventListener('mouseover', () => {
    element.style.transform = 'translateY(-10px)';
});

element.addEventListener('mouseout', () => {
    element.style.transform = 'translateY(0)';
});
