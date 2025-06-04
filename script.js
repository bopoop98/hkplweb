// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"; 
import { getFirestore, doc, onSnapshot, collection, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config and App ID (now hardcoded for GitHub Pages)
const firebaseConfig = {                  
    apiKey: "AIzaSyDikFHg3TNUng-I9WgeTWXbO29SKxWNLZE",                  
    authDomain: "hkplweb.firebaseapp.com",                  
    projectId: "hkplweb",                  
    storageBucket: "hkplweb.firebasestorage.app",                  
    messagingSenderId: "1774261075",                  
    appId: "1:1774261075:web:cc26aa5d553dfd38ef87a6", 
    measurementId: "G-XXXXXXXXXX"                 
};
const appId = "hkplweb"; 

// Initialize Firebase
let app;
let db;
let auth; 

// Global data stores
let teamsData = [];
let leagueDetails = {};

// Utility to get team data by ID
const getTeamDataById = (id) => teamsData.find(team => team.id === id);
const defaultLogoUrl = "https://placehold.co/40x40/CCCCCC/757575?text=N/A";
const defaultPlayerImgUrl = "https://placehold.co/36x36/CCCCCC/757575?text=P";


// --- RENDER FUNCTIONS ---
function renderLeagueHeader() {
    const leagueLogoHeader = document.getElementById('leagueLogoHeader');
    const leagueNameHeader = document.getElementById('leagueNameHeader');
    if (leagueDetails.LogoUrl) {
        leagueLogoHeader.src = leagueDetails.LogoUrl;
        leagueLogoHeader.onerror = () => { leagueLogoHeader.src = defaultLogoUrl; };
    } else {
         leagueLogoHeader.src = defaultLogoUrl;
    }
    leagueNameHeader.textContent = leagueDetails.name || "Hsig Khaung Premier League";
}


function renderMatches(matches, type) {
    const finishedContainer = document.getElementById('finished-matches-container');
    const upcomingContainer = document.getElementById('upcoming-matches-container');
    const noUpcomingDiv = document.getElementById('no-upcoming-matches');
    const noRecentFinishedDiv = document.getElementById('no-recent-finished-matches');
    const loadingFinishedDiv = document.getElementById('loading-finished-matches');
    const loadingUpcomingDiv = document.getElementById('loading-upcoming-matches');

    let container, noDataDiv, loadingDiv;

    if (type === 'finished') {
        container = finishedContainer;
        noDataDiv = noRecentFinishedDiv;
        loadingDiv = loadingFinishedDiv;
        container.innerHTML = '<h3 class="text-xl font-semibold mb-6 text-gray-700 border-b pb-2">Finished Matches (12-24 hours ago)</h3>';
    } else { 
        container = upcomingContainer;
        noDataDiv = noUpcomingDiv;
        loadingDiv = loadingUpcomingDiv;
        container.innerHTML = '<h3 class="text-xl font-semibold mb-6 text-gray-700 border-b pb-2">Upcoming Matches</h3>';
    }
    
    loadingDiv.classList.add('hidden'); 

    if (matches.length === 0) {
        noDataDiv.classList.remove('hidden');
        container.appendChild(noDataDiv);
        return;
    }
    noDataDiv.classList.add('hidden');

    if (type === 'finished') {
        const groupedMatches = matches.reduce((acc, match) => {
            // Ensure date is correctly parsed for display grouping
            const [day, month, year] = match.date.split('-');
            const formattedDateString = `${year}-${month}-${day}`;
            const date = new Date(formattedDateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            if (!acc[date]) acc[date] = [];
            acc[date].push(match);
            return acc;
        }, {});

        let matchesHTML = '';
        for (const date in groupedMatches) {
            const dateHeaderEl = document.createElement('h4');
            dateHeaderEl.className = 'text-lg font-medium text-gray-600 mt-4 mb-2';
            dateHeaderEl.textContent = date;
            container.appendChild(dateHeaderEl);

            groupedMatches[date].forEach(match => {
                matchesHTML += generateMatchCardHTML(match);
            });
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = matchesHTML;
        while(tempDiv.firstChild) container.appendChild(tempDiv.firstChild);

    } else { 
        let matchesHTML = '';
        matches.forEach(match => {
            matchesHTML += generateMatchCardHTML(match);
        });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = matchesHTML;
        while(tempDiv.firstChild) container.appendChild(tempDiv.firstChild);
    }
}

function generateMatchCardHTML(match) {
    const homeTeam = getTeamDataById(match.homeTeamId);
    const awayTeam = getTeamDataById(match.awayTeamId);

    if (!homeTeam || !awayTeam) {
        console.warn("Team data missing for match:", match.id, "Home:", match.homeTeamId, "Away:", match.awayTeamId);
        return `<div class="material-card p-4 mb-3 text-red-500">Error: Team data missing for this match.</div>`;
    }

    // Ensure date is correctly parsed for display
    const [day, month, year] = match.date.split('-');
    const formattedDateString = `${year}-${month}-${day}`;
    const matchDateStr = new Date(formattedDateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    let statusBadge = '';
    let scoreOrVs = '';

    switch(match.status) {
        case 'finished':
            statusBadge = `<span class="finished-badge">Finished</span>`;
            scoreOrVs = `<div class="match-score text-base md:text-lg font-bold primary-accent mx-1.5">${match.homeScore} - ${match.awayScore}</div>`;
            break;
        case 'upcoming':
            statusBadge = `<span class="upcoming-badge">Upcoming</span>`;
            scoreOrVs = `<div class="text-xl font-bold secondary-accent mx-1.5">VS</div>`;
            break;
        case 'ongoing':
            statusBadge = `<span class="ongoing-badge">Ongoing</span>`;
            scoreOrVs = `<div class="match-score text-base md:text-lg font-bold primary-accent mx-1.5">${match.homeScore} - ${match.awayScore}</div>`;
            break;
        default:
            statusBadge = `<span class="text-xs text-gray-400">${match.status}</span>`;
            scoreOrVs = `<div class="text-xl font-bold secondary-accent mx-1.5">VS</div>`;
    }
    
    return `
        <div class="material-card p-4 mb-3"> 
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-gray-500">${match.status === 'upcoming' ? matchDateStr + ' - ' : ''}${match.time}</span>
                ${statusBadge}
            </div>
            <div class="flex items-center justify-around text-center">
                <div class="flex flex-col items-center w-2/5">
                    <img src="${homeTeam.LogoUrl || defaultLogoUrl}" alt="${homeTeam.name}" class="team-logo-md mb-1" onerror="this.src='${defaultLogoUrl}'">
                    <span class="font-semibold text-xs md:text-sm truncate w-full" title="${homeTeam.name}">${homeTeam.name}</span> 
                </div>
                ${scoreOrVs}
                <div class="flex flex-col items-center w-2/5">
                    <img src="${awayTeam.LogoUrl || defaultLogoUrl}" alt="${awayTeam.name}" class="team-logo-md mb-1" onerror="this.src='${defaultLogoUrl}'">
                    <span class="font-semibold text-xs md:text-sm truncate w-full" title="${awayTeam.name}">${awayTeam.name}</span> 
                </div>
            </div>
        </div>
    `;
}


function renderLeagueStandings(teams) {
    const tbody = document.getElementById('league-standings-body');
    const loadingDiv = document.getElementById('loading-standings');
    const cardDiv = document.getElementById('league-standings-card');
	const defaultLogoUrl = '/assets/default-team-logo.svg'; // or whatever you use
    
    loadingDiv.classList.add('hidden');
    cardDiv.classList.remove('hidden');
    tbody.innerHTML = '';

    if (!teams || teams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4">No teams found or data is loading.</td></tr>`;
        return;
    }

    const standings = teams.map(team => {
        const gd = (team.gf || 0) - (team.ga || 0);
        const pts = (team.won || 0) * 3 + (team.draw || 0);
        return { ...team, gd, pts };
    }).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));

    let rowsHTML = '';
    standings.forEach((team, index) => {
        rowsHTML += `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors">
                <td class="px-2 py-4 text-sm font-medium text-gray-700">${index + 1}</td> 
                <td class="px-4 py-4"><img src="${team.LogoUrl || defaultLogoUrl}" alt="${team.name}" class="team-logo-sm" onerror="this.src='${defaultLogoUrl}'"></td> 
                <td class="px-4 py-4 text-sm font-medium text-gray-900 truncate" style="max-width: 150px;" title="${team.name}">${team.name}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.played || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.won || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.draw || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.lost || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.gf || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.ga || 0}</td>
                <td class="px-2 py-4 text-sm text-gray-600">${team.gd > 0 ? '+' : ''}${team.gd}</td>
                <td class="px-2 py-4 text-sm font-bold text-indigo-700">${team.pts}</td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHTML;
}

function renderTopScorers(players) {
    const tbody = document.getElementById('top-scorers-table-body');
    const noTopScorersDiv = document.getElementById('no-top-scorers');
    const loadingDiv = document.getElementById('loading-top-scorers');
    const cardDiv = document.getElementById('top-scorers-card');
    
    loadingDiv.classList.add('hidden');
    cardDiv.classList.remove('hidden');
    tbody.innerHTML = ''; 

    if (!players || players.length === 0) {
        noTopScorersDiv.classList.remove('hidden');
        tbody.closest('.table-container').classList.add('hidden'); 
        return;
    }
    
    noTopScorersDiv.classList.add('hidden');
    tbody.closest('.table-container').classList.remove('hidden'); 

    const sortedScorers = players
        .filter(p => (p.goals || 0) > 0) 
        .sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.assists || 0) - (a.assists || 0) || (a.matchesPlayed || 0) - (b.matchesPlayed || 0));

    if (sortedScorers.length === 0) {
         noTopScorersDiv.classList.remove('hidden');
         tbody.closest('.table-container').classList.add('hidden');
         return;
    }


    let rowsHTML = '';
    sortedScorers.forEach((scorer, index) => {
        const team = getTeamDataById(scorer.team_id); 
        rowsHTML += `
            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-indigo-50 transition-colors">
                <td class="px-4 py-3 text-sm font-medium text-gray-700">${index + 1}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    <div class="flex items-center space-x-2.5">
                        <img src="${scorer.imageUrl || defaultPlayerImgUrl}" alt="${scorer.name}" class="player-pic-sm" onerror="this.src='${defaultPlayerImgUrl}'">
                        <span class="truncate" style="max-width: 120px;" title="${scorer.name}">${scorer.name}</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    ${team ? `<img src="${team.LogoUrl || defaultLogoUrl}" alt="${team.name}" class="team-logo-sm" onerror="this.src='${defaultLogoUrl}'">` : ''}
                </td>
                <td class="px-4 py-3 text-sm text-gray-600 truncate" style="max-width: 150px;" title="${team ? team.name : 'N/A'}">${team ? team.name : 'N/A'}</td>
                <td class="px-4 py-3 text-sm font-semibold text-indigo-700">${scorer.goals || 0}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${scorer.assists || 0}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${scorer.matchesPlayed || 0}</td>
            </tr>
        `;
    });
    tbody.innerHTML = rowsHTML;
}

// --- Firebase Initialization and Data Listeners ---
async function signInAndSetupListeners() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app); 
        setLogLevel('debug'); 

        setupFirestoreListeners();
        console.log("Firebase initialized and Firestore listeners set up for public data access.");

    } catch (error) {
        console.error("Firebase initialization error:", error);
        document.body.innerHTML = `<div class="p-4 text-red-500">Error initializing Firebase. Please check console. AppId: ${appId}</div>`;
    }
}

function setupFirestoreListeners() {
    // Listener for League Details (e.g., LogoUrl)
    const leagueDetailsPath = `artifacts/${appId}/public/data/leagues/hkpl`;
    onSnapshot(doc(db, leagueDetailsPath), (docSnap) => {
        if (docSnap.exists()) {
            leagueDetails = { id: docSnap.id, ...docSnap.data() };
            console.log("League details updated:", leagueDetails);
            renderLeagueHeader();
        } else {
            console.log("No such league details document!");
            leagueDetails = {}; 
            renderLeagueHeader(); 
        }
    }, (error) => console.error("Error fetching league details:", error));

    // Listener for Teams
    const teamsPath = `artifacts/${appId}/public/data/leagues/hkpl/teams`;
    onSnapshot(collection(db, teamsPath), (snapshot) => {
        teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Teams data updated:", teamsData);
        renderLeagueStandings(teamsData);
    }, (error) => console.error("Error fetching teams:", error));

    // Listener for Matches
    const matchesPath = `artifacts/${appId}/public/data/leagues/hkpl/matches`;
    onSnapshot(collection(db, matchesPath), (snapshot) => {
        const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Matches data updated:", allMatches);

        // Current time for filtering
        const now = new Date(); 
        const twelveHoursInMs = 12 * 60 * 60 * 1000;
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const twelveHoursAgo = new Date(now.getTime() - twelveHoursInMs);
        const oneDayAgo = new Date(now.getTime() - oneDayInMs);

        const finishedMatches = allMatches.filter(m => {
            if (m.status !== 'finished') return false;
            // --- MODIFIED DATE PARSING HERE ---
            const [day, month, year] = m.date.split('-');
            const formattedDate = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
            const matchDateTimeStr = `${formattedDate}T${m.time || '00:00:00'}`;
            const matchDateTime = new Date(matchDateTimeStr);

            if (isNaN(matchDateTime.getTime())) { // Check for invalid date
                console.error("Invalid date encountered for match:", m.id, "Date string:", matchDateTimeStr);
                return false; // Skip this match if date is invalid
            }
            // --- END MODIFIED DATE PARSING ---
            return matchDateTime < twelveHoursAgo && matchDateTime >= oneDayAgo;
        }).sort((a,b) => {
            const [b_day, b_month, b_year] = b.date.split('-');
            const b_formattedDate = `${b_year}-${b_month}-${b_day}`;
            const b_dateTime = new Date(`${b_formattedDate}T${b.time || '00:00:00'}`);

            const [a_day, a_month, a_year] = a.date.split('-');
            const a_formattedDate = `${a_year}-${a_month}-${a_day}`;
            const a_dateTime = new Date(`${a_formattedDate}T${a.time || '00:00:00'}`);

            return b_dateTime - a_dateTime;
        });
        
        const upcomingMatches = allMatches
            .filter(m => m.status === 'upcoming')
            .sort((a,b) => {
                const [b_day, b_month, b_year] = b.date.split('-');
                const b_formattedDate = `${b_year}-${b_month}-${b_day}`;
                const b_dateTime = new Date(`${b_formattedDate}T${b.time || '00:00:00'}`);

                const [a_day, a_month, a_year] = a.date.split('-');
                const a_formattedDate = `${a_year}-${a_month}-${a_day}`;
                const a_dateTime = new Date(`${a_formattedDate}T${a.time || '00:00:00'}`);

                return a_dateTime - b_dateTime;
            });

        console.log("All raw matches:", allMatches);
        console.log("Current time:", now.toISOString());
        console.log("12 hours ago:", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString());
        console.log("24 hours ago:", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
        console.log("Filtered finished matches:", finishedMatches);
        console.log("Filtered upcoming matches:", upcomingMatches);

        renderMatches(finishedMatches, 'finished');
        renderMatches(upcomingMatches, 'upcoming');

    }, (error) => console.error("Error fetching matches:", error));

    // Listener for Players (Top Scorers)
    const playersPath = `artifacts/${appId}/public/data/leagues/hkpl/players`;
    onSnapshot(collection(db, playersPath), (snapshot) => {
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Players data updated:", players);
        renderTopScorers(players);
    }, (error) => console.error("Error fetching players:", error));
    
    // Listener for Settings (optional, if needed for UI)
    const settingsPath = `artifacts/${appId}/public/data/leagues/hkpl/settings/config`;
    onSnapshot(doc(db, settingsPath), (docSnap) => {
        if (docSnap.exists()) {
            console.log("Settings updated:", docSnap.data());
        } else {
            console.log("No such settings document!");
        }
    }, (error) => console.error("Error fetching settings:", error));
}


// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    signInAndSetupListeners(); 

    // Mobile menu toggle
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    menuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
});