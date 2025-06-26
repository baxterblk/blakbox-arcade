// Game metadata detection based on filename
function detectGameMetadata(filename) {
    // Remove file extension and clean up
    const baseName = filename.replace(/\.[^/.]+$/, "")
        .replace(/\([^)]*\)/g, "") // Remove parentheses content
        .replace(/\[[^\]]*\]/g, "") // Remove brackets content
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    
    // Series detection patterns
    const seriesPatterns = {
        "Nintendo Classics": ["mario", "super mario", "dr mario", "mario kart", "mario party", "zelda", "link", "metroid", "donkey kong", "dk", "kirby"],
        "Sega Collection": ["sonic", "streets of rage", "golden axe", "phantasy star", "shinobi"],
        "Fighting Games": ["street fighter", "sf2", "sf3", "mortal kombat", "mk", "tekken", "king of fighters", "fatal fury"],
        "RPG Adventures": ["final fantasy", "ff", "dragon quest", "chrono", "secret of mana", "phantasy star"],
        "Racing Games": ["f-zero", "mario kart", "gran turismo", "ridge racer", "road rash"],
        "Puzzle Games": ["tetris", "dr mario", "puyo", "columns", "panel de pon"],
        "Platform Games": ["mario", "sonic", "mega man", "megaman", "rockman", "castlevania", "contra"],
        "Sports Games": ["fifa", "nba", "nfl", "mlb", "tecmo", "blades of steel"],
        "Shoot Em Ups": ["gradius", "r-type", "thunder force", "salamander", "darius"]
    };
    
    // Detect series
    let detectedSeries = "Arcade Classics"; // Default
    const lowerName = baseName.toLowerCase();
    
    for (const [series, patterns] of Object.entries(seriesPatterns)) {
        if (patterns.some(pattern => lowerName.includes(pattern))) {
            detectedSeries = series;
            break;
        }
    }
    
    // Genre-based detection for better classification
    if (lowerName.includes("fight") || lowerName.includes("boxing") || lowerName.includes("wrestling")) {
        detectedSeries = "Fighting Games";
    } else if (lowerName.includes("racing") || lowerName.includes("race") || lowerName.includes("gran turismo")) {
        detectedSeries = "Racing Games";
    } else if (lowerName.includes("rpg") || lowerName.includes("fantasy") || lowerName.includes("quest")) {
        detectedSeries = "RPG Adventures";
    } else if (lowerName.includes("puzzle") || lowerName.includes("tetris") || lowerName.includes("columns")) {
        detectedSeries = "Puzzle Games";
    } else if (lowerName.includes("sports") || lowerName.includes("football") || lowerName.includes("baseball")) {
        detectedSeries = "Sports Games";
    }
    
    // Clean up the game name
    const cleanName = baseName
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    
    // Generate description
    const description = `Classic ${detectedSeries.replace(" Games", "")} game: ${cleanName}`;
    
    return {
        name: cleanName,
        series: detectedSeries,
        description: description,
        system: detectSystem(filename)
    };
}

// Detect system from file extension
function detectSystem(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const systemMap = {
        "nes": "NES",
        "sfc": "SNES",
        "smc": "SNES", 
        "snes": "SNES",
        "gb": "Game Boy",
        "gbc": "Game Boy Color",
        "gba": "Game Boy Advance",
        "n64": "Nintendo 64",
        "z64": "Nintendo 64",
        "gen": "Genesis",
        "md": "Genesis",
        "smd": "Genesis",
        "gg": "Game Gear",
        "pce": "PC Engine",
        "zip": "Arcade"
    };
    
    return systemMap[ext] || "Unknown";
}

module.exports = { detectGameMetadata };
