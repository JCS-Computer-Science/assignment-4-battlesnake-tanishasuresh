export default function move(gameState) {
    // Initialize move safety
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };

    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];
    const myBody = gameState.you.body;
    const myLength = gameState.you.body.length;
    const board = gameState.board;
    const { width: boardWidth, height: boardHeight } = board;

    // Prevent moving backwards
    if (myNeck.x < myHead.x) moveSafety.left = false;
    if (myNeck.x > myHead.x) moveSafety.right = false;
    if (myNeck.y < myHead.y) moveSafety.down = false;
    if (myNeck.y > myHead.y) moveSafety.up = false;

    // Prevent moving out of bounds
    if (myHead.x === 0) moveSafety.left = false;
    if (myHead.x === boardWidth - 1) moveSafety.right = false;
    if (myHead.y === 0) moveSafety.down = false;
    if (myHead.y === boardHeight - 1) moveSafety.up = false;

    // Prevent self-collision
    for (const segment of myBody) {
        if (segment.x === myHead.x && segment.y === myHead.y + 1) moveSafety.up = false;
        if (segment.x === myHead.x && segment.y === myHead.y - 1) moveSafety.down = false;
        if (segment.x === myHead.x - 1 && segment.y === myHead.y) moveSafety.left = false;
        if (segment.x === myHead.x + 1 && segment.y === myHead.y) moveSafety.right = false;
    }

    // Allow head-to-head collisions only if my snake is larger
    for (const snake of gameState.board.snakes) {
        if (snake.id === gameState.you.id) continue; // Skip your own snake

        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;
        const enemyPossibleMoves = getDirections(enemyHead);

        for (const [direction, position] of Object.entries(getDirections(myHead))) {
            for (const enemyPosition of Object.values(enemyPossibleMoves)) {
                if (position.x === enemyPosition.x && position.y === enemyPosition.y) {
                    if (myLength <= enemyLength) {
                        moveSafety[direction] = false; // Avoid head-to-head if the enemy is larger or equal
                    }
                }
            }
        }
    }

    // Avoid trap spaces using enhanced flood-fill space calculation
    for (const [direction, position] of Object.entries(getDirections(myHead))) {
        if (moveSafety[direction] && !hasSufficientSpace(position, myBody, gameState)) {
            moveSafety[direction] = false;
        }
    }

    // Target the closest food while avoiding contested food
    const foodMove = prioritizeFood(gameState.board.food, myHead, moveSafety, gameState, myLength, boardWidth, boardHeight);
    if (foodMove) return { move: foodMove };

    // Fallback to a safe move with strict out-of-bounds checks
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
        return { move: "down" }; // Default fallback
    }

    // Ensure fallback move doesn't accidentally go out of bounds
    const validatedMoves = safeMoves.filter(direction => {
        const nextPosition = getDirections(myHead)[direction];
        return (
            nextPosition.x >= 0 &&
            nextPosition.x < boardWidth &&
            nextPosition.y >= 0 &&
            nextPosition.y < boardHeight
        );
    });

    // Pick a random validated move
    const nextMove = validatedMoves.length > 0
        ? validatedMoves[Math.floor(Math.random() * validatedMoves.length)]
        : safeMoves[Math.floor(Math.random() * safeMoves.length)]; // Fallback if no validated moves

    console.log(`MOVE ${gameState.turn}: ${nextMove}`);
    return { move: nextMove };
}

function getDirections(head) {
    return {
        left: { x: head.x - 1, y: head.y },
        right: { x: head.x + 1, y: head.y },
        down: { x: head.x, y: head.y - 1 },
        up: { x: head.x, y: head.y + 1 }
    };
}

function hasSufficientSpace(start, myBody, gameState) {
    const { width: boardWidth, height: boardHeight, snakes } = gameState.board;

    // Use flood-fill to calculate open space
    const queue = [start];
    const visited = new Set();
    const myBodySet = new Set(myBody.map(segment => `${segment.x},${segment.y}`));

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

    // Check if the open space is sufficient for the snake
    return spaceCount > myBody.length * 2; // Ensure the space is at least double the snake's length
}

function prioritizeFood(food, myHead, moveSafety, gameState, myLength, boardWidth, boardHeight) {
    if (food.length === 0) return null;

    let bestMove = null;
    let closestDistance = Infinity;

    for (const f of food) {
        // Skip food in corners
        if (
            (f.x === 0 && f.y === 0) || // Top-left corner
            (f.x === boardWidth - 1 && f.y === 0) || // Top-right corner
            (f.x === 0 && f.y === boardHeight - 1) || // Bottom-left corner
            (f.x === boardWidth - 1 && f.y === boardHeight - 1) // Bottom-right corner
        ) {
            continue; // Skip this food
        }

        const distance = Math.abs(f.x - myHead.x) + Math.abs(f.y - myHead.y);

        let isFoodContested = false;

        // Check if any other snake is approaching the same food
        for (const snake of gameState.board.snakes) {
            if (snake.id === gameState.you.id) continue; // Skip your own snake

            const enemyHead = snake.body[0];
            const enemyDistance = Math.abs(f.x - enemyHead.x) + Math.abs(f.y - enemyHead.y);

            // If another snake is closer or equally close, mark the food as contested
            if (enemyDistance <= distance) {
                isFoodContested = true;
                break;
            }
        }

        // Skip this food if it's contested
        if (isFoodContested) continue;

        // Update the closest uncontested food
        if (distance < closestDistance) {
            closestDistance = distance;
            bestMove = determineMoveDirection(f, myHead, moveSafety);
        }
    }

    return bestMove;
}

function determineMoveDirection(target, myHead, moveSafety) {
    if (target.x < myHead.x && moveSafety.left) return "left";
    if (target.x > myHead.x && moveSafety.right) return "right";
    if (target.y < myHead.y && moveSafety.down) return "down";
    if (target.y > myHead.y && moveSafety.up) return "up";
    return null; // No safe move toward the target
}