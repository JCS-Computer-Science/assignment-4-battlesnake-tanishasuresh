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

    // Predict and avoid enemy snake moves
    for (const snake of gameState.board.snakes) {
        if (snake.id === gameState.you.id) continue;

        const enemyHead = snake.body[0];
        const enemyLength = snake.body.length;

        // Avoid enemy head moves
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y + 1 && enemyLength >= myLength) moveSafety.up = false;
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y - 1 && enemyLength >= myLength) moveSafety.down = false;
        if (enemyHead.x === myHead.x - 1 && enemyHead.y === myHead.y && enemyLength >= myLength) moveSafety.left = false;
        if (enemyHead.x === myHead.x + 1 && enemyHead.y === myHead.y && enemyLength >= myLength) moveSafety.right = false;

        // Avoid enemy body positions
        for (const segment of snake.body) {
            if (segment.x === myHead.x && segment.y === myHead.y + 1) moveSafety.up = false;
            if (segment.x === myHead.x && segment.y === myHead.y - 1) moveSafety.down = false;
            if (segment.x === myHead.x - 1 && segment.y === myHead.y) moveSafety.left = false;
            if (segment.x === myHead.x + 1 && segment.y === myHead.y) moveSafety.right = false;
        }
    }

    // Avoid trap spaces using flood-fill space calculation
    for (const [direction, position] of Object.entries(getDirections(myHead))) {
        if (moveSafety[direction] && !hasSufficientSpace(position, myBody, gameState)) {
            moveSafety[direction] = false;
        }
    }

    // Target the closest food
    const foodMove = prioritizeFood(gameState.board.food, myHead, moveSafety);
    if (foodMove) return { move: foodMove };

    // Fallback to a safe and random move
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
        return { move: "down" };
    }

    const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
    console.log(`MOVE ${gameState.turn}: ${nextMove}`);
    return { move: nextMove };
}

function getDirections(myHead) {
    return {
        left: { x: myHead.x - 1, y: myHead.y },
        right: { x: myHead.x + 1, y: myHead.y },
        down: { x: myHead.x, y: myHead.y - 1 },
        up: { x: myHead.x, y: myHead.y + 1 }
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
    return spaceCount > myBody.length;
}

function prioritizeFood(food, myHead, moveSafety) {
    if (food.length === 0) return null;

    let closestFood = null;
    let closestDistance = Infinity;

    for (const f of food) {
        const distance = Math.abs(f.x - myHead.x) + Math.abs(f.y - myHead.y);

        if (distance < closestDistance) {
            closestFood = f;
            closestDistance = distance;
        }
    }

    if (closestFood) {
        if (closestFood.x < myHead.x && moveSafety.left) return "left";
        if (closestFood.x > myHead.x && moveSafety.right) return "right";
        if (closestFood.y < myHead.y && moveSafety.down) return "down";
        if (closestFood.y > myHead.y && moveSafety.up) return "up";
    }

    return null;
}