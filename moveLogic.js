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

    // Step 1: Prevent moving backwards
    preventBackwardMoves(myHead, myNeck, moveSafety);

    // Step 2: Prevent moving out of bounds
    preventOutOfBoundsMoves(myHead, boardWidth, boardHeight, moveSafety);

    // Step 3: Prevent self-collision
    preventSelfCollision(myHead, myBodySet, moveSafety);

    // Step 4: Avoid hazards while not moving backward into the neck
    avoidHazards(myHead, myNeck, moveSafety, hazards);

    // Step 5: Avoid head-to-head collisions
    avoidHeadToHeadCollisions(myHead, moveSafety, gameState, myLength);

    // Step 6: Avoid tight corners
    avoidTightCorners(myHead, moveSafety, boardWidth, boardHeight);

    // Step 7: Analyze open spaces for each move and avoid small spaces
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

    // Step 8: Target the closest food while avoiding contested food and unsafe paths
    const foodMove = prioritizeFood(gameState.board.food, myHead, moveSafety, gameState, myBody.length, boardWidth, boardHeight);
    if (foodMove) {
        console.log(`MOVE ${gameState.turn}: Moving towards food: ${foodMove}`);
        return { move: foodMove };
    }

    // Step 9: Fallback to the move with the largest open space
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Default fallback.`);
        return { move: "down" }; // Default fallback
    }

    const bestMove = safeMoves.reduce((best, direction) => {
        if (!best || spaceMap[direction] > (spaceMap[best] || 0)) {
            return direction;
        }
        return best;
    }, null);

    console.log(`MOVE ${gameState.turn}: Best move based on open space: ${bestMove}`);
    return { move: bestMove };
}

function preventBackwardMoves(myHead, myNeck, moveSafety) {
    if (myNeck.x < myHead.x) moveSafety.left = false;
    if (myNeck.x > myHead.x) moveSafety.right = false;
    if (myNeck.y < myHead.y) moveSafety.down = false;
    if (myNeck.y > myHead.y) moveSafety.up = false;
}

function preventOutOfBoundsMoves(myHead, boardWidth, boardHeight, moveSafety) {
    if (myHead.x === 0) moveSafety.left = false;
    if (myHead.x === boardWidth - 1) moveSafety.right = false;
    if (myHead.y === 0) moveSafety.down = false;
    if (myHead.y === boardHeight - 1) moveSafety.up = false;
}

function preventSelfCollision(myHead, myBodySet, moveSafety) {
    for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
        const key = `${nextPosition.x},${nextPosition.y}`;
        if (myBodySet.has(key)) {
            moveSafety[direction] = false; // Avoid moving into a body segment
        }
    }
}

function avoidHazards(myHead, myNeck, moveSafety, hazards) {
    for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
        const key = `${nextPosition.x},${nextPosition.y}`;

        // Avoid hazards
        if (hazards.has(key)) {
            moveSafety[direction] = false;
        }

        // Prevent moving backward into the neck
        if (nextPosition.x === myNeck.x && nextPosition.y === myNeck.y) {
            moveSafety[direction] = false;
        }
    }
}

function avoidHeadToHeadCollisions(myHead, moveSafety, gameState, myLength) {
    const { snakes } = gameState.board;

    for (const snake of snakes) {
        if (snake.id === gameState.you.id) continue; // Skip your own snake

        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;

        // Get possible moves for the enemy snake's head
        const enemyMoves = getDirections(enemyHead);

        for (const [direction, nextPosition] of Object.entries(getDirections(myHead))) {
            for (const enemyPosition of Object.values(enemyMoves)) {
                if (nextPosition.x === enemyPosition.x && nextPosition.y === enemyPosition.y) {
                    // Avoid head-to-head collision if the enemy snake is equal or longer
                    if (enemyLength >= myLength) {
                        moveSafety[direction] = false;
                    }
                }
            }
        }
    }
}

function avoidTightCorners(myHead, moveSafety, boardWidth, boardHeight) {
    // If near a corner, mark moves leading to the corner as unsafe
    if (myHead.x === 1 && myHead.y === 1) { // Near top-left corner
        moveSafety.left = false;
        moveSafety.down = false;
    } else if (myHead.x === boardWidth - 2 && myHead.y === 1) { // Near top-right corner
        moveSafety.right = false;
        moveSafety.down = false;
    } else if (myHead.x === 1 && myHead.y === boardHeight - 2) { // Near bottom-left corner
        moveSafety.left = false;
        moveSafety.up = false;
    } else if (myHead.x === boardWidth - 2 && myHead.y === boardHeight - 2) { // Near bottom-right corner
        moveSafety.right = false;
        moveSafety.up = false;
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

    // Use flood-fill to calculate open space
    const queue = [start];
    const visited = new Set();
    const myBodySet = new Set(myBody.map(segment => `${segment.x},${segment.y}`)); // Ensure myBody is read

    let spaceCount = 0;

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        const key = `${x},${y}`;

        // Skip already visited or out-of-bounds positions
        if (visited.has(key) || x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) continue;

        // Skip positions occupied by any snake
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

        // Skip positions occupied by myBody
        if (myBodySet.has(key)) {
            isOccupied = true;
        }

        if (isOccupied) continue;

        // Mark position as visited
        visited.add(key);
        spaceCount++;

        // Add adjacent positions to the queue
        queue.push({ x: x - 1, y });
        queue.push({ x: x + 1, y });
        queue.push({ x, y: y - 1 });
        queue.push({ x, y: y + 1 });
    }

    return spaceCount; // Return the total open space count
}

function prioritizeFood(food, myHead, moveSafety, gameState, myLength, boardWidth, boardHeight) {
    if (food.length === 0) return null;

    let bestMove = null;
    let closestDistance = Infinity;

    for (const f of food) {
        const distance = Math.abs(f.x - myHead.x) + Math.abs(f.y - myHead.y);

        // Skip food in corners or unsafe spaces
        if (!isFoodSafe(f, boardWidth, boardHeight)) continue;

        // Check if the food is contested by another snake that is one block away
        const isContested = isFoodContested(f, myHead, distance, gameState, myLength);
        if (isContested) {
            console.log(`Food at (${f.x}, ${f.y}) is contested by another snake. Skipping.`);
            continue;
        } 

        // Check for the safest move towards food
        const move = determineMoveDirection(f, myHead, moveSafety);
        if (move && distance < closestDistance) {
            closestDistance = distance;
            bestMove = move;
        }
    }

    return bestMove;
}

function isFoodContested(food, myHead, myDistance, gameState, myLength) {
    const { snakes } = gameState.board;

    for (const snake of snakes) {
        if (snake.id === gameState.you.id) continue; // Skip checking against itself

        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;

        // Check if another snake is one block away from the food
        const enemyDistance = Math.abs(food.x - enemyHead.x) + Math.abs(food.y - enemyHead.y);
        if (enemyDistance === 1) {
            return true; // Another snake is close enough to contest the food
        }
    }

    return false; // Food is not contested
}

function isFoodSafe(food, boardWidth, boardHeight) {
    // Avoid foo d in corners
    return !(food.x === 0 || food.x === boardWidth - 1 || food.y === 0 || food.y === boardHeight - 1);
}

function determineMoveDirection(target, myHead, moveSafety) {
    if (target.x < myHead.x && moveSafety.left) return "left";
    if (target.x > myHead.x && moveSafety.right) return "right";
    if (target.y < myHead.y && moveSafety.down) return "down";
    if (target.y > myHead.y && moveSafety.up) return "up";
    return null; // No safe move toward the target
}