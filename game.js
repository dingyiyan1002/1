// 游戏常量
const GRID_SIZE = 20;
const CANVAS_SIZE = 600;
const FPS = 10;

// 创建离屏canvas
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = CANVAS_SIZE;
offscreenCanvas.height = CANVAS_SIZE;
const offscreenCtx = offscreenCanvas.getContext('2d');

// 游戏状态
let gameState = {
    running: false,
    paused: false,
    snakes: [],
    foods: [],
    scores: {},
    timeLeft: 60,
    timer: null
};

// 初始化游戏
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d');

    // 初始化事件监听
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('autoBtn').addEventListener('click', toggleAutoMode);

    // 初始化键盘控制
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keydown', preventDefaultKeys);

    // 初始化游戏对象
    initObjects();
}

// 初始化游戏对象
function initObjects() {
    // 初始化蛇
    gameState.snakes = [
        createSnake({x: 5, y: 5}, 'right', '#4CAF50', false), // 玩家控制的蛇
        createSnake({x: 15, y: 15}, 'left', '#2196F3', true), // AI 1
        createSnake({x: 25, y: 25}, 'up', '#FF5722', true) // AI 2
    ];

    // 初始化食物
    gameState.foods = [createFood(), createFood()];

    // 初始化得分
    gameState.scores = {
        player: 0,
        ai1: 0,
        ai2: 0
    };

    // 初始化倒计时
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    gameState.timeLeft = 60;
    gameState.timer = setInterval(() => {
        if (gameState.running) {
            gameState.timeLeft--;
            updateScoreboard();
            if (gameState.timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);

    // 确保托管按钮状态正确
    const autoBtn = document.getElementById('autoBtn');
    autoBtn.classList.remove('active');
    autoBtn.textContent = '托管模式';
}

// 创建蛇对象
function createSnake(position, direction, color, aiControlled) {
    return {
        body: [position],
        direction: direction,
        color: color,
        aiControlled: aiControlled
    };
}

// 处理键盘输入
function handleKeyPress(event) {
    const playerSnake = gameState.snakes[0];
    if (playerSnake.aiControlled) return; // 托管模式下不处理键盘输入
    
    switch(event.key) {
        case 'ArrowUp':
            if (playerSnake.direction !== 'down') playerSnake.direction = 'up';
            break;
        case 'ArrowDown':
            if (playerSnake.direction !== 'up') playerSnake.direction = 'down';
            break;
        case 'ArrowLeft':
            if (playerSnake.direction !== 'right') playerSnake.direction = 'left';
            break;
        case 'ArrowRight':
            if (playerSnake.direction !== 'left') playerSnake.direction = 'right';
            break;
    }
}

// 创建蛇对象
function createSnake(position, direction, color) {
    return {
        body: [position],
        direction: direction,
        color: color,
        aiControlled: color !== '#4CAF50'
    };
}

// 创建食物对象
function createFood() {
    return {
        position: {
            x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
            y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
        },
        value: 1
    };
}

// 移动蛇
function moveSnake(snake) {
    const head = {...snake.body[0]};
    
    if (snake.aiControlled) {
        // AI蛇自动寻路
        const nextDirection = findPath(snake);
        if (nextDirection) {
            snake.direction = nextDirection;
        }
    }

    // 根据方向计算新头部位置
    switch(snake.direction) {
        case 'up':
            head.y -= 1;
            break;
        case 'down':
            head.y += 1;
            break;
        case 'left':
            head.x -= 1;
            break;
        case 'right':
            head.x += 1;
            break;
    }

    // 添加新头部，移除尾部
    snake.body.unshift(head);
    snake.body.pop();
}

// 改进的多蛇AI决策系统
function findPath(snake) {
    const head = snake.body[0];
    
    // 获取所有可能的目标（食物和其他蛇的尾部）
    const targets = [];
    
    // 每个食物作为一个目标
    gameState.foods.forEach(food => {
        const danger = calculateDangerScore(food.position);
        const distance = heuristic(head, food.position);
        const score = (10 / (distance + 1)) - danger * 0.5;
        
        targets.push({
            position: food.position,
            type: 'food',
            value: score
        });
    });

    // 其他蛇的尾部作为潜在目标
    gameState.snakes.forEach(otherSnake => {
        if (otherSnake !== snake && otherSnake.body.length > 1) {
            const tail = otherSnake.body[otherSnake.body.length - 1];
            const danger = calculateDangerScore(tail);
            const distance = heuristic(head, tail);
            const score = (15 / (distance + 1)) - danger * 0.3;
            
            targets.push({
                position: tail,
                type: 'tail',
                value: score
            });
        }
    });

    // 选择最佳目标
    let bestTarget = null;
    let bestScore = -Infinity;

    targets.forEach(target => {
        if (target.value > bestScore) {
            bestScore = target.value;
            bestTarget = target.position;
        }
    });

    // 如果没有合适目标，尝试寻找安全区域
    if (!bestTarget) {
        // 寻找最安全的区域
        let safestPosition = null;
        let lowestDanger = Infinity;
        
        for (let x = 0; x < CANVAS_SIZE/GRID_SIZE; x++) {
            for (let y = 0; y < CANVAS_SIZE/GRID_SIZE; y++) {
                const pos = {x, y};
                if (isWalkable(pos)) {
                    const danger = calculateDangerScore(pos);
                    if (danger < lowestDanger) {
                        lowestDanger = danger;
                        safestPosition = pos;
                    }
                }
            }
        }
        
        if (safestPosition) {
            bestTarget = safestPosition;
        }
    }

    // 使用改进的A*算法寻找路径
    const openSet = new Set();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    const startKey = `${head.x},${head.y}`;
    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(head, bestTarget));

    while (openSet.size > 0) {
        // 获取fScore最小的节点
        let currentKey = null;
        let lowestFScore = Infinity;
        for (const key of openSet) {
            const score = fScore.get(key) || Infinity;
            if (score < lowestFScore) {
                lowestFScore = score;
                currentKey = key;
            }
        }

        const [currentX, currentY] = currentKey.split(',').map(Number);
        const current = {x: currentX, y: currentY};

        // 找到目标
        if (current.x === bestTarget.x && current.y === bestTarget.y) {
            return reconstructPath(cameFrom, currentKey, head);
        }

        openSet.delete(currentKey);
        closedSet.add(currentKey);

        // 检查四个方向
        const neighbors = [
            {x: current.x, y: current.y - 1}, // 上
            {x: current.x, y: current.y + 1}, // 下
            {x: current.x - 1, y: current.y}, // 左
            {x: current.x + 1, y: current.y}  // 右
        ];

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            
            // 跳过障碍物和边界
            if (!isWalkable(neighbor) || closedSet.has(neighborKey)) {
                continue;
            }

            // 计算tentative gScore，考虑危险程度
            const danger = calculateDangerScore(neighbor);
            const tentativeGScore = (gScore.get(currentKey) || 0) + 1 + danger * 0.5;

            if (!openSet.has(neighborKey)) {
                openSet.add(neighborKey);
            } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                continue;
            }

            // 记录最佳路径
            cameFrom.set(neighborKey, currentKey);
            gScore.set(neighborKey, tentativeGScore);
            fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, bestTarget));
        }
    }

    // 如果没有找到路径，尝试随机移动
    const possibleDirections = ['up', 'down', 'left', 'right'];
    const safeDirections = possibleDirections.filter(dir => {
        const newHead = {...head};
        switch(dir) {
            case 'up': newHead.y -= 1; break;
            case 'down': newHead.y += 1; break;
            case 'left': newHead.x -= 1; break;
            case 'right': newHead.x += 1; break;
        }
        return isWalkable(newHead);
    });

    if (safeDirections.length > 0) {
        return safeDirections[Math.floor(Math.random() * safeDirections.length)];
    }

    return null;
}

// 启发式函数（曼哈顿距离）
function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// 计算位置的危险程度
function calculateDangerScore(position) {
    let danger = 0;

    // 检查附近是否有其他蛇
    gameState.snakes.forEach(snake => {
        snake.body.forEach((segment, index) => {
            const dist = heuristic(position, segment);
            if (dist < 3) {
                danger += (3 - dist) * 10; // 距离越近危险值越高
            }
        });
    });

    // 检查是否靠近边界
    const borderDist = Math.min(
        position.x,
        CANVAS_SIZE/GRID_SIZE - 1 - position.x,
        position.y,
        CANVAS_SIZE/GRID_SIZE - 1 - position.y
    );
    if (borderDist < 3) {
        danger += (3 - borderDist) * 5;
    }

    return danger;
}

// 重建路径
function reconstructPath(cameFrom, currentKey, head) {
    const path = [];
    while (cameFrom.has(currentKey)) {
        path.push(currentKey);
        currentKey = cameFrom.get(currentKey);
    }
    path.reverse();

    if (path.length > 0) {
        const [nextX, nextY] = path[0].split(',').map(Number);
        if (nextX > head.x) return 'right';
        if (nextX < head.x) return 'left';
        if (nextY > head.y) return 'down';
        if (nextY < head.y) return 'up';
    }
    return null;
}

// 判断位置是否可走
function isWalkable(position) {
    // 检查边界
    if (position.x < 0 || position.x >= CANVAS_SIZE/GRID_SIZE ||
        position.y < 0 || position.y >= CANVAS_SIZE/GRID_SIZE) {
        return false;
    }

    // 检查所有蛇的身体
    for (const snake of gameState.snakes) {
        for (const segment of snake.body) {
            if (segment.x === position.x && segment.y === position.y) {
                return false;
            }
        }
    }

    return true;
}

// 检查碰撞
function checkCollisions() {
    gameState.snakes.forEach((snake, index) => {
        const head = snake.body[0];

        // 边界碰撞检测
        if (head.x < 0 || head.x >= CANVAS_SIZE/GRID_SIZE ||
            head.y < 0 || head.y >= CANVAS_SIZE/GRID_SIZE) {
            handleCollision(snake);
            return;
        }

        // 自身碰撞检测
        for (let i = 1; i < snake.body.length; i++) {
            if (head.x === snake.body[i].x && head.y === snake.body[i].y) {
                handleCollision(snake);
                return;
            }
        }

        // 与其他蛇的碰撞检测
        gameState.snakes.forEach((otherSnake, otherIndex) => {
            if (index !== otherIndex) {
                otherSnake.body.forEach(segment => {
                    if (head.x === segment.x && head.y === segment.y) {
                        handleCollision(snake);
                        return;
                    }
                });
            }
        });

        // 食物碰撞检测
        gameState.foods.forEach((food, foodIndex) => {
            if (head.x === food.position.x && head.y === food.position.y) {
                // 蛇吃到食物，身体增长
                snake.body.push({...snake.body[snake.body.length - 1]});
                
                // 更新得分
                if (snake.aiControlled) {
                    if (snake.color === '#2196F3') {
                        gameState.scores.ai1 += food.value;
                    } else {
                        gameState.scores.ai2 += food.value;
                    }
                } else {
                    gameState.scores.player += food.value;
                }
                
                // 生成新食物
                gameState.foods[foodIndex] = createFood();
                updateScoreboard();
            }
        });
    });
}

// 处理碰撞
function handleCollision(snake) {
    if (snake.aiControlled) {
        gameState.scores.player += 5; // 玩家得分奖励
    } else {
        if (snake.color === '#2196F3') {
            gameState.scores.ai1 += 5; // AI 1得分奖励
        } else {
            gameState.scores.ai2 += 5; // AI 2得分奖励
        }
    }
    updateScoreboard();
    
    // 重生蛇
    const newPosition = {
        x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
    };
    snake.body = [newPosition];
    snake.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
}

// 更新得分板
function updateScoreboard() {
    const scoreList = document.getElementById('scoreList');
    scoreList.innerHTML = `
        <li>玩家: ${gameState.scores.player}</li>
        <li>AI 1: ${gameState.scores.ai1}</li>
        <li>AI 2: ${gameState.scores.ai2}</li>
        <li>剩余时间: ${gameState.timeLeft}秒</li>
    `;
}

// 结束游戏
function endGame() {
    gameState.running = false;
    clearInterval(gameState.timer);
    alert('游戏结束！');
    updateScoreboard();
}

// 游戏主循环
function gameLoop() {
    if (!gameState.running || gameState.paused) return;

    update();
    render();

    setTimeout(() => {
        requestAnimationFrame(gameLoop);
    }, 1000 / FPS);
}

// 更新游戏状态
function update() {
    // 更新蛇的位置
    gameState.snakes.forEach(snake => {
        moveSnake(snake);
    });

    // 检查碰撞
    checkCollisions();
}

// 启动游戏
function startGame() {
    if (!gameState.running) {
        gameState.running = true;
        gameLoop();
    }
}

// 暂停/继续游戏
function togglePause() {
    gameState.paused = !gameState.paused;
}

// 重新开始游戏
function restartGame() {
    gameState.running = false;
    gameState.paused = false;
    initObjects();
    startGame();
}

// 切换托管模式
function toggleAutoMode() {
    const playerSnake = gameState.snakes[0];
    playerSnake.aiControlled = !playerSnake.aiControlled;
    
    const autoBtn = document.getElementById('autoBtn');
    autoBtn.classList.toggle('active');
    autoBtn.textContent = playerSnake.aiControlled ? '取消托管' : '托管模式';
}

// 防止页面滚动
function preventDefaultKeys(event) {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    if (keys.includes(event.key)) {
        event.preventDefault();
    }
}

// 改进的蛇绘制方法
function drawSnake(ctx, snake) {
    const bodyLength = snake.body.length;
    
    snake.body.forEach((segment, index) => {
        // 计算渐变大小
        const sizeFactor = 1 - (index / bodyLength) * 0.5;
        const size = GRID_SIZE * sizeFactor;
        const offset = (GRID_SIZE - size) / 2;
        
        // 计算渐变颜色
        const colorFactor = index / bodyLength;
        const r = parseInt(snake.color.slice(1, 3), 16);
        const g = parseInt(snake.color.slice(3, 5), 16);
        const b = parseInt(snake.color.slice(5, 7), 16);
        const alpha = 1 - colorFactor * 0.3;
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        
        // 绘制蛇身
        ctx.beginPath();
        if (index === 0) {
            // 绘制蛇头
            ctx.arc(
                segment.x * GRID_SIZE + GRID_SIZE/2,
                segment.y * GRID_SIZE + GRID_SIZE/2,
                size/2,
                0,
                Math.PI * 2
            );
        } else {
            // 绘制蛇身
            ctx.rect(
                segment.x * GRID_SIZE + offset,
                segment.y * GRID_SIZE + offset,
                size,
                size
            );
        }
        ctx.fill();
    });
}

// 绘制食物
function drawFood(ctx, food) {
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.arc(
        food.position.x * GRID_SIZE + GRID_SIZE/2,
        food.position.y * GRID_SIZE + GRID_SIZE/2,
        GRID_SIZE/2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// 渲染游戏
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 在离屏canvas上绘制
    offscreenCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制网格背景
    offscreenCtx.strokeStyle = '#eee';
    for (let i = 0; i < CANVAS_SIZE; i += GRID_SIZE) {
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(i, 0);
        offscreenCtx.lineTo(i, CANVAS_SIZE);
        offscreenCtx.moveTo(0, i);
        offscreenCtx.lineTo(CANVAS_SIZE, i);
        offscreenCtx.stroke();
    }

    // 绘制食物
    gameState.foods.forEach(food => {
        drawFood(offscreenCtx, food);
    });

    // 绘制蛇
    gameState.snakes.forEach(snake => {
        drawSnake(offscreenCtx, snake);
    });

    // 将离屏canvas内容绘制到主canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(offscreenCanvas, 0, 0);
}

// 初始化游戏
initGame();