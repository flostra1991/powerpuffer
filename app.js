// Spotify API Variablen
const clientId = 'f3efb62584fb45f7b55583c2115a89b5';  // Deine Client-ID von Spotify
const redirectUri = 'https://flostra1991.github.io/powerpuffer/';  // Achte auf den Schrägstrich am Ende
let accessToken = '';

// Spotify API Authentifizierungs-URL erstellen
const authEndpoint = 'https://accounts.spotify.com/authorize';
const scopes = 'user-read-private user-read-email';

const authUrl = `${authEndpoint}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}`;

// Authentifizierung mit Spotify API
function authenticate() {
    console.log('Authentifizierung gestartet...');
    console.log('Redirect URI:', redirectUri);  // Debugging: Die Redirect URI wird in der Konsole ausgegeben
    console.log('Auth URL:', authUrl);  // Debugging: Die Authentifizierungs-URL wird in der Konsole ausgegeben
    window.location.href = authUrl;  // Leite den Benutzer zu Spotify um, um die Authentifizierung zu starten
}

// Access Token aus der URL holen und prüfen, ob der Benutzer authentifiziert wurde
function getAccessToken() {
    const hash = window.location.hash;  // Prüft, ob die URL den Access Token enthält
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get('access_token');
        console.log('Access Token erhalten:', accessToken);  // Debugging: Token in der Konsole ausgeben
        window.location.hash = '';  // Entferne das Token aus der URL, um die URL sauber zu halten

        if (accessToken) {
            // Authentifizierung erfolgreich
            console.log('Token erhalten und gespeichert.');
        } else {
            // Authentifizierung fehlgeschlagen
            console.error('Fehler beim Abrufen des Tokens.');
        }
    } else {
        // Kein Token vorhanden, starte die Authentifizierung
        console.log('Kein Access Token vorhanden, starte Authentifizierung.');
        authenticate();
    }
}

// Hauptfunktion zum Starten der Authentifizierung oder Nutzung des Tokens
window.onload = function() {
    getAccessToken();  // Versuche den Access Token beim Laden der Seite zu holen
};

// Hauptfunktion zum Erkennen und Ausführen der richtigen Suche
function search() {
    const input = document.getElementById('searchInput').value.trim();

    if (!accessToken) {
        authenticate();  // Authentifizieren, wenn noch kein Token vorhanden ist
        return;
    }

    // Überprüfen, ob es ein Spotify-Playlist-Link ist
    if (isSpotifyPlaylistLink(input)) {
        const playlistId = extractSpotifyPlaylistId(input);
        if (playlistId) {
            searchTracksByPlaylistId(playlistId);  // Playlist-Track-Suche
        } else {
            document.getElementById('result').innerText = 'Ungültiger Spotify-Playlist-Link.';
        }
    }
    // Überprüfen, ob es ein Spotify-Track-Link ist
    else if (isSpotifyTrackLink(input)) {
        const trackId = extractSpotifyTrackId(input);
        if (trackId) {
            searchTrackById(trackId);
        } else {
            document.getElementById('result').innerText = 'Ungültiger Spotify-Song-Link.';
        }
    }
    // Falls es keine Links sind, führen wir eine Textsuche durch
    else if (input) {
        searchTracksByQuery(input);
    } else {
        document.getElementById('result').innerText = 'Bitte geben Sie einen Songnamen, einen Spotify-Song-Link oder einen Spotify-Playlist-Link ein.';
    }
}

// Funktion zum Suchen der Tracks einer Playlist anhand der Playlist-ID
function searchTracksByPlaylistId(playlistId) {
    fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const tracks = data.items.map(item => item.track); // Extrahiere die Tracks
        displayTracksWithEnergy(tracks); // Zeige die Tracks genauso wie bei anderen Suchergebnissen an
    })
    .catch(err => {
        console.error('Fehler beim Abrufen der Playlist:', err);
    });
}

// Funktion zum Suchen von Tracks auf Basis eines Suchbegriffs
function searchTracksByQuery(query) {
    fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.tracks.items.length > 0) {
            const tracks = data.tracks.items;
            displayTracksWithEnergy(tracks); // Zeige die Tracks an
        } else {
            document.getElementById('result').innerText = 'Kein Song gefunden.';
        }
    })
    .catch(err => {
        console.error('Fehler bei der API-Abfrage:', err);
    });
}

// Funktion zum Suchen eines Tracks anhand der ID
function searchTrackById(trackId) {
    fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(track => {
        displayTracksWithEnergy([track]); // Zeige den Track an
    })
    .catch(err => {
        console.error('Fehler beim Abrufen des Songs:', err);
    });
}

// Funktion zum Anzeigen der Tracks und Abrufen der Audio Features
function displayTracksWithEnergy(tracks) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';  // Vorherige Ergebnisse löschen

    // Array mit den Track-IDs für die zweite Anfrage
    const trackIds = tracks.map(track => track.id);

    // Min- und Max-Energy-Werte aus den Eingabefeldern holen
    const minEnergy = parseFloat(document.getElementById('minEnergy').value);
    const maxEnergy = parseFloat(document.getElementById('maxEnergy').value);

    // Audio Features für die Tracks abrufen
    fetch(`https://api.spotify.com/v1/audio-features?ids=${trackIds.join(',')}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(audioFeaturesData => {
        // Für jeden Track die Informationen anzeigen
        tracks.forEach((track, index) => {
            const audioFeature = audioFeaturesData.audio_features[index];
            const energy = audioFeature ? audioFeature.energy : null;

            // Berechne die skalierte Energy-Zahl zwischen 1 und 5
            const scaledEnergy = energy !== null ? scaleEnergy(energy, minEnergy, maxEnergy) : 'Keine Daten verfügbar';

            const trackElement = document.createElement('div');
            const trackId = track.id;
            trackElement.innerHTML = `
                <p><strong>${track.name}</strong> von ${track.artists[0].name}</p>
                <p>Album: ${track.album.name}</p>
                <p>Energy Level (1-5): ${drawEnergyLevel(scaledEnergy)}</p>
                <!-- Spotify Embed Player -->
                <iframe src="https://open.spotify.com/embed/track/${trackId}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
            `;
            resultDiv.appendChild(trackElement);
        });
    })
    .catch(err => {
        console.error('Fehler beim Abrufen der Audio Features:', err);
    });
}

// Funktion zum Skalieren des Energy-Wertes zwischen minEnergy und maxEnergy
function scaleEnergy(energy, minEnergy, maxEnergy) {
    const clampedEnergy = Math.max(minEnergy, Math.min(maxEnergy, energy));
    return Math.round(((clampedEnergy - minEnergy) / (maxEnergy - minEnergy)) * 4 + 1);
}

// Funktion zum "Malen" der Energy-Level (z. B. als Sterne oder Balken)
function drawEnergyLevel(level) {
    if (isNaN(level)) return 'Keine Daten verfügbar';
    let stars = '';
    for (let i = 0; i < level; i++) {
        stars += '★';  // Sterne als Energy-Anzeige
    }
    return stars;
}

// Funktion zur Extraktion der Track-ID aus einem Spotify-Link
function extractSpotifyTrackId(spotifyLink) {
    const regex = /track\/([a-zA-Z0-9]+)(\?|$)/;
    const match = spotifyLink.match(regex);
    return match ? match[1] : null;
}

// Funktion zur Extraktion der Playlist-ID aus einem Spotify-Playlist-Link
function extractSpotifyPlaylistId(spotifyPlaylistLink) {
    const regex = /playlist\/([a-zA-Z0-9]+)(\?|$)/;
    const match = spotifyPlaylistLink.match(regex);
    return match ? match[1] : null;
}

// Funktion zum Überprüfen, ob der Input ein Spotify-Track-Link ist
function isSpotifyTrackLink(input) {
    return input.includes('track/');
}

// Funktion zum Überprüfen, ob der Input ein Spotify-Playlist-Link ist
function isSpotifyPlaylistLink(input) {
    return input.includes('playlist/');
}
