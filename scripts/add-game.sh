#!/bin/bash

# Blakbox Arcade - Add Game Script
# Usage: ./add-game.sh "Game Title" "System" "filename.ext" [series_id]

if [ $# -lt 3 ]; then
    echo "Usage: $0 \"Game Title\" \"System\" \"filename.ext\" [series_id]"
    echo "Example: $0 \"Super Mario Bros\" \"Nintendo Entertainment System\" \"smb.nes\" 12"
    exit 1
fi

TITLE="$1"
SYSTEM="$2"
FILENAME="$3"
SERIES_ID="${4:-NULL}"

# Check if file exists in games/roms directory
if [ ! -f "/opt/blakbox-gameserver/games/roms/$FILENAME" ]; then
    echo "Error: Game file /opt/blakbox-gameserver/games/roms/$FILENAME not found"
    echo "Please copy the game file first"
    exit 1
fi

# Insert into database
echo "Adding $TITLE to database..."
sqlite3 /opt/blakbox-gameserver/data/gameserver.db "INSERT INTO games (title, series_id, system, filename, enabled) VALUES (\"$TITLE\", $SERIES_ID, \"$SYSTEM\", \"$FILENAME\", 1);"

if [ $? -eq 0 ]; then
    echo "✓ Successfully added $TITLE to database"
    
    # Show the added game
    echo "Game details:"
    sqlite3 /opt/blakbox-gameserver/data/gameserver.db "SELECT id, title, series_id, system, filename FROM games WHERE title = \"$TITLE\" ORDER BY id DESC LIMIT 1;"
else
    echo "✗ Failed to add game to database"
    exit 1
fi