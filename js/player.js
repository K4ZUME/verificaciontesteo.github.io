// Verificar autenticación
if (!sessionStorage.getItem('authenticated')) {
    window.location.href = 'login.html';
}

// Variables globales
let currentTrack = null;
let currentTrackId = 1;
let isPlaying = false;
let showingLyrics = false;
let isLooping = false;
let isDragging = false;
let wasPlayingBeforeDrag = false;

const audio = document.getElementById('audio');
const vinyl = document.getElementById('vinyl');
const visualizer = document.getElementById('visualizer');

let animationId = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Obtener ID de la canción de la URL
    const urlParams = new URLSearchParams(window.location.search);
    currentTrackId = parseInt(urlParams.get('id')) || 1;
    
    // Cargar canción
    loadTrack(currentTrackId);
    
    // Crear estrellas
    createStars();
    
    // Crear visualizador
    createVisualizer();
    
    // Event listeners
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', nextTrack);
    
    // Event listeners para arrastre de la barra de progreso
    const progressBar = document.getElementById('progressBar');
    progressBar.addEventListener('mousedown', startDrag);
    progressBar.addEventListener('touchstart', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    
    // Atajos de teclado
    document.addEventListener('keydown', handleKeyPress);
    
    // Cargar estado guardado
    loadState();
});

// Crear estrellas
function createStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 30; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 5 + 's';
        star.style.animationDuration = Math.random() * 3 + 2 + 's';
        starsContainer.appendChild(star);
    }
}

// Crear visualizador
function createVisualizer() {
    for (let i = 0; i < 40; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        bar.style.animationDelay = Math.random() * 0.5 + 's';
        visualizer.appendChild(bar);
    }
}

// Cargar canción
function loadTrack(id) {
    currentTrack = tracks.find(t => t.id === id);
    if (!currentTrack) {
        currentTrack = tracks[0];
        currentTrackId = currentTrack.id;
    }
    
    // Actualizar UI
    document.getElementById('pageTitle').textContent = `${currentTrack.title} - Para Ti`;
    document.getElementById('trackLabel').textContent = currentTrack.description;
    document.getElementById('trackTitle').textContent = currentTrack.title;
    document.getElementById('trackArtist').textContent = currentTrack.artist;
    document.getElementById('dedication').textContent = `"${currentTrack.dedication}"`;
    
    // Aplicar imagen de portada o gradiente al vinilo
    if (currentTrack.coverImage) {
        vinyl.style.backgroundImage = `url('${currentTrack.coverImage}')`;
    } else {
        const colors = parseGradient(currentTrack.coverGradient);
        vinyl.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
    }
    
    // Cargar audio
    audio.src = currentTrack.audioUrl;
    
    // Cargar memorias
    loadMemories();
    
    // Cargar letras
    if (currentTrack.lyrics && currentTrack.lyrics.length > 0) {
        document.getElementById('lyricsBtn').style.display = 'block';
        loadLyrics();
    } else {
        document.getElementById('lyricsBtn').style.display = 'none';
        document.getElementById('lyricsCard').style.display = 'none';
    }
    
    // Actualizar botones de navegación
    updateNavButtons();
    
    // Actualizar botón de like
    updateLikeButton();
}

// Cargar memorias
function loadMemories() {
    const container = document.getElementById('memories');
    container.innerHTML = '';
    
    if (currentTrack.memories && currentTrack.memories.length > 0) {
        currentTrack.memories.forEach(memory => {
            const card = document.createElement('div');
            card.className = 'memory-card glass-panel';
            card.style.background = memory.color;
            card.textContent = memory.caption;
            container.appendChild(card);
        });
    }
}

// Cargar letras
function loadLyrics() {
    const container = document.getElementById('lyricsContainer');
    container.innerHTML = '';
    
    if (currentTrack.lyrics && currentTrack.lyrics.length > 0) {
        // Organizar letras por secciones
        let currentSection = null;
        let currentLines = [];
        let hasSections = false;
        
        currentTrack.lyrics.forEach((line) => {
            const text = line.text || '';
            
            // Detectar títulos de sección
            if (text.match(/^\[(.*?)\]$/)) {
                hasSections = true;
                // Guardar sección anterior
                if (currentSection && currentLines.length > 0) {
                    createLyricsSection(container, currentSection, currentLines);
                }
                // Nueva sección
                currentSection = text.replace(/[\[\]]/g, '');
                currentLines = [];
            } else if (text.trim() && text !== '♪') {
                currentLines.push(text);
            }
        });
        
        // Agregar última sección
        if (currentSection && currentLines.length > 0) {
            createLyricsSection(container, currentSection, currentLines);
        }
        
        // Si no hay secciones marcadas, mostrar toda la letra como una sola sección
        if (!hasSections && currentLines.length > 0) {
            createLyricsSection(container, 'Letra', currentLines);
        }
    } else {
        container.innerHTML = '<div class="lyrics-empty">Disfruta la melodía 🎵</div>';
    }
}

// Crear sección de letra
function createLyricsSection(container, title, lines) {
    const section = document.createElement('div');
    section.className = 'lyrics-section';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'lyrics-section-title';
    titleEl.textContent = title;
    section.appendChild(titleEl);
    
    const textEl = document.createElement('div');
    textEl.className = 'lyrics-text';
    textEl.innerHTML = lines.join('<br>');
    section.appendChild(textEl);
    
    container.appendChild(section);
}

// Actualizar letras durante reproducción
function updateLyrics() {
    // Función mantenida por compatibilidad pero sin funcionalidad
    // Las letras ahora son estáticas
}

// Toggle play/pause
function togglePlay() {
    const playBtn = document.getElementById('playBtn');
    if (audio.paused) {
        audio.play();
        isPlaying = true;
        playBtn.classList.add('playing');
        vinyl.classList.add('vinyl-spinning');
        document.getElementById('pulse1').style.display = 'block';
        document.getElementById('pulse2').style.display = 'block';
        animateVisualizer();
    } else {
        audio.pause();
        isPlaying = false;
        playBtn.classList.remove('playing');
        vinyl.classList.remove('vinyl-spinning');
        document.getElementById('pulse1').style.display = 'none';
        document.getElementById('pulse2').style.display = 'none';
        resetVisualizer();
    }
    
    saveState();
}

// Animar visualizador
function animateVisualizer() {
    const bars = document.querySelectorAll('.audio-bar');
    
    function updateBars() {
        if (!isPlaying) return;
        
        bars.forEach(bar => {
            const height = Math.random() * 70 + 15;
            bar.style.height = `${height}%`;
        });
        
        animationId = requestAnimationFrame(updateBars);
    }
    
    updateBars();
}

// Resetear visualizador
function resetVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    const bars = document.querySelectorAll('.audio-bar');
    bars.forEach(bar => {
        bar.style.height = '15%';
    });
}

// Actualizar progreso
function updateProgress() {
    const percent = (audio.currentTime / audio.duration) * 100 || 0;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('currentTime').textContent = formatTime(audio.currentTime);
    
    // Animar barras del visualizador aleatoriamente
    if (isPlaying && Math.random() > 0.7) {
        const bars = document.querySelectorAll('.audio-bar');
        const randomBar = bars[Math.floor(Math.random() * bars.length)];
        randomBar.style.height = Math.random() * 70 + 15 + '%';
    }
}

// Actualizar duración
function updateDuration() {
    document.getElementById('duration').textContent = formatTime(audio.duration);
}

// Formatear tiempo
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Funciones de arrastre para la barra de progreso (compatible con PC y móviles)
function startDrag(event) {
    isDragging = true;
    wasPlayingBeforeDrag = !audio.paused;
    
    // Pausar el audio mientras se arrastra
    if (wasPlayingBeforeDrag) {
        audio.pause();
    }
    
    updateSeek(event);
    event.preventDefault();
}

function drag(event) {
    if (isDragging) {
        updateSeek(event);
        event.preventDefault();
    }
}

function stopDrag(event) {
    if (isDragging) {
        isDragging = false;
        
        // Reanudar el audio si estaba reproduciendo antes
        if (wasPlayingBeforeDrag) {
            audio.play();
            wasPlayingBeforeDrag = false;
        }
        
        event.preventDefault();
    }
}

function updateSeek(event) {
    const bar = document.getElementById('progressBar');
    const rect = bar.getBoundingClientRect();
    
    // Obtener posición X tanto para mouse como para touch
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const percent = (clientX - rect.left) / rect.width;
    
    // Asegurar que el porcentaje esté entre 0 y 1
    const clampedPercent = Math.max(0, Math.min(1, percent));
    audio.currentTime = clampedPercent * audio.duration;
}

// Función de clic directo (mantener compatibilidad)
function seek(event) {
    if (!isDragging) {
        updateSeek(event);
    }
}

// Siguiente canción
function nextTrack() {
    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    const nextIndex = (currentIndex + 1) % tracks.length;
    currentTrackId = tracks[nextIndex].id;
    
    // Actualizar URL sin recargar
    window.history.pushState({}, '', `player.html?id=${currentTrackId}`);
    
    loadTrack(currentTrackId);
    if (isPlaying) {
        audio.play();
    }
    
    createHeartExplosion();
}

// Canción anterior
function previousTrack() {
    const currentIndex = tracks.findIndex(t => t.id === currentTrackId);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    currentTrackId = tracks[prevIndex].id;
    
    // Actualizar URL sin recargar
    window.history.pushState({}, '', `player.html?id=${currentTrackId}`);
    
    loadTrack(currentTrackId);
    if (isPlaying) {
        audio.play();
    }
}

// Toggle letras
function toggleLyrics() {
    const card = document.getElementById('lyricsCard');
    const btn = document.getElementById('lyricsBtn');
    showingLyrics = !showingLyrics;
    
    if (showingLyrics) {
        card.style.display = 'block';
        btn.textContent = '🎵 Ocultar Letras';
    } else {
        card.style.display = 'none';
        btn.textContent = '📝 Ver Letras';
    }
}

// Toggle loop
function toggleLoop() {
    isLooping = !isLooping;
    audio.loop = isLooping;
    const btn = document.getElementById('loopBtn');
    
    if (isLooping) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
    
    saveState();
}

// Toggle like
function toggleLike() {
    const likes = getLikes();
    const index = likes.indexOf(currentTrackId);
    
    if (index > -1) {
        likes.splice(index, 1);
    } else {
        likes.push(currentTrackId);
        createHeartExplosion();
    }
    
    localStorage.setItem('likedTracks', JSON.stringify(likes));
    updateLikeButton();
}

// Actualizar botón de like
function updateLikeButton() {
    const likes = getLikes();
    const btn = document.getElementById('likeBtn');
    
    if (likes.includes(currentTrackId)) {
        btn.classList.add('liked');
    } else {
        btn.classList.remove('liked');
    }
}

// Obtener likes
function getLikes() {
    return JSON.parse(localStorage.getItem('likedTracks') || '[]');
}

// Crear explosión de corazones
function createHeartExplosion() {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            createFloatingHeart(
                window.innerWidth / 2 + (Math.random() - 0.5) * 200,
                window.innerHeight / 2 + (Math.random() - 0.5) * 200
            );
        }, i * 50);
    }
}

// Crear corazón flotante
function createFloatingHeart(x, y) {
    const heart = document.createElement('div');
    heart.className = 'floating-heart';
    heart.textContent = '❤️';
    heart.style.left = x + 'px';
    heart.style.top = y + 'px';
    heart.style.fontSize = (Math.random() * 20 + 20) + 'px';
    document.body.appendChild(heart);
    
    setTimeout(() => heart.remove(), 4000);
}

// Actualizar botones de navegación
function updateNavButtons() {
    // Siempre habilitados porque es circular
    document.getElementById('prevBtn').disabled = false;
    document.getElementById('nextBtn').disabled = false;
}

// Manejar teclas
function handleKeyPress(e) {
    switch(e.key) {
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowRight':
            nextTrack();
            break;
        case 'ArrowLeft':
            previousTrack();
            break;
        case 'ArrowUp':
            e.preventDefault();
            audio.volume = Math.min(1, audio.volume + 0.1);
            break;
        case 'ArrowDown':
            e.preventDefault();
            audio.volume = Math.max(0, audio.volume - 0.1);
            break;
    }
}

// Guardar estado
function saveState() {
    const state = {
        trackId: currentTrackId,
        currentTime: audio.currentTime,
        isPlaying: isPlaying,
        isLooping: isLooping
    };
    localStorage.setItem('playerState', JSON.stringify(state));
}

// Cargar estado
function loadState() {
    const state = JSON.parse(localStorage.getItem('playerState') || '{}');
    
    if (state.trackId && state.currentTime && !window.location.search) {
        // Solo restaurar si no hay ID en la URL
        currentTrackId = state.trackId;
        loadTrack(currentTrackId);
        audio.currentTime = state.currentTime;
    }
    
    // Restaurar estado de loop
    if (state.isLooping) {
        isLooping = true;
        audio.loop = true;
        document.getElementById('loopBtn').classList.add('active');
    }
}

// Parsear gradiente Tailwind
function parseGradient(gradient) {
    const colorMap = {
        'pink-500': '#ec4899',
        'rose-500': '#f43f5e',
        'red-500': '#ef4444',
        'blue-400': '#60a5fa',
        'indigo-500': '#6366f1',
        'purple-500': '#a855f7',
        'purple-600': '#9333ea',
        'emerald-400': '#34d399',
        'teal-500': '#14b8a6',
        'cyan-500': '#06b6d4',
        'fuchsia-500': '#d946ef'
    };
    
    const colors = gradient
        .replace('from-', '')
        .replace('via-', '')
        .replace('to-', '')
        .split(' ')
        .map(c => colorMap[c] || '#ec4899');
    
    return colors;
}

// Corazones aleatorios durante reproducción
setInterval(() => {
    if (isPlaying) {
        createFloatingHeart(
            Math.random() * window.innerWidth,
            Math.random() * window.innerHeight
        );
    }
}, 3000);
