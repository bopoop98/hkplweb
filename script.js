// ==========================
// Enhanced Scroll-Based Header Minimization (No jQuery)
// ==========================

document.addEventListener('DOMContentLoaded', function() {
    const header = document.getElementById('main-header');
    const scrollThreshold = 50;

    function adjustBodyPadding() {
        document.body.style.paddingTop = header.offsetHeight + 'px';
    }

    function updateHeaderState() {
        if (window.scrollY > scrollThreshold) {
            header.classList.add('minimized');
        } else {
            header.classList.remove('minimized');
        }
    }

    let isThrottled = false;
    function throttledScroll() {
        if (!isThrottled) {
            window.requestAnimationFrame(() => {
                updateHeaderState();
                isThrottled = false;
            });
            isThrottled = true;
        }
    }

    window.addEventListener('scroll', throttledScroll);
    window.addEventListener('resize', adjustBodyPadding);
    adjustBodyPadding();
    updateHeaderState();
});

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, setLogLevel, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
const projectId = firebaseConfig.projectId; // Use this consistent ID

// Initialize Firebase
let app;
let db;
let auth;

// Global matches storage
let allMatches = [];
let filteredMatches = [];

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    
    // Tab event listeners
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterMatches(button.dataset.tab);
        });
    });
});
// Global data stores
let teamsData = [];
let leagueDetails = {};
// Utility to get team data by ID
const getTeamDataById = (id) => teamsData.find(team => team.id === id);
const defaultLogoUrl = "https://placehold.co/40x40/CCCCCC/757575?text=N/A";
const defaultPlayerImgUrl = "https://placehold.co/36x36/CCCCCC/757575?text=P";

// Filter and render matches based on tab selection
function filterMatches(tab) {
    const now = new Date();
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const twelveHoursAgo = new Date(now.getTime() - twelveHoursInMs);
    const oneDayAgo = new Date(now.getTime() - oneDayInMs);
    let matches = [];
    switch(tab) {
        case 'all': {
            // Get up to 1 ongoing, 3 upcoming, 3 finished (in that order)
            const ongoing = allMatches.filter(m => m.status === 'ongoing').slice(0, 1);
            const upcoming = allMatches.filter(m => m.status === 'upcoming').slice(0, 3);
            const finished = allMatches.filter(m => m.status === 'finished').slice(0, 3);
            matches = [...ongoing, ...upcoming, ...finished];
            break;
        }
        case 'upcoming':
            matches = allMatches.filter(m => m.status === 'upcoming').slice(0, 6);
            break;
        case 'ongoing':
            matches = allMatches.filter(m => m.status === 'ongoing').slice(0, 1);
            break;
        case 'finished':
            matches = allMatches.filter(m => m.status === 'finished').slice(0, 6);
            break;
        default:
            matches = [...allMatches];
    }
    filteredMatches = matches;
    renderMatches(filteredMatches);
}


// ==========================
// Dynamic Content Rendering Functions
// ==========================

// Helper to format date
const formatDate = (timestamp) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
        return 'N/A'; // Return 'N/A' or an empty string if timestamp is invalid
    }
    const date = timestamp.toDate();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

// Function to convert plain text with newlines to HTML paragraphs and line breaks
function formatPlainTextToHtml(text) {
    if (!text) return '';

    // Split the text into paragraphs based on two or more newline characters
    const paragraphs = text.split(/\n\s*\n/);

    const htmlParagraphs = paragraphs.map(p => {
        // Trim whitespace from the paragraph
        const trimmedParagraph = p.trim();
        if (trimmedParagraph === '') {
            return ''; // Skip empty paragraphs that might result from splitting
        }
        // Replace single newlines within a paragraph with <br> tags
        return `<p>${trimmedParagraph.replace(/\n/g, '<br>')}</p>`;
    });

    // Join all formatted paragraphs. Filter out any empty strings from skipped paragraphs.
    return htmlParagraphs.filter(Boolean).join('');
}


// --- Render News Items ---
function renderNews(newsItems) {
    const newsContainer = document.getElementById('news-container');
    const loadingNews = document.getElementById('loading-news');
    const noNews = document.getElementById('no-news');

    loadingNews.classList.add('hidden');

    if (newsItems.length === 0) {
        noNews.classList.remove('hidden');
        newsContainer.innerHTML = '';
        return;
    }

    noNews.classList.add('hidden');
    newsContainer.innerHTML = ''; // Clear previous news

    // Safely sort news items by date
    newsItems.sort((a, b) => {
        // Ensure 'date' property exists and is a Firestore Timestamp object
        const dateA = a.date && typeof a.date.toMillis === 'function' ? a.date.toMillis() : 0;
        const dateB = b.date && typeof b.date.toMillis === 'function' ? b.date.toMillis() : 0;
        // Sort in descending order (newest first)
        return dateB - dateA;
    });

    newsItems.forEach(news => {
        const newsCard = document.createElement('div');
        // Add data-news-id directly to the news card for clickability
        newsCard.className = 'news-card material-card cursor-pointer'; // Add cursor-pointer for visual cue
        newsCard.dataset.newsId = news.id; // Assign news ID to the card

        const tagsHtml = news.tags ? news.tags.map(tag => `<span class="news-tag tag-${tag.toLowerCase()}">${tag}</span>`).join('') : '';

        newsCard.innerHTML = `
            <img src="${news.imgUrl && news.imgUrl.length > 0 ? news.imgUrl[0] : 'https://placehold.co/600x400/E0E0E0/4A00E0?text=No+Image'}" alt="${news.title}" class="news-image">
            <div class="p-4 flex-grow flex flex-col">
                <div class="news-tags-container">${tagsHtml}</div>
                <h3 class="news-title">${news.title}</h3>
                <div class="news-meta">
                    <span>${news.date ? formatDate(news.date) : 'N/A'}</span>
                    <span class="news-author">by ${news.author || 'Admin'}</span>
                </div>
                <div class="mt-auto pt-4">
                    <button class="read-more-btn primary-btn">Read More</button>
                </div>
            </div>
        `;
        newsContainer.appendChild(newsCard);

        // Add event listener directly to each news card for the full clickability
        newsCard.addEventListener('click', (event) => {
            const newsId = event.currentTarget.dataset.newsId; // Get ID from the clicked card
            history.pushState({ newsId: newsId }, `News - ${newsId}`, `?news=${newsId}`);
            showFullNewsArticle(newsId);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// --- Render Full News Article ---
function renderNewsDetail(newsData) {
    document.getElementById('news-detail-title').textContent = newsData.title;
    document.getElementById('news-detail-author').querySelector('span').textContent = newsData.author || 'Admin';
    document.getElementById('news-detail-date').textContent = formatDate(newsData.date);

    const tagsContainer = document.getElementById('news-detail-tags');
    tagsContainer.innerHTML = '';
    if (newsData.tags) {
        newsData.tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = `news-tag tag-${tag.toLowerCase()}`;
            tagSpan.textContent = tag;
            tagsContainer.appendChild(tagSpan);
        });
    }

    const imagesContainer = document.getElementById('news-detail-images');
    imagesContainer.innerHTML = '';
    if (newsData.imgUrl && newsData.imgUrl.length > 0) {
        newsData.imgUrl.forEach(url => {
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'news-detail-image-item material-card rounded-lg shadow-md overflow-hidden';
            const img = document.createElement('img');
            img.src = url;
            img.alt = newsData.title;
            img.className = 'w-full h-auto block';
            imageWrapper.appendChild(img);
            imagesContainer.appendChild(imageWrapper);
        });
    }

    // Use the new formatting function for the body content
    document.getElementById('news-detail-body').innerHTML = formatPlainTextToHtml(newsData.body);
}

// --- Show/Hide News Sections ---
function showFullNewsArticle(newsId) {
    document.getElementById('news').classList.add('hidden');
    document.getElementById('full-news-article').classList.remove('hidden');
    document.getElementById('loading-news').classList.remove('hidden'); // Show loading for full article fetch

    const newsDetailContent = document.getElementById('news-detail-content');
    newsDetailContent.classList.add('hidden'); // Hide content while loading

    const newsDocRef = doc(db, `artifacts/${projectId}/public/data/leagues/hkpl/news`, newsId);
    getDoc(newsDocRef).then((docSnap) => {
        document.getElementById('loading-news').classList.add('hidden'); // Hide loading

        if (docSnap.exists()) {
            const newsData = docSnap.data();
            renderNewsDetail(newsData);
            newsDetailContent.classList.remove('hidden'); // Show content
        } else {
            console.error("No such news document!");
            // Optionally, display a "News not found" message
            newsDetailContent.innerHTML = '<p class="text-center text-red-500">News article not found.</p>';
            newsDetailContent.classList.remove('hidden');
        }
    }).catch(error => {
        console.error("Error fetching news document:", error);
        document.getElementById('loading-news').classList.add('hidden');
        newsDetailContent.innerHTML = '<p class="text-center text-red-500">Error loading news article.</p>';
        newsDetailContent.classList.remove('hidden');
    });
}

function hideFullNewsArticle() {
    document.getElementById('full-news-article').classList.add('hidden');
    document.getElementById('news').classList.remove('hidden');
    history.pushState(null, 'Hsig Khaung Premier League News', 'index.html#news');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


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

// Unified render function
function renderMatches(matches, type = 'all') {
    const container = document.getElementById('matches-container');
    const noMatchesDiv = document.getElementById('no-matches');
    const loadingDiv = document.getElementById('loading-matches');

    if (!container) return;
    if (!noMatchesDiv) return;
    if (!loadingDiv) return;

    loadingDiv.classList.add('hidden');
    container.innerHTML = '';
    if (!matches || matches.length === 0) {
        noMatchesDiv.classList.remove('hidden');
        return;
    }
    noMatchesDiv.classList.add('hidden');

    // Group matches by date
    const groupedMatches = matches.reduce((acc, match) => {
        const [day, month, year] = match.date.split('-');
        const formattedDateString = `${year}-${month}-${day}`;
        const dateObj = new Date(formattedDateString);
        const date = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dateWithWeekday = `${date} (${weekday})`;
        if (!acc[dateWithWeekday]) acc[dateWithWeekday] = [];
        acc[dateWithWeekday].push(match);
        return acc;
    }, {});

    // Render grouped matches: one material-card per day
    let allMatchesHtml = '';
    for (const date in groupedMatches) {
        allMatchesHtml += `<div class="material-card p-4">
            <h3 class="text-lg font-medium text-gray-600 mb-2 pl-2 border-l-4 border-indigo-500">${date}</h3>
            <div class="space-y-2">
                ${groupedMatches[date].map(match => generateMatchCardHTML(match)).join('')}
            </div>
        </div>`;
    }
    container.innerHTML = allMatchesHtml;
}

function generateMatchCardHTML(match) {
    const homeTeam = getTeamDataById(match.homeTeamId);
    const awayTeam = getTeamDataById(match.awayTeamId);
    if (!homeTeam || !awayTeam) {
        return `<div class="material-card p-4 mb-3 text-red-500">Error: Team data missing for this match.</div>`;
    }

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
        <div class="p-2 border-b last:border-b-0">
            <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs text-gray-500">${match.time}</span>
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
    const defaultLogoUrl = 'https://placehold.co/40x40/CCCCCC/757575?text=N/A'; // Using the global default for consistency

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
    }).sort((a, b) => {
        // Sort by points, then GD, then red card, then yellow card, then GF, then GA, then name
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        // Red card: fewer is better
        if ((a.redCard || 0) !== (b.redCard || 0)) return (a.redCard || 0) - (b.redCard || 0);
        // Yellow card: fewer is better
        if ((a.yellowCard || 0) !== (b.yellowCard || 0)) return (a.yellowCard || 0) - (b.yellowCard || 0);
        // GF: more is better
        if ((b.gf || 0) !== (a.gf || 0)) return (b.gf || 0) - (a.gf || 0);
        // GA: fewer is better
        if ((a.ga || 0) !== (b.ga || 0)) return (a.ga || 0) - (b.ga || 0);
        // Name: alphabetical
        return a.name.localeCompare(b.name);
    });
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
                <td class="px-2 py-4 text-sm text-red-600">${team.redCard || 0}</td>
                <td class="px-2 py-4 text-sm text-yellow-500">${team.yellowCard || 0}</td>
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
        // setLogLevel('debug'); // Removed for production

        setupFirestoreListeners();
    } catch (error) {
        console.error("Firebase initialization error:", error);
        document.body.innerHTML = `<div class="p-4 text-red-500">Error initializing Firebase. Please check console. AppId: ${projectId}</div>`;
    }
}

function setupFirestoreListeners() {
    // Listener for League Details (e.g., LogoUrl)
    const leagueDetailsPath = `artifacts/${projectId}/public/data/leagues/hkpl`;
    onSnapshot(doc(db, leagueDetailsPath), (docSnap) => {
        if (docSnap.exists()) {
            leagueDetails = { id: docSnap.id, ...docSnap.data() };
            renderLeagueHeader();
        } else {
            leagueDetails = {};
            renderLeagueHeader();
        }
    }, (error) => console.error("Error fetching league details:", error));
    //## Modified Team Data Fetching

    // Listener for Teams - MODIFIED PATH FOR LEAGUE STANDINGS
    // Now fetching from '/public/hkplweb/year/{currentYear}/teams' for league standings.
    const currentYear = new Date().getFullYear().toString(); // Get current year dynamically
    const teamsPathForStandings = `artifacts/${projectId}/public/data/leagues/hkpl/teams`;
    onSnapshot(collection(db, teamsPathForStandings), (snapshot) => {
        teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderLeagueStandings(teamsData);
    }, (error) => console.error("Error fetching teams for league standings:", error));
    // Listener for Matches
    const matchesPath = `artifacts/${projectId}/public/data/leagues/hkpl/matches`;
    onSnapshot(collection(db, matchesPath), (snapshot) => {
        allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log("Matches data updated:", allMatches); // Removed debug log

        // Get the element directly here for the check
        const matchesContainerElement = document.getElementById('matches-container');
        // console.log("matches-container status before filterMatches call in setupFirestoreListeners:", matchesContainerElement); // Removed debug log

        if (matchesContainerElement) {
            // If the element exists, call filterMatches directly
            filterMatches('all');
        } else {
            // If not ready, log a message and wait briefly to retry
            // console.warn("matches-container not found on initial Firestore snapshot. Retrying in 100ms..."); // Removed debug log
            setTimeout(() => {
                // After delay, re-check and call filterMatches if still null
                if (document.getElementById('matches-container')) {
                    filterMatches('all');
                } else {
                    console.error("matches-container still not found after retry. Matches will not be rendered.");
                }
            }, 100);
        }
    }, (error) => console.error("Error fetching matches:", error));


    // Listener for News
    const newsPath = `artifacts/${projectId}/public/data/leagues/hkpl/news`; // Path to your news collection
    onSnapshot(collection(db, newsPath), (snapshot) => {
        const newsItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log("News data updated:", newsItems); // Removed debug log
        renderNews(newsItems); // Call the renderNews function with the fetched data
    }, (error) => console.error("Error fetching news:", error));

    // Listener for Players (Top Scorers) - UNCHANGED PATH
    const playersPath = `artifacts/${projectId}/public/data/leagues/hkpl/players`;
    onSnapshot(collection(db, playersPath), (snapshot) => {
        const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // console.log("Players data updated:", players); // Removed debug log
        renderTopScorers(players);
    }, (error) => console.error("Error fetching players:", error));

    // Listener for Settings (optional, if needed for UI) - UNCHANGED PATH
    const settingsPath = `artifacts/${projectId}/public/data/leagues/hkpl/settings/config`;
    onSnapshot(doc(db, settingsPath), (docSnap) => {
        if (docSnap.exists()) {
            // console.log("Settings updated:", docSnap.data()); // Removed debug log
        } else {
            // console.log("No such settings document!"); // Removed debug log
        }
    }, (error) => console.error("Error fetching settings:", error));
}


// --- INITIALIZE ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    signInAndSetupListeners();

    // Mobile menu toggle (fix for mobile)
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        // Hide menu when a link is clicked
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Back to News button listener
    document.getElementById('back-to-news-btn').addEventListener('click', hideFullNewsArticle);

    // Handle initial URL to check for news ID
    const urlParams = new URLSearchParams(window.location.search);
    const newsIdFromUrl = urlParams.get('news');
    if (newsIdFromUrl) {
        showFullNewsArticle(newsIdFromUrl);
    }
});
// Handle browser's back/forward buttons
window.addEventListener('popstate', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const newsIdFromUrl = urlParams.get('news');

    if (newsIdFromUrl) {
        showFullNewsArticle(newsIdFromUrl);
    } else {
        hideFullNewsArticle(); // If no news ID, go back to main news list
    }
});
