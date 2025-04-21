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
    const board = gameState.board;
    const { width: boardWidth, height: boardHeight } = board;
    const myHealth = gameState.you.health;

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
        const enemyBody = snake.body;

        // Avoid enemy head moves
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y + 1) moveSafety.up = false;
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y - 1) moveSafety.down = false;
        if (enemyHead.x === myHead.x - 1 && enemyHead.y === myHead.y) moveSafety.left = false;
        if (enemyHead.x === myHead.x + 1 && enemyHead.y === myHead.y) moveSafety.right = false;

        // Avoid enemy body positions
        for (const segment of enemyBody) {
            if (segment.x === myHead.x && segment.y === myHead.y + 1) moveSafety.up = false;
            if (segment.x === myHead.x && segment.y === myHead.y - 1) moveSafety.down = false;
            if (segment.x === myHead.x - 1 && segment.y === myHead.y) moveSafety.left = false;
            if (segment.x === myHead.x + 1 && segment.y === myHead.y) moveSafety.right = false;
        }
    }

    // Spin in a circle if health is above 70
    if (myHealth >= 70) {
        if (moveSafety.right) return { move: "right" };
        if (moveSafety.down) return { move: "down" };
        if (moveSafety.left) return { move: "left" };
        if (moveSafety.up) return { move: "up" };
    }

    // Avoid trap spaces using simulation
    for (const [direction, position] of Object.entries(getDirections(myHead))) {
        if (moveSafety[direction] && !simulateEscape(position, 3, boardWidth, boardHeight, gameState)) {
            moveSafety[direction] = false;
        }
    }

    // Target the closest food if health is below 70
    if (myHealth < 70) {
        const foodMove = prioritizeFood(gameState.board.food, myHead, moveSafety);
        if (foodMove) return { move: foodMove };
    }

    // Fallback to a safe and random move
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) {
        return { move: "down" };
    }

    const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
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

function simulateEscape(position, depth, boardWidth, boardHeight, gameState) {
    if (depth === 0) return true;

    const possibleMoves = [
        { x: position.x - 1, y: position.y },
        { x: position.x + 1, y: position.y },
        { x: position.x, y: position.y - 1 },
        { x: position.x, y: position.y + 1 }
    ];

    for (const move of possibleMoves) {
        if (
            move.x >= 0 &&
            move.x < boardWidth &&
            move.y >= 0 &&
            move.y < boardHeight &&
            isMoveSafe(move, gameState)
        ) {
            if (simulateEscape(move, depth - 1, boardWidth, boardHeight, gameState)) {
                return true;
            }
        }
    }

    return false;
}

function isMoveSafe(position, gameState) {
    const myBody = gameState.you.body;
    const allSnakes = gameState.board.snakes;

    // Check self-collision
    for (const segment of myBody) {
        if (segment.x === position.x && segment.y === position.y) return false;
    }

    // Check collision with other snakes
    for (const snake of allSnakes) {
        for (const segment of snake.body) {
            if (segment.x === position.x && segment.y === position.y) return false;
        }
    }

    return true;
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