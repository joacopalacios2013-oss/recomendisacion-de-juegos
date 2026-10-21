from flask import Flask, render_template, jsonify, request
import requests
from functools import lru_cache

app = Flask(__name__)

# Cache para las llamadas a la PokeAPI
@lru_cache(maxsize=128)
def get_pokemon_data(pokemon_id):
    try:
        response = requests.get(f'https://pokeapi.co/api/v2/pokemon/{pokemon_id}/', timeout=10)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return None

@lru_cache(maxsize=32)
def get_pokemon_species(pokemon_id):
    try:
        response = requests.get(f'https://pokeapi.co/api/v2/pokemon-species/{pokemon_id}/', timeout=10)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return None

@app.route('/')
@app.route('/inicio')
@app.route('/regiones')
@app.route('/iniciales')
@app.route('/pokedex')
@app.route('/gimnasios')
@app.route('/gimnaciosymedallas')
@app.route('/gimnasiosymedallas')
def index():
    return render_template('index.html')

@app.route('/api/starters')
def get_starters():
    """Obtiene los Pokémon iniciales de todas las regiones"""
    starters_ids = [
        # Kanto
        1, 4, 7,  # Bulbasaur, Charmander, Squirtle
        # Johto
        152, 155, 158,  # Chikorita, Cyndaquil, Totodile
        # Hoenn
        252, 255, 258,  # Treecko, Torchic, Mudkip
        # Sinnoh
        387, 390, 393,  # Turtwig, Chimchar, Piplup
        # Unova
        495, 498, 501,  # Snivy, Tepig, Oshawott
        # Kalos
        650, 653, 656,  # Chespin, Fennekin, Froakie
        # Alola
        722, 725, 728,  # Rowlet, Litten, Popplio
        # Galar
        810, 813, 816,  # Grookey, Scorbunny, Sobble
    ]
    
    starters = []
    for idx in starters_ids:
        data = get_pokemon_data(idx)
        if data:
            # Usar imagen oficial si existe, sino la default
            image = data['sprites'].get('other', {}).get('official-artwork', {}).get('front_default')
            if not image:
                image = data['sprites'].get('front_default')
            starters.append({
                'id': data['id'],
                'name': data['name'].capitalize(),
                'image': image,
                'types': [t['type']['name'] for t in data['types']]
            })
    
    return jsonify(starters)

@app.route('/api/pokemon')
def get_pokemons_paginated():
    """Obtiene los Pokémon paginados"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    page = max(1, page)
    limit = max(1, min(limit, 100))
    start = (page - 1) * limit + 1
    end = min(start + limit - 1, 1025)

    pokemons = []
    for i in range(start, end + 1):
        data = get_pokemon_data(i)
        if data:
            image = data['sprites'].get('other', {}).get('official-artwork', {}).get('front_default')
            if not image:
                image = data['sprites'].get('front_default')
            pokemons.append({
                'id': data['id'],
                'name': data['name'].capitalize(),
                'image': image,
                'types': [t['type']['name'] for t in data['types']],
                'height': data['height'],
                'weight': data['weight']
            })

    return jsonify(pokemons)

@app.route('/api/pokemon/<int:limit>')
def get_pokemons(limit=151):
    """Obtiene los primeros Pokémon"""
    pokemons = []
    for i in range(1, min(limit + 1, 1026)):
        data = get_pokemon_data(i)
        if data:
            # Usar imagen oficial si existe, sino la default
            image = data['sprites'].get('other', {}).get('official-artwork', {}).get('front_default')
            if not image:
                image = data['sprites'].get('front_default')
            pokemons.append({
                'id': data['id'],
                'name': data['name'].capitalize(),
                'image': image,
                'types': [t['type']['name'] for t in data['types']],
                'height': data['height'],
                'weight': data['weight']
            })
    
    return jsonify(pokemons)

@app.route('/api/pokemon-detail/<pokemon_name>')
def get_pokemon_detail(pokemon_name):
    """Obtiene detalles completos de un Pokémon"""
    try:
        response = requests.get(f'https://pokeapi.co/api/v2/pokemon/{pokemon_name.lower()}/', timeout=10)
        if response.status_code == 200:
            data = response.json()
            species_response = requests.get(f'https://pokeapi.co/api/v2/pokemon-species/{pokemon_name.lower()}/', timeout=10)
            species_data = species_response.json() if species_response.status_code == 200 else {}
            
            # Obtener cadena evolutiva
            evolution_chain = []
            if 'evolution_chain' in species_data:
                try:
                    evo_url = species_data['evolution_chain']['url']
                    evo_response = requests.get(evo_url, timeout=10)
                    if evo_response.status_code == 200:
                        evo_data = evo_response.json()
                        # Procesar cadena evolutiva
                        def extract_evolutions(chain, evo_list=[]):
                            evo_list.append(chain['species']['name'])
                            if chain['evolves_to']:
                                for evolution in chain['evolves_to']:
                                    extract_evolutions(evolution, evo_list)
                            return evo_list
                        evolution_chain = extract_evolutions(evo_data['chain'])
                except:
                    pass
            
            return jsonify({
                'id': data['id'],
                'name': data['name'].capitalize(),
                'image': data['sprites'].get('other', {}).get('official-artwork', {}).get('front_default') or data['sprites'].get('front_default'),
                'types': [t['type']['name'] for t in data['types']],
                'height': data['height'],
                'weight': data['weight'],
                'abilities': [a['ability']['name'] for a in data['abilities']],
                'stats': {s['stat']['name']: s['base_stat'] for s in data['stats']},
                'description': species_data.get('flavor_text_entries', [{}])[0].get('flavor_text', 'No description available').replace('\n', ' '),
                'evolution_chain': evolution_chain
            })
    except:
        pass
    
    return jsonify({'error': 'Pokemon not found'}), 404

@app.route('/api/regions')
def get_regions():
    """Obtiene las regiones de Pokémon"""
    regions = [
        {'name': 'Kanto', 'icon': '🔴', 'color': '#FF0000', 'games': 'Red/Blue/Yellow'},
        {'name': 'Johto', 'icon': '💛', 'color': '#FFD700', 'games': 'Gold/Silver/Crystal'},
        {'name': 'Hoenn', 'icon': '🌊', 'color': '#0099FF', 'games': 'Ruby/Sapphire'},
        {'name': 'Sinnoh', 'icon': '❄️', 'color': '#87CEEB', 'games': 'Diamond/Pearl'},
        {'name': 'Unova', 'icon': '🏙️', 'color': '#696969', 'games': 'Black/White'},
        {'name': 'Kalos', 'icon': '✨', 'color': '#FFB6C1', 'games': 'X/Y'},
        {'name': 'Alola', 'icon': '🌴', 'color': '#FF8C00', 'games': 'Sun/Moon'},
        {'name': 'Galar', 'icon': '⚔️', 'color': '#8B0000', 'games': 'Sword/Shield'},
    ]
    return jsonify(regions)

@app.route('/api/gyms')
def get_gyms():
    """Obtiene información de gimnasios y medallas"""
    gyms = [
        # Kanto
        {'region': 'Kanto', 'name': 'Brock', 'type': 'Rock', 'medal': '🥉', 'badge': 'Boulder Badge'},
        {'region': 'Kanto', 'name': 'Misty', 'type': 'Water', 'medal': '💧', 'badge': 'Cascade Badge'},
        {'region': 'Kanto', 'name': 'Lt. Surge', 'type': 'Electric', 'medal': '⚡', 'badge': 'Thunder Badge'},
        {'region': 'Kanto', 'name': 'Erika', 'type': 'Grass', 'medal': '🌿', 'badge': 'Rainbow Badge'},
        {'region': 'Kanto', 'name': 'Koga', 'type': 'Poison', 'medal': '☠️', 'badge': 'Soul Badge'},
        {'region': 'Kanto', 'name': 'Sabrina', 'type': 'Psychic', 'medal': '🧠', 'badge': 'Marsh Badge'},
        {'region': 'Kanto', 'name': 'Blaine', 'type': 'Fire', 'medal': '🔥', 'badge': 'Volcano Badge'},
        
        # Johto
        {'region': 'Johto', 'name': 'Falkner', 'type': 'Flying', 'medal': '🕊️', 'badge': 'Zephyr Badge'},
        {'region': 'Johto', 'name': 'Bugsy', 'type': 'Bug', 'medal': '🐛', 'badge': 'Hive Badge'},
        {'region': 'Johto', 'name': 'Whitney', 'type': 'Normal', 'medal': '⭐', 'badge': 'Plain Badge'},
        {'region': 'Johto', 'name': 'Morty', 'type': 'Ghost', 'medal': '👻', 'badge': 'Fog Badge'},
        {'region': 'Johto', 'name': 'Chuck', 'type': 'Fighting', 'medal': '👊', 'badge': 'Storm Badge'},
        {'region': 'Johto', 'name': 'Jasmine', 'type': 'Steel', 'medal': '⚙️', 'badge': 'Mineral Badge'},
        {'region': 'Johto', 'name': 'Pryce', 'type': 'Ice', 'medal': '❄️', 'badge': 'Glacier Badge'},
    ]
    return jsonify(gyms)

if __name__ == '__main__':
    app.run(debug=True)

