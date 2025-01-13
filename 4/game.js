// 游戏配置
const config = {
    rows: 12,
    cols: 12,
    blockSize: 40,
    blockTypes: 12,
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D5', '#9B59B6', '#FFC857', '#E94F37',
             '#1ABC9C', '#3498DB', '#9B59B6', '#E67E22', '#2ECC71', '#E74C3C'],
    emojis: ['😀', '😎', '🤩', '😍', '🥳', '🤪', '😜', '🤓', '😇', '🥰', '😘', '😋']
};

// 游戏状态
let gameState = {
    grid: [],
    score: 0,
    isAnimating: false,
    isGameOver: false
};

// 初始化游戏
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = config.cols * config.blockSize;
    canvas.height = config.rows * config.blockSize;
    
    // 初始化网格
    gameState.grid = [];
    for (let row = 0; row < config.rows; row++) {
        const currentRow = [];
        for (let col = 0; col < config.cols; col++) {
            currentRow.push({
                type: Math.floor(Math.random() * config.blockTypes),
                x: col * config.blockSize,
                y: row * config.blockSize
            });
        }
        gameState.grid.push(currentRow);
    }
    
    // 优化初始网格生成
    let attempts = 0;
    while (checkMatches().length > 0 && attempts < 10) {
        regenerateGrid();
        attempts++;
    }
    if (attempts === 10) {
        console.log('达到最大尝试次数，可能存在无法消除的方块');
    }
    
    drawGrid();
}

// 重新生成网格
function regenerateGrid() {
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            gameState.grid[row][col].type = Math.floor(Math.random() * config.blockTypes);
        }
    }
}

// 绘制网格
function drawGrid() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            const block = gameState.grid[row][col];
            if (block.type !== null) {
                // 绘制背景色
                ctx.fillStyle = config.colors[block.type];
                ctx.beginPath();
                ctx.roundRect(block.x, block.y, config.blockSize, config.blockSize, 10);
                ctx.fill();
                
                // 添加阴影效果
                ctx.shadowBlur = 8;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                
                // 绘制表情包
                ctx.font = `${config.blockSize * 0.6}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(
                    config.emojis[block.type],
                    block.x + config.blockSize / 2,
                    block.y + config.blockSize / 2
                );
                
                // 添加高光效果
                ctx.beginPath();
                ctx.arc(
                    block.x + config.blockSize * 0.8,
                    block.y + config.blockSize * 0.2,
                    config.blockSize * 0.1,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();
            }
        }
    }
}

// 检查是否有可消除的方块
function checkMatches() {
    let matches = [];
    
    // 水平方向检查
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols - 2; col++) {
            const currentType = gameState.grid[row][col].type;
            if (currentType !== null &&
                currentType === gameState.grid[row][col + 1].type &&
                currentType === gameState.grid[row][col + 2].type) {
                matches.push({row, col, direction: 'horizontal'});
            }
        }
    }
    
    // 垂直方向检查
    for (let col = 0; col < config.cols; col++) {
        for (let row = 0; row < config.rows - 2; row++) {
            const currentType = gameState.grid[row][col].type;
            if (currentType !== null &&
                currentType === gameState.grid[row + 1][col].type &&
                currentType === gameState.grid[row + 2][col].type) {
                matches.push({row, col, direction: 'vertical'});
            }
        }
    }
    
    return matches;
}

// 移除匹配的方块
function removeMatches(matches) {
    matches.forEach(match => {
        if (match.direction === 'horizontal') {
            for (let i = 0; i < 3; i++) {
                gameState.grid[match.row][match.col + i].type = null;
            }
        } else {
            for (let i = 0; i < 3; i++) {
                gameState.grid[match.row + i][match.col].type = null;
            }
        }
    });
}

// 让上方方块下落
function dropBlocks() {
    return new Promise((resolve) => {
        const dropAnimations = [];
        
        // 计算每个方块的目标位置
        for (let col = 0; col < config.cols; col++) {
            let emptyRow = config.rows - 1;
            for (let row = config.rows - 1; row >= 0; row--) {
                const block = gameState.grid[row][col];
                if (block.type !== null) {
                    if (row !== emptyRow) {
                        // 记录动画信息
                        dropAnimations.push({
                            block,
                            startY: block.y,
                            endY: emptyRow * config.blockSize,
                            speed: 0
                        });
                        
                        // 更新方块位置
                        gameState.grid[emptyRow][col].type = block.type;
                        block.type = null;
                    }
                    emptyRow--;
                }
            }
        }
        
        // 执行下落动画
        const animate = () => {
            let completed = true;
            
            dropAnimations.forEach(anim => {
                anim.speed += 0.5; // 模拟重力加速度
                anim.block.y += anim.speed;
                
                if (anim.block.y >= anim.endY) {
                    anim.block.y = anim.endY;
                } else {
                    completed = false;
                }
            });
            
            drawGrid();
            
            if (!completed) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        animate();
    });
}

// 补充新方块
function fillEmptyBlocks() {
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            if (gameState.grid[row][col].type === null) {
                gameState.grid[row][col].type = Math.floor(Math.random() * config.blockTypes);
            }
        }
    }
}

// 得分显示
function drawScore() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.fillText(`得分: ${gameState.score}`, 10, 30);
}

// 检查是否还有可消除的方块
function hasPossibleMoves() {
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            // 检查右侧交换
            if (col < config.cols - 1) {
                [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                    [gameState.grid[row][col + 1], gameState.grid[row][col]];
                
                if (checkMatches().length > 0) {
                    [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                        [gameState.grid[row][col + 1], gameState.grid[row][col]];
                    return true;
                }
                
                [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                    [gameState.grid[row][col + 1], gameState.grid[row][col]];
            }
            
            // 检查下方交换
            if (row < config.rows - 1) {
                [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                    [gameState.grid[row + 1][col], gameState.grid[row][col]];
                
                if (checkMatches().length > 0) {
                    [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                        [gameState.grid[row + 1][col], gameState.grid[row][col]];
                    return true;
                }
                
                [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                    [gameState.grid[row + 1][col], gameState.grid[row][col]];
            }
        }
    }
    return false;
}

// 显示游戏结束界面
function showGameOver() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.font = '30px Arial';
    ctx.fillText(`最终得分: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 30);
}

// 消除动画
function animateMatches(matches) {
    return new Promise((resolve) => {
        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
            matches.forEach(match => {
                if (match.direction === 'horizontal') {
                    for (let i = 0; i < 3; i++) {
                        const block = gameState.grid[match.row][match.col + i];
                        block.type = blinkCount % 2 === 0 ? null : block.type;
                    }
                } else {
                    for (let i = 0; i < 3; i++) {
                        const block = gameState.grid[match.row + i][match.col];
                        block.type = blinkCount % 2 === 0 ? null : block.type;
                    }
                }
            });
            
            drawGrid();
            blinkCount++;
            
            if (blinkCount === 6) {
                clearInterval(blinkInterval);
                resolve();
            }
        }, 200);
    });
}

// 处理消除
async function handleMatches() {
    while (true) {
        const matches = checkMatches();
        if (!matches.length) break;
        
        // 播放消除动画
        await animateMatches(matches);
        
        // 计算得分
        gameState.score += matches.length * 100;
        
        // 移除匹配的方块
        removeMatches(matches);
        
        // 让上方方块下落
        await dropBlocks();
        
        // 补充新方块
        fillEmptyBlocks();
        
        // 等待新方块下落
        await dropBlocks();
        
        drawGrid();
        drawScore();
        
        // 检查游戏是否结束
        if (!hasPossibleMoves()) {
            showGameOver();
            gameState.isGameOver = true;
            return;
        }
    }
}

// 执行交换动画
function swapAnimation(block1, block2) {
    return new Promise((resolve) => {
        const duration = 300; // 动画持续时间
        const startTime = performance.now();
        
        const startX1 = block1.x;
        const startY1 = block1.y;
        const endX1 = block2.x;
        const endY1 = block2.y;
        
        const startX2 = block2.x;
        const startY2 = block2.y;
        const endX2 = block1.x;
        const endY2 = block1.y;
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            block1.x = startX1 + (endX1 - startX1) * progress;
            block1.y = startY1 + (endY1 - startY1) * progress;
            
            block2.x = startX2 + (endX2 - startX2) * progress;
            block2.y = startY2 + (endY2 - startY2) * progress;
            
            drawGrid();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };
        
        requestAnimationFrame(animate);
    });
}

// AI 寻找最佳移动
function findBestMove() {
    let bestMove = null;
    let maxScore = 0;
    const visited = new Set();
    
    // 遍历所有可能的交换
    for (let row = 0; row < config.rows; row++) {
        for (let col = 0; col < config.cols; col++) {
            // 只检查有方块的格子
            if (gameState.grid[row][col].type === null) continue;
            
            // 尝试与右侧方块交换
            if (col < config.cols - 1 && gameState.grid[row][col + 1].type !== null) {
                const key = `${row},${col},right`;
                if (!visited.has(key)) {
                    visited.add(key);
                    
                    // 交换方块
                    [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                        [gameState.grid[row][col + 1], gameState.grid[row][col]];
                    
                    const matches = checkMatches();
                    if (matches.length > 0) {
                        const score = matches.length * 100;
                        if (score > maxScore) {
                            maxScore = score;
                            bestMove = {row, col, direction: 'right'};
                        }
                    }
                    
                    // 恢复交换
                    [gameState.grid[row][col], gameState.grid[row][col + 1]] = 
                        [gameState.grid[row][col + 1], gameState.grid[row][col]];
                }
            }
            
            // 尝试与下方方块交换
            if (row < config.rows - 1 && gameState.grid[row + 1][col].type !== null) {
                const key = `${row},${col},down`;
                if (!visited.has(key)) {
                    visited.add(key);
                    
                    // 交换方块
                    [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                        [gameState.grid[row + 1][col], gameState.grid[row][col]];
                    
                    const matches = checkMatches();
                    if (matches.length > 0) {
                        const score = matches.length * 100;
                        if (score > maxScore) {
                            maxScore = score;
                            bestMove = {row, col, direction: 'down'};
                        }
                    }
                    
                    // 恢复交换
                    [gameState.grid[row][col], gameState.grid[row + 1][col]] = 
                        [gameState.grid[row + 1][col], gameState.grid[row][col]];
                }
            }
        }
    }
    
    return bestMove;
}

// AI 执行移动
async function aiMove() {
    if (gameState.isGameOver) return;
    
    const bestMove = findBestMove();
    if (!bestMove) {
        showGameOver();
        gameState.isGameOver = true;
        return;
    }
    
    const {row, col, direction} = bestMove;
    
    const block1 = gameState.grid[row][col];
    const block2 = direction === 'right' 
        ? gameState.grid[row][col + 1]
        : gameState.grid[row + 1][col];
    
    // 执行交换动画
    await swapAnimation(block1, block2);
    
    // 实际交换方块
    if (direction === 'right') {
        [block1.type, block2.type] = [block2.type, block1.type];
    } else {
        [block1.type, block2.type] = [block2.type, block1.type];
    }
    
    // 等待观察
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await handleMatches();
}

// 启动游戏
initGame();
drawScore();

// 添加点击事件
document.getElementById('gameCanvas').addEventListener('click', async (e) => {
    if (gameState.isAnimating || gameState.isGameOver) return;
    
    gameState.isAnimating = true;
    await handleMatches();
    gameState.isAnimating = false;
});

// 自动模式
setInterval(async () => {
    if (gameState.isAnimating || gameState.isGameOver) return;
    
    gameState.isAnimating = true;
    await aiMove();
    gameState.isAnimating = false;
}, 1000);