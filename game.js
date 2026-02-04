// 水果接龙游戏 - 完整版
(function() {
    'use strict';
    
    // 微信浏览器检测
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 游戏主对象
    const FruitGame = {
        // 游戏状态
        isRunning: false,
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        timeLeft: 60,
        combo: 0,
        maxCombo: 0,
        gameTime: 0,
        lastFruitTime: 0,
        
        // 音频控制
        audioEnabled: false,
        soundVolume: 0.7,
        
        // 游戏元素
        canvas: null,
        ctx: null,
        basket: {
            x: 0,
            y: 0,
            width: 100,
            height: 20,
            speed: 8,
            color: '#FF8C00'
        },
        
        // 水果数组
        fruits: [],
        collectedFruits: [],
        
        // 特殊效果
        effects: [],
        achievements: [],
        
        // 键盘控制
        keys: {
            left: false,
            right: false
        },
        
        // 触摸控制
        touchStartX: 0,
        touchStartY: 0,
        touchStartTime: 0,
        
        // 移动控制
        moveInterval: null,
        
        // 游戏配置
        config: {
            fruitTypes: ['apple', 'banana', 'watermelon', 'grape', 'orange', 'strawberry'],
            fruitIcons: {
                apple: '🍎',
                banana: '🍌',
                watermelon: '🍉',
                grape: '🍇',
                orange: '🍊',
                strawberry: '🍓'
            },
            fruitColors: {
                apple: '#FF6B6B',
                banana: '#FFD166',
                watermelon: '#06D6A0',
                grape: '#118AB2',
                orange: '#FF9A3C',
                strawberry: '#FF477E'
            },
            fruitPoints: {
                apple: 10,
                banana: 15,
                watermelon: 20,
                grape: 25,
                orange: 30,
                strawberry: 35
            },
            specialFruits: ['bomb', 'rainbow'],
            levelUpScore: 200,
            fruitInterval: 1000,
            fruitSpeed: 2,
            maxFruits: 20
        },
        
        // 初始化游戏
        init() {
            console.log('🚀 初始化水果接龙游戏...');
            console.log('📱 设备:', isMobile ? '移动端' : '桌面端');
            console.log('💬 微信:', isWechat ? '是' : '否');
            
            // 获取Canvas元素
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            
            // 设置Canvas尺寸
            this.setCanvasSize();
            window.addEventListener('resize', () => this.setCanvasSize());
            
            // 初始化篮子位置
            this.basket.x = this.canvas.width / 2 - this.basket.width / 2;
            this.basket.y = this.canvas.height - 40;
            
            // 初始化水果槽位
            this.initFruitSlots();
            
            // 绑定事件
            this.bindEvents();
            
            // 初始化音频
            this.initAudio();
            
            // 添加圆角矩形支持
            this.addRoundRectSupport();
            
            // 显示加载信息
            setTimeout(() => {
                document.getElementById('loadingOverlay').style.display = 'none';
                this.showMessage('欢迎来到水果接龙', '点击"开始游戏"按钮开始冒险！');
                
                // 微信环境下显示提示
                if (isWechat) {
                    document.getElementById('wechatTip').style.display = 'block';
                    setTimeout(() => {
                        document.getElementById('wechatTip').style.display = 'none';
                    }, 5000);
                }
                
                // 显示音频提示
                if (!this.audioEnabled) {
                    document.getElementById('audioTip').style.display = 'block';
                }
                
                // 显示部署信息
                this.updateDeployInfo();
            }, 1500);
            
            // 绘制初始界面
            this.draw();
        },
        
        // 设置Canvas尺寸
        setCanvasSize() {
            const container = document.querySelector('.game-canvas-container');
            const width = container.clientWidth - 30; // 减去padding
            
            this.canvas.width = width;
            this.canvas.height = 400;
            
            // 更新篮子位置
            this.basket.x = Math.max(0, Math.min(this.basket.x, width - this.basket.width));
            this.basket.y = this.canvas.height - 40;
        },
        
        // 初始化水果槽位
        initFruitSlots() {
            const container = document.getElementById('collectedFruits');
            container.innerHTML = '';
            
            for (let i = 0; i < 7; i++) {
                const slot = document.createElement('div');
                slot.className = 'fruit-slot';
                slot.id = `fruitSlot${i}`;
                container.appendChild(slot);
            }
        },
        
        // 更新水果槽位显示
        updateFruitSlots() {
            for (let i = 0; i < 7; i++) {
                const slot = document.getElementById(`fruitSlot${i}`);
                if (i < this.collectedFruits.length) {
                    const fruit = this.collectedFruits[i];
                    slot.innerHTML = this.config.fruitIcons[fruit.type] || '❓';
                    slot.style.background = this.config.fruitColors[fruit.type] || '#FFFFFF';
                } else {
                    slot.innerHTML = '';
                    slot.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            }
        },
        
        // 绑定事件
        bindEvents() {
            // 控制按钮
            document.getElementById('startBtn').addEventListener('click', () => this.startGame());
            document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
            document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
            
            // 移动控制按钮
            document.getElementById('leftBtn').addEventListener('touchstart', () => this.startMove('left'));
            document.getElementById('leftBtn').addEventListener('touchend', () => this.stopMove());
            document.getElementById('rightBtn').addEventListener('touchstart', () => this.startMove('right'));
            document.getElementById('rightBtn').addEventListener('touchend', () => this.stopMove());
            
            // 模态框按钮
            document.getElementById('modalActionBtn').addEventListener('click', () => this.handleModalAction());
            document.getElementById('shareBtn').addEventListener('click', () => this.shareScore());
            
            // 键盘控制
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
            document.addEventListener('keyup', (e) => this.handleKeyUp(e));
            
            // 触摸控制
            this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
            this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
            
            // 点击启用音频
            document.addEventListener('click', () => this.enableAudio());
            document.addEventListener('touchstart', () => this.enableAudio());
            
            // 防止页面滚动
            document.addEventListener('touchmove', (e) => {
                if (e.target.tagName !== 'CANVAS') {
                    e.preventDefault();
                }
            }, { passive: false });
        },
        
        // 初始化音频
        initAudio() {
            // 创建音频上下文
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.audioEnabled = false; // 需要用户交互后启用
                
                // 创建音效生成器
                this.createSoundGenerators();
            } catch (e) {
                console.warn('音频API不支持:', e);
            }
        },
        
        // 启用音频
        enableAudio() {
            if (this.audioEnabled || !this.audioContext) return;
            
            // 恢复音频上下文（iOS要求）
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            this.audioEnabled = true;
            document.getElementById('audioTip').style.display = 'none';
            
            // 播放测试音效
            this.playSound('collect');
        },
        
        // 创建音效生成器
        createSoundGenerators() {
            this.soundGenerators = {
                collect: () => this.generateBeep(800, 0.1, 'sine'),
                match: () => this.generateBeep(1200, 0.2, 'sine'),
                combo: () => this.generateBeep(1500, 0.3, 'sine'),
                levelup: () => this.generateBeep(2000, 0.5, 'square'),
                bomb: () => this.generateBeep(300, 0.4, 'sawtooth'),
                miss: () => this.generateBeep(200, 0.3, 'sine')
            };
        },
        
        // 生成哔声
        generateBeep(frequency, duration, type) {
            if (!this.audioEnabled || !this.audioContext) return;
            
            try {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(this.soundVolume, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
                
                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);
            } catch (e) {
                console.warn('音效播放失败:', e);
            }
        },
        
        // 播放音效
        playSound(type) {
            if (!this.audioEnabled) return;
            
            const generator = this.soundGenerators[type];
            if (generator) {
                generator();
            }
        },
        
        // 开始游戏
        startGame() {
            if (this.isRunning && !this.isPaused) return;
            
            this.isRunning = true;
            this.isPaused = false;
            
            // 重置游戏状态
            this.score = 0;
            this.level = 1;
            this.lives = 3;
            this.timeLeft = 60;
            this.combo = 0;
            this.maxCombo = 0;
            this.gameTime = 0;
            this.lastFruitTime = 0;
            
            this.fruits = [];
            this.collectedFruits = [];
            this.effects = [];
            
            // 更新UI
            this.updateUI();
            this.updateFruitSlots();
            
            // 隐藏模态框
            this.hideMessage();
            
            // 更新按钮文本
            document.getElementById('startBtn').innerHTML = 
                '<span class="btn-icon">▶</span><span class="btn-text">游戏中</span>';
            document.getElementById('pauseBtn').innerHTML = 
                '<span class="btn-icon">⏸</span><span class="btn-text">暂停</span>';
            
            // 开始游戏循环
            this.lastTime = performance.now();
            this.gameLoop();
            
            // 开始倒计时
            this.startTimer();
            
            // 播放开始音效
            this.playSound('levelup');
        },
        
        // 暂停/继续游戏
        togglePause() {
            if (!this.isRunning) return;
            
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                document.getElementById('pauseBtn').innerHTML = 
                    '<span class="btn-icon">▶</span><span class="btn-text">继续</span>';
                this.showMessage('游戏暂停', '点击"继续"按钮继续游戏');
                clearInterval(this.timer);
            } else {
                document.getElementById('pauseBtn').innerHTML = 
                    '<span class="btn-icon">⏸</span><span class="btn-text">暂停</span>';
                this.hideMessage();
                this.startTimer();
                this.lastTime = performance.now();
                this.gameLoop();
            }
        },
        
        // 重置游戏
        resetGame() {
            this.isRunning = false;
            this.isPaused = false;
            
            clearInterval(this.timer);
            
            this.score = 0;
            this.level = 1;
            this.lives = 3;
            this.timeLeft = 60;
            
            this.fruits = [];
            this.collectedFruits = [];
            this.effects = [];
            
            this.updateUI();
            this.updateFruitSlots();
            
            document.getElementById('comboDisplay').style.display = 'none';
            document.getElementById('startBtn').innerHTML = 
                '<span class="btn-icon">▶</span><span class="btn-text">开始游戏</span>';
            document.getElementById('pauseBtn').innerHTML = 
                '<span class="btn-icon">⏸</span><span class="btn-text">暂停</span>';
            
            this.draw();
            
            this.showMessage('游戏已重置', '点击"开始游戏"按钮开始新的冒险！');
        },
        
        // 开始倒计时
        startTimer() {
            clearInterval(this.timer);
            this.timer = setInterval(() => {
                if (!this.isPaused && this.isRunning) {
                    this.timeLeft--;
                    this.updateUI();
                    
                    if (this.timeLeft <= 0) {
                        this.gameOver();
                    }
                }
            }, 1000);
        },
        
        // 游戏主循环
        gameLoop() {
            if (!this.isRunning || this.isPaused) return;
            
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;
            
            this.gameTime += deltaTime;
            
            // 更新游戏状态
            this.update(deltaTime);
            
            // 绘制游戏
            this.draw();
            
            // 继续循环
            requestAnimationFrame(() => this.gameLoop());
        },
        
        // 更新游戏状态
        update(deltaTime) {
            // 生成水果
            this.generateFruits(deltaTime);
            
            // 更新水果位置
            this.updateFruits(deltaTime);
            
            // 更新特效
            this.updateEffects(deltaTime);
            
            // 更新移动
            this.updateMovement(deltaTime);
            
            // 检查匹配
            this.checkMatches();
        },
        
        // 生成水果
        generateFruits(deltaTime) {
            if (!this.isRunning || this.fruits.length >= this.config.maxFruits) return;
            
            this.lastFruitTime += deltaTime;
            
            if (this.lastFruitTime > this.config.fruitInterval) {
                this.lastFruitTime = 0;
                
                // 随机决定水果类型
                let fruitType;
                let isSpecial = false;
                
                // 5%几率生成特殊水果
                if (Math.random() < 0.05) {
                    const specialIndex = Math.floor(Math.random() * this.config.specialFruits.length);
                    fruitType = this.config.specialFruits[specialIndex];
                    isSpecial = true;
                } else {
                    const typeIndex = Math.floor(Math.random() * this.config.fruitTypes.length);
                    fruitType = this.config.fruitTypes[typeIndex];
                }
                
                const fruit = {
                    x: Math.random() * (this.canvas.width - 40) + 20,
                    y: -30,
                    radius: 20,
                    type: fruitType,
                    isSpecial: isSpecial,
                    color: this.config.fruitColors[fruitType] || '#FFFFFF',
                    speed: this.config.fruitSpeed + (this.level - 1) * 0.3,
                    rotation: 0,
                    rotationSpeed: (Math.random() - 0.5) * 0.1
                };
                
                this.fruits.push(fruit);
            }
        },
        
        // 更新水果位置
        updateFruits(deltaTime) {
            for (let i = this.fruits.length - 1; i >= 0; i--) {
                const fruit = this.fruits[i];
                
                // 更新位置
                fruit.y += fruit.speed;
                fruit.rotation += fruit.rotationSpeed;
                
                // 检查是否被篮子接住
                if (this.checkBasketCollision(fruit)) {
                    this.collectFruit(fruit);
                    this.fruits.splice(i, 1);
                    continue;
                }
                
                // 检查是否掉出屏幕
                if (fruit.y > this.canvas.height + 30) {
                    this.missFruit(fruit);
                    this.fruits.splice(i, 1);
                }
            }
        },
        
        // 更新特效
        updateEffects(deltaTime) {
            for (let i = this.effects.length - 1; i >= 0; i--) {
                const effect = this.effects[i];
                effect.lifetime -= deltaTime;
                
                if (effect.lifetime <= 0) {
                    this.effects.splice(i, 1);
                }
            }
        },
        
        // 更新移动
        updateMovement(deltaTime) {
            if (this.keys.left) {
                this.basket.x = Math.max(0, this.basket.x - this.basket.speed);
            }
            
            if (this.keys.right) {
                this.basket.x = Math.min(this.canvas.width - this.basket.width, 
                                       this.basket.x + this.basket.speed);
            }
        },
        
        // 开始移动
        startMove(direction) {
            this.keys[direction] = true;
        },
        
        // 停止移动
        stopMove() {
            this.keys.left = false;
            this.keys.right = false;
        },
        
        // 检查篮子碰撞
        checkBasketCollision(fruit) {
            return (
                fruit.y + fruit.radius > this.basket.y &&
                fruit.y - fruit.radius < this.basket.y + this.basket.height &&
                fruit.x > this.basket.x - fruit.radius &&
                fruit.x < this.basket.x + this.basket.width + fruit.radius
            );
        },
        
        // 收集水果
        collectFruit(fruit) {
            this.collectedFruits.push(fruit);
            
            // 限制收集的水果数量
            if (this.collectedFruits.length > 7) {
                this.collectedFruits.shift();
            }
            
            // 播放音效
            this.playSound('collect');
            
            // 添加收集特效
            this.addEffect({
                x: fruit.x,
                y: fruit.y,
                text: this.config.fruitIcons[fruit.type] || '⭐',
                color: fruit.color,
                lifetime: 1000
            });
            
            // 更新水果槽位
            this.updateFruitSlots();
            
            // 如果是特殊水果，立即触发效果
            if (fruit.isSpecial) {
                this.processSpecialFruit(fruit);
            }
        },
        
        // 处理特殊水果
        processSpecialFruit(fruit) {
            if (fruit.type === 'bomb') {
                // 炸弹水果：消除一行
                this.collectedFruits = [];
                this.updateFruitSlots();
                this.addEffect({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    text: '💥 炸弹爆炸！',
                    color: '#FF6B6B',
                    lifetime: 1500
                });
                this.playSound('bomb');
            } else if (fruit.type === 'rainbow') {
                // 彩虹水果：万能匹配
                if (this.collectedFruits.length >= 2) {
                    const lastFruit = this.collectedFruits[this.collectedFruits.length - 2];
                    if (lastFruit && !lastFruit.isSpecial) {
                        // 与上一个水果匹配
                        this.collectedFruits.splice(this.collectedFruits.length - 2, 2);
                        this.score += 100;
                        this.addEffect({
                            x: this.canvas.width / 2,
                            y: this.canvas.height / 2,
                            text: '🌈 彩虹匹配！',
                            color: '#8A2BE2',
                            lifetime: 1500
                        });
                        this.playSound('match');
                    }
                }
            }
        },
        
        // 错过水果
        missFruit(fruit) {
            this.lives--;
            this.updateUI();
            
            // 播放音效
            this.playSound('miss');
            
            // 添加错过特效
            this.addEffect({
                x: fruit.x,
                y: fruit.y,
                text: '💔',
                color: '#FF6B6B',
                lifetime: 1000
            });
            
            // 检查游戏是否结束
            if (this.lives <= 0) {
                this.gameOver();
            }
        },
        
        // 检查匹配
        checkMatches() {
            if (this.collectedFruits.length < 3) {
                this.combo = 0;
                document.getElementById('comboDisplay').style.display = 'none';
                return;
            }
            
            // 检查最后三个水果是否匹配
            const length = this.collectedFruits.length;
            const fruit1 = this.collectedFruits[length - 1];
            const fruit2 = this.collectedFruits[length - 2];
            const fruit3 = this.collectedFruits[length - 3];
            
            // 排除特殊水果
            if (fruit1.isSpecial || fruit2.isSpecial || fruit3.isSpecial) {
                return;
            }
            
            if (fruit1.type === fruit2.type && fruit2.type === fruit3.type) {
                // 匹配成功！
                this.collectedFruits.splice(length - 3, 3);
                this.updateFruitSlots();
                
                // 计算得分
                const basePoints = this.config.fruitPoints[fruit1.type] || 10;
                const comboBonus = this.combo * 5;
                const levelBonus = this.level * 3;
                const points = basePoints + comboBonus + levelBonus;
                
                this.score += points;
                
                // 增加连击
                this.combo++;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                
                // 显示连击
                document.getElementById('comboCount').textContent = this.combo;
                document.getElementById('comboDisplay').style.display = 'block';
                
                // 播放音效
                if (this.combo > 1) {
                    this.playSound('combo');
                } else {
                    this.playSound('match');
                }
                
                // 添加匹配特效
                this.addEffect({
                    x: this.canvas.width / 2,
                    y: this.canvas.height / 2,
                    text: `匹配！+${points}`,
                    color: '#FFD700',
                    lifetime: 1500
                });
                
                // 检查成就
                this.checkAchievements();
                
                // 检查升级
                if (this.score >= this.level * this.config.levelUpScore) {
                    this.levelUp();
                }
                
                this.updateUI();
            } else {
                this.combo = 0;
                document.getElementById('comboDisplay').style.display = 'none';
            }
        },
        
        // 检查成就
        checkAchievements() {
            if (this.combo >= 5 && !this.achievements.includes('combo5')) {
                this.unlockAchievement('达成5连击！');
                this.achievements.push('combo5');
            }
            
            if (this.score >= 1000 && !this.achievements.includes('score1000')) {
                this.unlockAchievement('得分超过1000！');
                this.achievements.push('score1000');
            }
            
            if (this.level >= 5 && !this.achievements.includes('level5')) {
                this.unlockAchievement('达到5级！');
                this.achievements.push('level5');
            }
        },
        
        // 解锁成就
        unlockAchievement(text) {
            document.getElementById('achievementText').textContent = text;
            document.getElementById('achievementPopup').style.display = 'flex';
            
            setTimeout(() => {
                document.getElementById('achievementPopup').style.display = 'none';
            }, 3000);
            
            this.playSound('levelup');
        },
        
        // 升级
        levelUp() {
            this.level++;
            
            // 恢复一点生命
            if (this.lives < 3) {
                this.lives++;
            }
            
            this.addEffect({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                text: `🎉 等级 ${this.level}！`,
                color: '#FFD700',
                lifetime: 2000
            });
            
            this.playSound('levelup');
            this.updateUI();
        },
        
        // 游戏结束
        gameOver() {
            this.isRunning = false;
            clearInterval(this.timer);
            
            // 显示游戏结束模态框
            document.getElementById('modalTitle').textContent = '游戏结束';
            document.getElementById('modalText').textContent = '再接再厉！';
            document.getElementById('finalScore').textContent = this.score;
            document.getElementById('finalLevel').textContent = this.level;
            document.getElementById('finalCombo').textContent = this.maxCombo;
            document.getElementById('gameOverStats').style.display = 'block';
            document.getElementById('shareBtn').style.display = 'inline-flex';
            document.getElementById('modalActionBtn').textContent = '重新开始';
            
            this.showMessage();
        },
        
        // 添加特效
        addEffect(effect) {
            this.effects.push(effect);
        },
        
        // 绘制游戏
        draw() {
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制背景
            this.drawBackground();
            
            // 绘制水果
            this.drawFruits();
            
            // 绘制篮子
            this.drawBasket();
            
            // 绘制特效
            this.drawEffects();
            
            // 绘制UI
            this.drawGameUI();
        },
        
        // 绘制背景
        drawBackground() {
            // 渐变背景
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 网格线
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            this.ctx.lineWidth = 1;
            
            // 垂直线
            for (let x = 0; x <= this.canvas.width; x += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            
            // 水平线
            for (let y = 0; y <= this.canvas.height; y += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
        },
        
        // 绘制水果
        drawFruits() {
            for (const fruit of this.fruits) {
                this.drawFruit(fruit);
            }
        },
        
        // 绘制单个水果
        drawFruit(fruit) {
            this.ctx.save();
            
            // 移动到水果位置
            this.ctx.translate(fruit.x, fruit.y);
            
            // 旋转
            this.ctx.rotate(fruit.rotation);
            
            // 绘制水果主体
            this.ctx.fillStyle = fruit.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, fruit.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制水果高光
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(-fruit.radius * 0.3, -fruit.radius * 0.3, 
                       fruit.radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制水果图标
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            let icon = this.config.fruitIcons[fruit.type] || '❓';
            if (fruit.isSpecial) {
                if (fruit.type === 'bomb') icon = '💣';
                if (fruit.type === 'rainbow') icon = '🌈';
            }
            
            this.ctx.fillText(icon, 0, 0);
            
            // 如果是特殊水果，添加光效
            if (fruit.isSpecial) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, fruit.radius + 3, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        },
        
        // 绘制篮子
        drawBasket() {
            this.ctx.fillStyle = this.basket.color;
            
            // 篮子主体
            this.ctx.beginPath();
            this.ctx.roundRect(this.basket.x, this.basket.y, 
                             this.basket.width, this.basket.height, 10);
            this.ctx.fill();
            
            // 篮子内部
            this.ctx.fillStyle = '#FFA500';
            this.ctx.beginPath();
            this.ctx.roundRect(this.basket.x + 5, this.basket.y, 
                             this.basket.width - 10, this.basket.height, 5);
            this.ctx.fill();
            
            // 篮子手柄
            this.ctx.fillStyle = '#8B4513';
            this.ctx.beginPath();
            this.ctx.roundRect(this.basket.x + 20, this.basket.y - 10, 
                             this.basket.width - 40, 10, 5);
            this.ctx.fill();
        },
        
        // 绘制特效
        drawEffects() {
            for (const effect of this.effects) {
                this.ctx.save();
                this.ctx.globalAlpha = Math.min(1, effect.lifetime / 500);
                
                this.ctx.fillStyle = effect.color || '#FFFFFF';
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                this.ctx.fillText(effect.text, effect.x, effect.y);
                
                this.ctx.restore();
            }
        },
        
        // 绘制游戏UI
        drawGameUI() {
            // 绘制生命值
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = i < this.lives ? '#FF6B6B' : 'rgba(255, 107, 107, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(30 + i * 30, 30, 8, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // 绘制等级
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`等级 ${this.level}`, this.canvas.width - 20, 30);
        },
        
        // 更新UI
        updateUI() {
            document.getElementById('score').textContent = this.score;
            document.getElementById('level').textContent = this.level;
            document.getElementById('lives').textContent = this.lives;
            document.getElementById('time').textContent = this.timeLeft;
        },
        
        // 更新部署信息
        updateDeployInfo() {
            const info = document.getElementById('deployInfo');
            const version = document.getElementById('versionInfo');
            
            const deployTime = new Date().toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            info.textContent = `Fly.io 部署版 | 版本 2.0.0 | ${deployTime}`;
            version.textContent = `游戏ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        },
        
        // 显示消息
        showMessage(title, text) {
            if (title) document.getElementById('modalTitle').textContent = title;
            if (text) document.getElementById('modalText').textContent = text;
            
            document.getElementById('gameOverStats').style.display = 'none';
            document.getElementById('shareBtn').style.display = 'none';
            document.getElementById('modalActionBtn').textContent = '确定';
            
            document.getElementById('gameModal').style.display = 'flex';
        },
        
        // 隐藏消息
        hideMessage() {
            document.getElementById('gameModal').style.display = 'none';
        },
        
        // 处理模态框动作
        handleModalAction() {
            if (this.isRunning) {
                this.hideMessage();
            } else {
                this.resetGame();
                this.hideMessage();
            }
        },
        
        // 分享成绩
        shareScore() {
            const shareText = `我在水果接龙游戏中获得了${this.score}分！达到${this.level}级，最高连击${this.maxCombo}！`;
            const shareUrl = window.location.href;
            
            if (isWechat) {
                // 微信中提示用户使用内置分享
                alert('请点击右上角"..."分享到微信好友或朋友圈');
            } else if (navigator.share) {
                // 使用Web Share API
                navigator.share({
                    title: '水果接龙游戏成绩',
                    text: shareText,
                    url: shareUrl
                });
            } else {
                // 复制到剪贴板
                const text = `${shareText} 游戏地址：${shareUrl}`;
                navigator.clipboard.writeText(text).then(() => {
                    alert('分享内容已复制到剪贴板！');
                });
            }
        },
        
        // 键盘按下
        handleKeyDown(e) {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.keys.right = true;
                    break;
                case ' ':
                    if (this.isRunning) {
                        this.togglePause();
                    } else {
                        this.startGame();
                    }
                    break;
                case 'Escape':
                    if (this.isRunning) {
                        this.togglePause();
                    }
                    break;
            }
        },
        
        // 键盘抬起
        handleKeyUp(e) {
            switch(e.key) {
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.keys.right = false;
                    break;
            }
        },
        
        // 触摸开始
        handleTouchStart(e) {
            e.preventDefault();
            if (!e.touches.length) return;
            
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            
            // 记录触摸起始时间
            this.touchStartTime = Date.now();
        },
        
        // 触摸移动
        handleTouchMove(e) {
            e.preventDefault();
            if (!e.touches.length || !this.touchStartX) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.touchStartX;
            
            // 移动篮子
            this.basket.x = Math.max(0, 
                Math.min(this.canvas.width - this.basket.width, 
                        this.basket.x + deltaX * 0.5));
            
            this.touchStartX = touch.clientX;
        },
        
        // 添加圆角矩形支持
        addRoundRectSupport() {
            if (!CanvasRenderingContext2D.prototype.roundRect) {
                CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
                    if (w < 2 * r) r = w / 2;
                    if (h < 2 * r) r = h / 2;
                    this.beginPath();
                    this.moveTo(x + r, y);
                    this.arcTo(x + w, y, x + w, y + h, r);
                    this.arcTo(x + w, y + h, x, y + h, r);
                    this.arcTo(x, y + h, x, y, r);
                    this.arcTo(x, y, x + w, y, r);
                    this.closePath();
                    return this;
                };
            }
        }
    };
    
    // 初始化游戏
    window.addEventListener('DOMContentLoaded', () => {
        // 初始化游戏
        FruitGame.init();
        
        // 在微信中禁用缩放
        if (isWechat) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        }
        
        // 防止双击缩放
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // 微信音频自动播放解决方案
        if (isWechat && typeof WeixinJSBridge !== 'undefined') {
            document.addEventListener('WeixinJSBridgeReady', function() {
                FruitGame.enableAudio();
            }, false);
        }
    });
    
    // 导出到全局
    window.FruitGame = FruitGame;
})();
