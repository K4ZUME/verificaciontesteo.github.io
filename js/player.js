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
let isUnifiedMode = false;

const audio = document.getElementById('audio');
const vinyl = document.getElementById('vinyl');
const visualizer = document.getElementById('visualizer');
const menuView = document.getElementById('menuView');
const playerView = document.getElementById('playerView');
const songsGridUnified = document.getElementById('songsGridUnified');
const miniPlayer = document.getElementById('miniPlayer');
const miniCover = document.getElementById('miniCover');
const miniTitle = document.getElementById('miniTitle');
const miniArtist = document.getElementById('miniArtist');
const miniBtn = document.getElementById('miniBtn');

let animationId = null;

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Obtener ID de la canción de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const requestedTrackId = parseInt(urlParams.get('id'));
    currentTrackId = requestedTrackId || 1;
    isUnifiedMode = !!menuView && !!playerView && !!songsGridUnified;

    if (isUnifiedMode) {
        renderUnifiedSongs();
    }
    
    // Cargar canción
    loadTrack(currentTrackId);

    if (isUnifiedMode) {
        if (requestedTrackId) {
            openPlayerView(false);
        } else {
            closePlayerView(false);
        }
    }
    
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

function renderUnifiedSongs() {
    if (!songsGridUnified) return;

    songsGridUnified.innerHTML = tracks.map(track => {
        const coverStyle = track.coverImage
            ? `background-image: url('${track.coverImage}');`
            : `background: ${getCoverGradient(track.coverGradient)};`;

        return `
            <button class="song-card" type="button" data-track-id="${track.id}" onclick="openTrackFromMenu(${track.id})">
                <div class="song-cover" style="${coverStyle}"></div>
                <div class="song-info">
                    <div class="song-label">${track.description}</div>
                    <div class="song-title">${track.title}</div>
                    <div class="song-artist">${track.artist}</div>
                </div>
                <div class="song-play">▶</div>
            </button>
        `;
    }).join('');

    highlightCurrentTrackCard();
}

function getCoverGradient(gradientClass) {
    const colors = parseGradient(gradientClass);
    return `linear-gradient(135deg, ${colors.join(', ')})`;
}

function highlightCurrentTrackCard() {
    if (!songsGridUnified) return;
    songsGridUnified.querySelectorAll('.song-card').forEach(card => {
        const id = parseInt(card.dataset.trackId);
        card.classList.toggle('active', id === currentTrackId);
    });
}

function openTrackFromMenu(id) {
    currentTrackId = id;
    loadTrack(currentTrackId);
    openPlayerView();
    showDedication();

    if (currentTrack && currentTrack.audioUrl) {
        togglePlay(true);
    }
}

function openPlayerView(animate = true) {
    if (!isUnifiedMode || !playerView) return;
    playerView.classList.remove('hidden-view');
    document.body.classList.add('player-open');

    if (animate) {
        playerView.animate([
            { transform: 'translateY(24px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 }
        ], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }
}

function closePlayerView(animate = true) {
    if (!isUnifiedMode || !playerView) return;

    if (animate) {
        const animation = playerView.animate([
            { transform: 'translateY(0)', opacity: 1 },
            { transform: 'translateY(24px)', opacity: 0 }
        ], { duration: 220, easing: 'ease-in' });

        animation.onfinish = () => {
            playerView.classList.add('hidden-view');
            document.body.classList.remove('player-open');
        };
        return;
    }

    playerView.classList.add('hidden-view');
    document.body.classList.remove('player-open');
}

function showDedication() {
    const dedicationCard = document.getElementById('dedicationCard');
    if (!dedicationCard) return;

    openPlayerView(false);
    dedicationCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showLyricsPanel() {
    const card = document.getElementById('lyricsCard');
    const btn = document.getElementById('lyricsBtn');
    if (!card || !btn) return;

    if (btn.style.display === 'none') return;

    if (!showingLyrics) {
        showingLyrics = true;
        card.style.display = 'block';
        btn.textContent = '🎵 Ocultar Letras';
    }

    openPlayerView(false);
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
    document.getElementById('dedication').textContent = currentTrack.dedication;
    
    // Aplicar imagen de portada o gradiente al vinilo
    if (currentTrack.coverImage) {
        vinyl.style.backgroundImage = `url('${currentTrack.coverImage}')`;
    } else {
        const colors = parseGradient(currentTrack.coverGradient);
        vinyl.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
    }
    
    // Cargar audio
    audio.src = currentTrack.audioUrl;

    updateMiniPlayer();
    highlightCurrentTrackCard();
    
    // Cargar memorias
    loadMemories();
    
    // Cargar letras
    if (currentTrack.lyrics && currentTrack.lyrics.length > 0) {
        document.getElementById('lyricsBtn').style.display = 'block';
        loadLyrics();
        showingLyrics = true;
        document.getElementById('lyricsCard').style.display = 'block';
        document.getElementById('lyricsBtn').textContent = '🎵 Ocultar Letras';
    } else {
        document.getElementById('lyricsBtn').style.display = 'none';
        document.getElementById('lyricsCard').style.display = 'none';
        showingLyrics = false;
    }
    
    // Actualizar botones de navegación
    updateNavButtons();
    
    // Actualizar botón de like
    updateLikeButton();
}

function updateMiniPlayer() {
    if (!isUnifiedMode || !miniPlayer) return;

    miniTitle.textContent = currentTrack?.title || 'Selecciona una canción';
    miniArtist.textContent = currentTrack?.artist || 'Nuestra Historia';

    if (currentTrack?.coverImage) {
        miniCover.style.backgroundImage = `url('${currentTrack.coverImage}')`;
    } else {
        miniCover.style.backgroundImage = 'none';
        miniCover.style.background = getCoverGradient(currentTrack?.coverGradient || 'from-pink-500 via-rose-500 to-red-500');
    }

    if (currentTrack?.id) {
        miniPlayer.classList.add('visible');
    }
}

function updatePlayButtons() {
    const playBtn = document.getElementById('playBtn');
    if (isPlaying) {
        playBtn.classList.add('playing');
        vinyl.classList.add('vinyl-spinning');
        document.getElementById('pulse1').style.display = 'block';
        document.getElementById('pulse2').style.display = 'block';
        animateVisualizer();
    } else {
        playBtn.classList.remove('playing');
        vinyl.classList.remove('vinyl-spinning');
        document.getElementById('pulse1').style.display = 'none';
        document.getElementById('pulse2').style.display = 'none';
        resetVisualizer();
    }

    if (miniBtn) {
        miniBtn.textContent = isPlaying ? '⏸' : '▶';
    }
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
    if (!currentTrack || !currentTrack.audioUrl) return;

    if (audio.paused) {
        audio.play().then(() => {
            isPlaying = true;
            updatePlayButtons();
            saveState();
        }).catch(() => {});
    } else {
        audio.pause();
        isPlaying = false;
        updatePlayButtons();
        saveState();
    }
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
    window.history.replaceState({}, '', `player.html?id=${currentTrackId}`);
    
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
    window.history.replaceState({}, '', `player.html?id=${currentTrackId}`);
    
    loadTrack(currentTrackId);
    if (isPlaying) {
        audio.play();
    }
}

// Toggle letras
function toggleLyrics() {
    const card = document.getElementById('lyricsCard');
    const btn = document.getElementById('lyricsBtn');

    if (!card || !btn || btn.style.display === 'none') {
        return;
    }

    showingLyrics = !showingLyrics;
    
    if (showingLyrics) {
        card.style.display = 'block';
        btn.textContent = '🎵 Ocultar Letras';
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        'orange-400': '#fb923c',
        'red-600': '#dc2626',
        'amber-400': '#fbbf24',
        'blue-400': '#60a5fa',
        'indigo-400': '#818cf8',
        'indigo-500': '#6366f1',
        'purple-400': '#c084fc',
        'purple-500': '#a855f7',
        'purple-600': '#9333ea',
        'gray-400': '#9ca3af',
        'gray-500': '#6b7280',
        'gray-600': '#4b5563',
        'green-400': '#4ade80',
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
