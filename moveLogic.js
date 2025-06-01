export default function move(gameState) {
    // Initialize move safety
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true,
    };

    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];
    const myBody = gameState.you.body;
    const myLength = gameState.you.body.length;
    const myBodySet = new Set(myBody.map(segment => `${segment.x},${segment.y}`));
    const board = gameState.board;
    const { width: boardWidth, height: boardHeight } = board;
    const hazards = new Set(board.hazards.map(hazard => `${hazard.x},${hazard.y}`));

    preventBackwardMoves(myHead, myNeck, moveSafety);
    
    preventOutOfBoundsMoves(myHead, boardWidth, boardHeight, moveSafety);
    
    preventSelfCollision(myHead, myBodySet, moveSafety);
    
    avoidHazards(myHead, myNeck, moveSafety, hazards);
    
    avoidHeadToHeadCollisions(myHead, moveSafety, gameState, myLength);

    avoidBlockedSpaces(myHead, moveSafety, myBody, gameState);

    const spaceMap = {};
    for (const [direction, position] of Object.entries(getDirections(myHead))) {
        if (moveSafety[direction]) {
            const space = calculateOpenSpace(position, myBody, gameState);
            spaceMap[direction] = space;
            if (space < myBody.length * 2) {
                moveSafety[direction] = false; // Mark as unsafe if space is insufficient
            }
        }
    }

    console.log(`MOVE ${gameState.turn}: Space Map:`, spaceMap);
    // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
    // gameState.board.food contains an array of food coordinates https://docs.battlesnake.com/api/objects/board
    const foodMove = prioritizeFood(gameState.board.food, myHead, moveSafety, gameState, myBody.length, boardWidth, boardHeight);
    if (foodMove) {
        console.log(`MOVE ${gameState.turn}: Moving towards food: ${foodMove}`);
        return { move: foodMove };
    }

    const fallbackMove = fallbackToOpenSpace(myHead, moveSafety, spaceMap);
    if (fallbackMove) {
        console.log(`MOVE ${gameState.turn}: Fallback to open space: ${fallbackMove}`);
        return { move: fallbackMove };
    }

    console.log(`MOVE ${gameState.turn}: Default fallback to "down".`);
    return { move: "down" }; // default fallback
}

function preventBackwardMoves(myHead, myNeck, moveSafety) {
    if (myNeck.x < myHead.x) moveSafety.left = false;
    if (myNeck.x > myHead.x) moveSafety.right = false;
    if (myNeck.y < myHead.y) moveSafety.down = false;
    if (myNeck.y > myHead.y) moveSafety.up = false;
}
// TODO: Step 1 - Prevent your Battlesnake from moving out of bounds
// gameState.board contains an object representing the game board including its width and height
// https://docs.battlesnake.com/api/objects/board
function preventOutOfBoundsMoves(myHead, boardWidth, boardHeight, moveSafety) {
    if (myHead.x === 0) moveSafety.left = false;
    if (myHead.x === boardWidth - 1) moveSafety.right = false;
    if (myHead.y === 0) moveSafety.down = false;
    if (myHead.y === boardHeight - 1) moveSafety.up = false;
}
// TODO: Step 2 - Prevent your Battlesnake from colliding with itself
// gameState.you contains an object representing your snake, including its coordinates
// https://docs.battlesnake.com/api/objects/battlesnake
function preventSelfCollision(myHead, myBodySet, moveSafety) {
    for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
        const key = `${nextPosition.x},${nextPosition.y}`;
        if (myBodySet.has(key)) {
            moveSafety[direction] = false; // avoid moving into a body part
        }
    }
}

function avoidHazards(myHead, myNeck, moveSafety, hazards) {
    for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
        const key = `${nextPosition.x},${nextPosition.y}`;

        // avoid hazards
        if (hazards.has(key)) {
            moveSafety[direction] = false;
        }

        // prevent moving backward
        if (nextPosition.x === myNeck.x && nextPosition.y === myNeck.y) {
            moveSafety[direction] = false;
        }
    }
}
 // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
// gameState.board.snakes contains an array of enemy snake objects, which includes their coordinates
// https://docs.battlesnake.com/api/objects/battlesnake
function avoidHeadToHeadCollisions(myHead, moveSafety, gameState, myLength) {
    const { snakes } = gameState.board;

    for (const snake of snakes) {
        if (snake.id === gameState.you.id) continue;

        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;

        // get possible moves for the enemy snake
        const enemyMoves = getDirections(enemyHead);

        for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
            for (const enemyPosition of Object.values(enemyMoves)) {
                if (nextPosition.x === enemyPosition.x && nextPosition.y === enemyPosition.y) {
                    // avoid head to head collision if the enemy snake is equal or longer
                    if (enemyLength >= myLength) {
                        moveSafety[direction] = false;
                    }
                }
            }
        }
    }
}

function avoidBlockedSpaces(myHead, moveSafety, myBody, gameState) {
    for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
        if (!moveSafety[direction]) continue;

        // simulate moving into the space and calculate the surrounding space
        const simulatedBody = [nextPosition, ...myBody.slice(0, -1)];
        const openSpace = calculateOpenSpace(nextPosition, simulatedBody, gameState);

        if (openSpace < 4) {
            // avoid moves that create less than a 2x2 open space
            moveSafety[direction] = false;
        }
    }
}

function getDirections(head) {
    return {
        left: { x: head.x - 1, y: head.y },
        right: { x: head.x + 1, y: head.y },
        down: { x: head.x, y: head.y - 1 },
        up: { x: head.x, y: head.y + 1 }
    };
}

function calculateOpenSpace(start, myBody, gameState) {
    const { width: boardWidth, height: boardHeight, snakes } = gameState.board;

    // calculate open space
    const queue = [start];
    const visited = new Set();
    const myBodySet = new Set(myBody.map(segment => `${segment.x},${segment.y}`));

    let spaceCount = 0;

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;

        // skip already visited or out-of-bounds positions
        if (visited.has(key) || x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;

        // skip positions occupied by any snake
        let isOccupied = false;
        for (const snake of snakes) {
            for (const segment of snake.body) {
                if (segment.x === x && segment.y === y) {
                    isOccupied = true;
                    break;
                }
            }
            if (isOccupied) break;
        }

        // skip positions occupied by my body
        if (myBodySet.has(key)) {
            isOccupied = true;
        }

        if (isOccupied) continue;

        visited.add(key);
        spaceCount++;

        queue.push({ x: x - 1, y });
        queue.push({ x: x + 1, y });
        queue.push({ x, y: y - 1 });
        queue.push({ x, y: y + 1 });
    }

    return spaceCount; 
}
 // Are there any safe moves left?
   
    //Object.keys(moveSafety) returns ["up", "down", "left", "right"]
    //.filter() filters the array based on the function provided as an argument (using arrow function syntax here)
    //In this case we want to filter out any of these directions for which moveSafety[direction] == false
function fallbackToOpenSpace(myHead, moveSafety, spaceMap) {
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) return null;

    return safeMoves.reduce((best, direction) => {
        if (!best || spaceMap[direction] > (spaceMap[best] || 0)) {
            return direction;
        }
        return best;
    }, null);
}