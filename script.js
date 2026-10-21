// Variables globales
let allPokemons = [];
let filteredPokemons = [];
let currentPage = 1;
let currentLimit = 50;
const totalPokemons = 1025;

function getTotalPages() {
    return Math.ceil(totalPokemons / currentLimit);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadRegions();
    loadStarters();
    loadPokemons(currentPage, currentLimit);
    loadGyms();
    setupEventListeners();
    const initialSection = getSectionFromPath(window.location.pathname);
    showSection(initialSection);  // Mostrar sección según URL o home por defecto
});

window.addEventListener('popstate', () => {
    const section = getSectionFromPath(window.location.pathname);
    showSection(section);
});

function getSectionFromPath(pathname) {
    const path = pathname.toLowerCase().replace(/^\//, '');
    const map = {
        '': 'home',
        'inicio': 'home',
        'regiones': 'regions',
        'iniciales': 'starters',
        'pokedex': 'pokedex',
        'gimnasios': 'gyms',
        'gimnaciosymedallas': 'gyms',
        'gimnasiosymedallas': 'gyms'
    };
    return map[path] || 'home';
}

// Setup de event listeners
function setupEventListeners() {
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });

    // Busqueda y filtro de Pokémon
    document.getElementById('pokemonSearch').addEventListener('input', filterPokemons);
    document.getElementById('typeFilter').addEventListener('change', filterPokemons);

    // Modal
    const modal = document.getElementById('pokemonModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Mostrar sección específica
function showSection(section) {
    const sectionMap = {
        'home': 'inicio',
        'regions': 'regiones',
        'starters': 'iniciales',
        'pokedex': 'pokedex',
        'gyms': 'gimnasios'
    };

    const sectionId = sectionMap[section] || section;

    // Ocultar todas las secciones
    document.querySelectorAll('.section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        if (section === 'pokedex') {
            resetSearch();
            loadPokemons(currentPage, pokedexLimit);
        }
    }

    // Actualizar nav links activos
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        }
    });

    const sectionPathMap = {
        'home': '/inicio',
        'regions': '/regiones',
        'starters': '/iniciales',
        'pokedex': '/pokedex',
        'gyms': '/gimnaciosymedallas'
    };
    const newPath = sectionPathMap[section] || '/';
    if (window.location.pathname.toLowerCase() !== newPath) {
        history.pushState(null, '', newPath);
    }
}

// Cargar Regiones
async function loadRegions() {
    try {
        const response = await fetch('/api/regions');
        const regions = await response.json();
        const grid = document.getElementById('regionsGrid');
        
        grid.innerHTML = regions.map(region => `
            <div class="region-card" style="border-color: ${region.color}">
                <div class="region-icon">${region.icon}</div>
                <div class="region-name">${region.name}</div>
                <div class="region-games">${region.games}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading regions:', error);
    }
}

// Cargar Pokémon Iniciales
async function loadStarters() {
    try {
        const response = await fetch('/api/starters');
        const starters = await response.json();
        const grid = document.getElementById('startersGrid');
        
        grid.innerHTML = starters.map(starter => `
            <div class="starter-card" onclick="showPokemonDetail('${starter.name}')">
                <div class="starter-image">
                    <img src="${starter.image}" alt="${starter.name}" onerror="this.src='https://via.placeholder.com/150'">
                </div>
                <div class="starter-info">
                    <div class="starter-name">#${starter.id} ${starter.name}</div>
                    <div class="starter-types">
                        ${starter.types.map(type => `
                            <span class="type-badge type-${type}">${capitalizeFirst(type)}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading starters:', error);
    }
}

// Cargar PokéDex por página
async function loadPokemons(page = 1, limit = 50) {
    try {
        currentPage = page;
        currentLimit = limit;
        const response = await fetch(`/api/pokemon?limit=${limit}&page=${page}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        allPokemons = await response.json();
        filteredPokemons = allPokemons;
        displayPokemons(filteredPokemons);
        renderPaginationControls();
    } catch (error) {
        console.error('Error loading pokemons:', error);
    }
}

function renderPaginationControls() {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    const totalPages = getTotalPages();
    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

    container.innerHTML = `
        <button class="pagination-button" onclick="gotoPage(${currentPage - 1})" ${prevDisabled}>Anterior</button>
        <span class="pagination-info">Página ${currentPage} de ${totalPages}</span>
        <button class="pagination-button" onclick="gotoPage(${currentPage + 1})" ${nextDisabled}>Siguiente</button>
    `;
}

function gotoPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;
    loadPokemons(page, currentLimit);
}

function changePageSize(value) {
    const nextLimit = Number(value);
    if (!nextLimit || nextLimit === currentLimit) return;
    currentLimit = nextLimit;
    currentPage = 1;
    loadPokemons(currentPage, currentLimit);
}

function resetSearch() {
    document.getElementById('pokemonSearch').value = '';
    document.getElementById('typeFilter').value = '';
}


// Mostrar Pokémon en grid
function displayPokemons(pokemons) {
    const grid = document.getElementById('pokedexGrid');
    
    if (pokemons.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: white; font-size: 1.2em;">No se encontraron Pokémon</p>';
        return;
    }
    
    grid.innerHTML = pokemons.map(pokemon => `
        <div class="pokemon-card" onclick="showPokemonDetail('${pokemon.name}')">
            <div class="pokemon-image">
                <span class="pokemon-number">#${pokemon.id}</span>
                <img src="${pokemon.image}" alt="${pokemon.name}" onerror="this.src='https://via.placeholder.com/150'">
            </div>
            <div class="pokemon-info">
                <div class="pokemon-name">${pokemon.name}</div>
                <div class="pokemon-types">
                    ${pokemon.types.map(type => `
                        <span class="type-badge type-${type}" style="font-size: 0.75em; padding: 0.2em 0.5em;">
                            ${capitalizeFirst(type)}
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Filtrar Pokémon
function filterPokemons() {
    const search = document.getElementById('pokemonSearch').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    filteredPokemons = allPokemons.filter(pokemon => {
        const matchesName = pokemon.name.toLowerCase().includes(search) || 
                          pokemon.id.toString().includes(search);
        const matchesType = !typeFilter || pokemon.types.includes(typeFilter);
        return matchesName && matchesType;
    });

    displayPokemons(filteredPokemons);
}

// Mostrar detalles de Pokémon
async function showPokemonDetail(pokemonName) {
    try {
        const response = await fetch(`/api/pokemon-detail/${pokemonName}`);
        const pokemon = await response.json();

        if (pokemon.error) {
            alert('Error cargando detalles del Pokémon');
            return;
        }

        const statsOrder = ['hp', 'attack', 'defense', 'sp-atk', 'sp-def', 'speed'];
        const maxStat = 255;

        let statsHtml = '';
        statsOrder.forEach(statKey => {
            if (pokemon.stats[statKey] !== undefined) {
                const statValue = pokemon.stats[statKey];
                const percentage = (statValue / maxStat) * 100;
                const statLabel = capitalizeFirst(statKey.replace('-', ' '));
                statsHtml += `
                    <div class="stat-bar">
                        <div class="stat-label">
                            <span>${statLabel}</span>
                            <span>${statValue}</span>
                        </div>
                        <div class="stat-bar-container">
                            <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }
        });

        let evolutionHtml = '';
        if (pokemon.evolution_chain && pokemon.evolution_chain.length > 1) {
            evolutionHtml = `
                <div class="evolution-chain">
                    <h4>Cadena Evolutiva</h4>
                    <div class="evolution-list">
                        ${pokemon.evolution_chain.map(evo => `
                            <div class="evolution-item">${capitalizeFirst(evo)}</div>
                        `).join(' → ')}
                    </div>
                </div>
            `;
        }

        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="modal-header">
                <div class="modal-image">
                    <img src="${pokemon.image}" alt="${pokemon.name}" onerror="this.src='https://via.placeholder.com/200'">
                </div>
                <div>
                    <div class="modal-title">#${pokemon.id} ${pokemon.name}</div>
                    <div class="pokemon-types" style="margin-bottom: 1em;">
                        ${pokemon.types.map(type => `
                            <span class="type-badge type-${type}">${capitalizeFirst(type)}</span>
                        `).join('')}
                    </div>
                    <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
                    <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
                    <p><strong>Habilidades:</strong> ${pokemon.abilities.map(a => capitalizeFirst(a)).join(', ')}</p>
                </div>
            </div>

            <div class="modal-description">
                <strong>Descripción:</strong><br>
                ${pokemon.description}
            </div>

            <div>
                <h4 style="margin-bottom: 1em; color: #FF0000;">Estadísticas Base</h4>
                ${statsHtml}
            </div>

            ${evolutionHtml}
        `;

        document.getElementById('pokemonModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading pokemon detail:', error);
    }
}

// Cargar Gimnasios
async function loadGyms() {
    try {
        const response = await fetch('/api/gyms');
        const gyms = await response.json();
        const container = document.getElementById('gymsContainer');

        // Agrupar por región
        const gymsByRegion = {};
        gyms.forEach(gym => {
            if (!gymsByRegion[gym.region]) {
                gymsByRegion[gym.region] = [];
            }
            gymsByRegion[gym.region].push(gym);
        });

        const html = Object.entries(gymsByRegion).map(([region, regionGyms]) => `
            <div>
                <h3 style="text-align: center; margin-bottom: 2em; color: white; font-size: 1.8em;">${region}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5em;">
                    ${regionGyms.map(gym => `
                        <div class="gym-card" style="border-color: var(--primary-color);">
                            <div class="gym-medal">${gym.medal}</div>
                            <div class="gym-leader">${gym.name}</div>
                            <div class="gym-type">Tipo ${capitalizeFirst(gym.type)}</div>
                            <div class="gym-badge">${gym.badge}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading gyms:', error);
    }
}

// Utilidades
function capitalizeFirst(str) {
    return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

// Actualizar nav cuando se scrollea (removido, ya no se usa scroll)

