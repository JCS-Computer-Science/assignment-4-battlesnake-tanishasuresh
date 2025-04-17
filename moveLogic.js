export default function move(gameState) {
    let moveSafety = {
        up: true,
        down: true,
        left: true,
        right: true
    };

    const myHead = gameState.you.body[0];
    const myNeck = gameState.you.body[1];

    // We've included code to prevent your Battlesnake from moving backwards
    if (myNeck.x < myHead.x) {        // Neck is left of head, don't move left
        moveSafety.left = false;

    } else if (myNeck.x > myHead.x) { // Neck is right of head, don't move right
        moveSafety.right = false;

    } else if (myNeck.y < myHead.y) { // Neck is below head, don't move down
        moveSafety.down = false;

    } else if (myNeck.y > myHead.y) { // Neck is above head, don't move up
        moveSafety.up = false;
    }

    // TODO: Step 1 - Prevent your Battlesnake from moving out of bounds
    // gameState.board contains an object representing the game board including its width and height
    // https://docs.battlesnake.com/api/objects/board
    //within real bounds
    const boardWidth = gameState.board.width;
    const boardHeight = gameState.board.height;

    if (myHead.x === 0) {             // Head is at the left edge, don't move left
        moveSafety.left = false;
    }
    if (myHead.x === boardWidth - 1) { // Head is at the right edge, don't move right
        moveSafety.right = false;
    }
    if (myHead.y === 0) {             // Head is at the bottom edge, don't move down
        moveSafety.down = false;
    }
    if (myHead.y === boardHeight - 1) { // Head is at the top edge, don't move up
        moveSafety.up = false;
    }

    // TODO: Step 2 - Prevent your Battlesnake from colliding with itself
    // gameState.you contains an object representing your snake, including its coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const myBody = gameState.you.body;
    for (const segment of myBody) {
        if (segment.x === myHead.x - 1 && segment.y === myHead.y) {
            moveSafety.left = false;
        }
        if (segment.x === myHead.x + 1 && segment.y === myHead.y) {
            moveSafety.right = false;
        }
        if (segment.x === myHead.x && segment.y === myHead.y - 1) {
            moveSafety.down = false;
        }
        if (segment.x === myHead.x && segment.y === myHead.y + 1) {
            moveSafety.up = false;
        }
    }

    // TODO: Step 3 - Prevent your Battlesnake from colliding with other Battlesnakes
    // gameState.board.snakes contains an array of enemy snake objects, which includes their coordinates
    // https://docs.battlesnake.com/api/objects/battlesnake
    const otherSnakes = gameState.board.snakes;
    for (const snake of otherSnakes) {
        for (const segment of snake.body) {
            if (segment.x === myHead.x - 1 && segment.y === myHead.y) {
                moveSafety.left = false;
            }
            if (segment.x === myHead.x + 1 && segment.y === myHead.y) {
                moveSafety.right = false;
            }
            if (segment.x === myHead.x && segment.y === myHead.y - 1) {
                moveSafety.down = false;
            }
            if (segment.x === myHead.x && segment.y === myHead.y + 1) {
                moveSafety.up = false;
            }
        }
    }

    for (const snake of otherSnakes) {
        const enemyHead = snake.body[0];
        const enemyLength = snake.length;

        // Check if enemy head is moving into the same space as your head
        if (enemyHead.x === myHead.x - 1 && enemyHead.y === myHead.y && myLength <= enemyLength) {
            moveSafety.left = false;
        }
        if (enemyHead.x === myHead.x + 1 && enemyHead.y === myHead.y && myLength <= enemyLength) {
            moveSafety.right = false;
        }
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y - 1 && myLength <= enemyLength) {
            moveSafety.down = false;
        }
        if (enemyHead.x === myHead.x && enemyHead.y === myHead.y + 1 && myLength <= enemyLength) {
            moveSafety.up = false;
        }
    }

    // TODO: Step 4 - Move towards food instead of random, to regain health and survive longer
    // gameState.board.food contains an array of food coordinates https://docs.battlesnake.com/api/objects/board
    const food = gameState.board.food;
    if (food.length > 0) {
        // Find the closest food
        let closestFood = food[0];
        let closestDistance = Math.abs(food[0].x - myHead.x) + Math.abs(food[0].y - myHead.y);

        

        for (const f of food) {
            const distance = Math.abs(f.x - myHead.x) + Math.abs(f.y - myHead.y);
            if (distance < closestDistance) {
                closestFood = f;
                closestDistance = distance;
            }
        }

        // Prioritize moves toward the closest food
        if (closestFood.x < myHead.x && moveSafety.left) {
            return { move: "left" };
        }
        if (closestFood.x > myHead.x && moveSafety.right) {
            return { move: "right" };
        }
        if (closestFood.y < myHead.y && moveSafety.down) {
            return { move: "down" };
        }
        if (closestFood.y > myHead.y && moveSafety.up) {
            return { move: "up" };
        }
    }

    // Are there any safe moves left?
    const safeMoves = Object.keys(moveSafety).filter(direction => moveSafety[direction]);
    if (safeMoves.length === 0) {
        console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
        return { move: "down" };
    }

    // Choose a random move from the safe moves
    const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];

    console.log(`MOVE ${gameState.turn}: ${nextMove}`);
    return { move: nextMove };
}